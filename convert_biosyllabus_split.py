#!/usr/bin/env python3
"""Convert a Google Docs-style Biology syllabus HTML export into Markdown.

Output structure:
  src/data/notes/chapter-01-<slug>/section-1.1-<slug>.md

Core and Supplement text:
  :core[Core content]
  :supplement[Supplement content]

Images:
  /images/notes/<filename>

Requires:
  python -m pip install beautifulsoup4 markdownify
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path
from typing import Optional

from bs4 import BeautifulSoup, Tag
from markdownify import MarkdownConverter


CHAPTER_RE = re.compile(r"^\s*(\d{1,2})\s+(.+?)\s*$")
SECTION_RE = re.compile(r"^\s*(\d{1,2})\.(\d{1,2})\s+(.+?)\s*$")

CORE_COLOR = "#38761d"
SUPPLEMENT_COLOR = "#990000"

CORE_CLASSES = {"c2", "c15"}
SUPPLEMENT_CLASSES = {"c6", "c13"}
BOLD_CLASSES = {"c13", "c20"}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def slugify(value: str) -> str:
    value = re.sub(
        r"[^\w\s-]",
        "",
        value.lower().strip(),
        flags=re.UNICODE,
    )
    return re.sub(r"[\s_-]+", "-", value).strip("-") or "untitled"


def heading_kind(text: str):
    text = clean_text(text)

    match = SECTION_RE.match(text)
    if match:
        return (
            "section",
            int(match.group(1)),
            int(match.group(2)),
            match.group(3),
        )

    match = CHAPTER_RE.match(text)
    if match:
        return ("chapter", int(match.group(1)), None, match.group(2))

    return None


def escape_directive_text(text: str) -> str:
    """Escape directive delimiters without escaping Markdown syntax."""
    return (
        text.replace("\\", "\\\\")
        .replace("[", r"\[")
        .replace("]", r"\]")
    )


def normalize_color(value: str) -> str:
    """Normalize CSS colors such as rgb(56, 121, 29) to hexadecimal."""
    value = (value or "").strip().lower()

    if value in {"", "inherit", "initial", "unset", "currentcolor"}:
        return ""

    rgb_match = re.fullmatch(
        r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)"
        r"(?:\s*,\s*[\d.]+)?\s*\)",
        value,
    )

    if rgb_match:
        red, green, blue = map(int, rgb_match.groups())
        return f"#{red:02x}{green:02x}{blue:02x}"

    short_hex = re.fullmatch(r"#([0-9a-f])([0-9a-f])([0-9a-f])", value)

    if short_hex:
        red, green, blue = short_hex.groups()
        return f"#{red * 2}{green * 2}{blue * 2}"

    return value


def extract_class_styles(
    soup: BeautifulSoup,
) -> dict[str, dict[str, str]]:
    """Extract CSS declarations associated with simple class selectors."""
    styles: dict[str, dict[str, str]] = {}

    for style_tag in soup.find_all("style"):
        css = style_tag.get_text()

        for match in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
            selectors, declarations = match.groups()
            properties: dict[str, str] = {}

            for declaration in declarations.split(";"):
                if ":" not in declaration:
                    continue

                property_name, value = declaration.split(":", 1)
                properties[property_name.strip().lower()] = value.strip()

            for selector in selectors.split(","):
                selector = selector.strip()
                class_match = re.fullmatch(
                    r"\.([a-zA-Z0-9_-]+)",
                    selector,
                )

                if not class_match:
                    continue

                class_name = class_match.group(1)
                styles.setdefault(class_name, {}).update(properties)

    return styles


def get_classes(element: Tag) -> set[str]:
    return set(element.get("class", []))


def get_inline_style(element: Tag) -> dict[str, str]:
    result: dict[str, str] = {}

    for declaration in element.get("style", "").split(";"):
        if ":" not in declaration:
            continue

        property_name, value = declaration.split(":", 1)
        result[property_name.strip().lower()] = value.strip()

    return result


def element_color(
    element: Tag,
    class_styles: dict[str, dict[str, str]],
) -> str:
    """Return an explicitly declared Core or Supplement color."""
    inline_color = normalize_color(
        get_inline_style(element).get("color", "")
    )

    if inline_color == CORE_COLOR:
        return "core"

    if inline_color == SUPPLEMENT_COLOR:
        return "supplement"

    for class_name in get_classes(element):
        color = normalize_color(
            class_styles.get(class_name, {}).get("color", "")
        )

        if color == CORE_COLOR:
            return "core"

        if color == SUPPLEMENT_COLOR:
            return "supplement"

    # Retain the known Google Docs class mappings as a fallback.
    classes = get_classes(element)

    if classes & CORE_CLASSES:
        return "core"

    if classes & SUPPLEMENT_CLASSES:
        return "supplement"

    return ""


def element_is_bold(
    element: Tag,
    class_styles: dict[str, dict[str, str]],
) -> bool:
    """Determine whether an element declares bold text."""
    inline_weight = get_inline_style(element).get(
        "font-weight",
        "",
    ).lower()

    if inline_weight in {
        "bold", "bolder", "600", "700", "800", "900"
    }:
        return True

    for class_name in get_classes(element):
        weight = (
            class_styles.get(class_name, {})
            .get("font-weight", "")
            .lower()
        )

        if weight in {
            "bold", "bolder", "600", "700", "800", "900"
        }:
            return True

    return bool(get_classes(element) & BOLD_CLASSES)


def descendants_with_style(element: Tag):
    """Yield an element and its descendants that may carry text styling."""
    yield element

    yield from element.find_all(
        ["span", "p", "strong", "b", "em", "i"]
    )


def get_descendant_style_classes(
    element: Tag,
    class_styles: dict[str, dict[str, str]],
) -> set[str]:
    """Collect semantic colors used by an element and its descendants."""
    classes: set[str] = set()

    for descendant in descendants_with_style(element):
        color = element_color(descendant, class_styles)

        if color == "core":
            classes.add("__semantic_core__")
        elif color == "supplement":
            classes.add("__semantic_supplement__")

    return classes


class SyllabusMarkdownConverter(MarkdownConverter):
    def __init__(
        self,
        class_styles: dict[str, dict[str, str]],
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.class_styles = class_styles

    def convert_span(self, el: Tag, text: str, **kwargs) -> str:
        """Preserve color and bold together.

        Correct:
            :supplement[**water molecules**]

        Incorrect:
            **:supplement[water molecules]**
        """
        if not text:
            return text

        semantic_color = element_color(el, self.class_styles)
        bold = element_is_bold(el, self.class_styles)

        # Apply bold first so the Markdown emphasis remains inside
        # the Core/Supplement directive.
        formatted = text

        if bold and text.strip():
            formatted = f"**{text.strip()}**"

        if semantic_color:
            return (
                f":{semantic_color}"
                f"[{escape_directive_text(formatted)}]"
            )

        return formatted

    def convert_strong(self, el: Tag, text: str, **kwargs) -> str:
        return f"**{text}**" if text.strip() else text

    def convert_b(self, el: Tag, text: str, **kwargs) -> str:
        return f"**{text}**" if text.strip() else text

    def convert_em(self, el: Tag, text: str, **kwargs) -> str:
        return f"*{text}*" if text.strip() else text

    def convert_i(self, el: Tag, text: str, **kwargs) -> str:
        return f"*{text}*" if text.strip() else text

    def convert_li(self, el: Tag, text: str, **kwargs) -> str:
        """Preserve uniform Core/Supplement coloring across list items."""
        descendants = list(descendants_with_style(el))

        colors = {
            element_color(node, self.class_styles)
            for node in descendants
        }
        colors.discard("")

        own_color = element_color(el, self.class_styles)

        has_existing_directive = (
            ":core[" in text or ":supplement[" in text
        )

        # If all explicitly styled descendants use the same color,
        # color the entire item unless it already contains directives.
        if not has_existing_directive:
            inferred_color = own_color

            if not inferred_color and len(colors) == 1:
                inferred_color = next(iter(colors))

            if inferred_color:
                # Do not escape Markdown syntax here. Bold, links and
                # emphasis must remain active inside the directive.
                text = (
                    f":{inferred_color}[{text.strip()}]"
                )

        return super().convert_li(el, text, **kwargs)

    def convert_table(self, el: Tag, text: str, **kwargs) -> str:
        """Convert HTML tables into GitHub Flavored Markdown tables."""
        rows: list[list[str]] = []

        for tr in el.find_all("tr"):
            cells = tr.find_all(["th", "td"], recursive=False)

            if not cells:
                continue

            rendered_cells: list[str] = []

            for cell in cells:
                pieces: list[str] = []

                for child in cell.contents:
                    if isinstance(child, str):
                        pieces.append(child)
                    elif isinstance(child, Tag):
                        pieces.append(self.convert(str(child)))

                value = "".join(pieces)
                value = value.replace("\r", " ").replace("\n", " ")
                value = re.sub(r"\s+", " ", value).strip()
                value = value.replace("|", r"\|")
                value = re.sub(
                    r"<br\s*/?>",
                    "<br>",
                    value,
                    flags=re.I,
                )

                rendered_cells.append(value)

            rows.append(rendered_cells)

        if not rows:
            return ""

        column_count = max(len(row) for row in rows)

        normalized = [
            row + [""] * (column_count - len(row))
            for row in rows
        ]

        def row_to_markdown(row: list[str]) -> str:
            return "| " + " | ".join(row) + " |"

        header = normalized[0]
        separator = "| " + " | ".join(["---"] * column_count) + " |"

        output = [
            row_to_markdown(header),
            separator,
        ]

        output.extend(
            row_to_markdown(row)
            for row in normalized[1:]
        )

        return "\n\n" + "\n".join(output) + "\n\n"

    def convert_img(self, el: Tag, text: str, **kwargs) -> str:
        src = (el.get("src") or "").strip()

        if not src:
            return ""

        filename = Path(src.replace("\\", "/")).name
        alt = clean_text(el.get("alt") or "")

        return f"![{alt}](/images/notes/{filename})"


def convert_fragment(
    element: Tag,
    converter: SyllabusMarkdownConverter,
) -> str:
    result = converter.convert(str(element)).replace("\xa0", " ")
    result = re.sub(r"\n{3,}", "\n\n", result)

    return result.strip()


def is_heading_paragraph(
    element: Tag,
    class_styles: dict[str, dict[str, str]],
) -> bool:
    if element.name != "p" or "c7" not in element.get("class", []):
        return False

    return (
        heading_kind(
            clean_text(element.get_text(" ", strip=True))
        )
        is not None
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Convert syllabus HTML into chapter folders "
            "containing section Markdown files."
        )
    )

    parser.add_argument(
        "input_html",
        type=Path,
        help="Source HTML file",
    )

    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("src/data/notes"),
        help="Markdown output directory (default: src/data/notes)",
    )

    parser.add_argument(
        "--images-dir",
        type=Path,
        help="Optional original images/ directory to copy image assets from",
    )

    parser.add_argument(
        "--public-images-dir",
        type=Path,
        default=Path("public/images/notes"),
        help="Image destination (default: public/images/notes)",
    )

    parser.add_argument(
        "--clean",
        action="store_true",
        help="Delete existing chapter-* folders before generating",
    )

    args = parser.parse_args()

    if not args.input_html.is_file():
        print(
            f"Error: input file not found: {args.input_html}",
            file=sys.stderr,
        )
        return 2

    html = args.input_html.read_text(
        encoding="utf-8",
        errors="replace",
    )

    soup = BeautifulSoup(html, "html.parser")
    body = soup.body or soup

    class_styles = extract_class_styles(soup)

    blocks = [
        item
        for item in body.find_all(recursive=False)
        if isinstance(item, Tag)
        and item.name not in {"script", "style"}
    ]

    blocks = [
        item
        for item in blocks
        if clean_text(item.get_text(" ", strip=True)) or item.find("img")
    ]

    # Remove standalone Core/Supplement legend labels at the start.
    while (
        blocks
        and blocks[0].name == "p"
        and clean_text(blocks[0].get_text(" ", strip=True)).lower()
        in {"core", "supplement"}
    ):
        blocks.pop(0)

    if args.clean and args.output_dir.exists():
        for folder in args.output_dir.glob("chapter-*"):
            if folder.is_dir():
                shutil.rmtree(folder)

        preamble_file = args.output_dir / "preamble.md"

        if preamble_file.is_file():
            preamble_file.unlink()

    converter = SyllabusMarkdownConverter(
        class_styles=class_styles,
        heading_style="ATX",
        bullets="-",
        strip=["script", "style"],
    )

    chapters: dict[int, dict] = {}
    preamble: list[str] = []

    current_chapter: Optional[int] = None
    current_section: Optional[dict] = None

    def append_content(block: Tag) -> None:
        rendered = convert_fragment(block, converter)

        if not rendered:
            return

        if current_section is not None:
            current_section["parts"].append(rendered)
        elif current_chapter is not None:
            chapters[current_chapter]["intro_parts"].append(rendered)
        else:
            preamble.append(rendered)

    for block in blocks:
        if is_heading_paragraph(block, class_styles):
            parsed = heading_kind(
                clean_text(block.get_text(" ", strip=True))
            )

            if parsed is None:
                continue

            kind, chapter_no, section_no, title = parsed

            if kind == "chapter":
                current_chapter = chapter_no
                current_section = None

                chapters.setdefault(
                    chapter_no,
                    {
                        "title": title,
                        "intro_parts": [],
                        "sections": [],
                    },
                )

                chapters[chapter_no]["title"] = title

            else:
                current_chapter = chapter_no

                chapters.setdefault(
                    chapter_no,
                    {
                        "title": f"Chapter {chapter_no}",
                        "intro_parts": [],
                        "sections": [],
                    },
                )

                current_section = {
                    "number": f"{chapter_no}.{section_no}",
                    "title": title,
                    "parts": [],
                }

                chapters[chapter_no]["sections"].append(current_section)

            # The section title is already displayed in the React accordion.
            continue

        append_content(block)

    args.output_dir.mkdir(parents=True, exist_ok=True)

    section_count = 0

    for number, chapter in sorted(chapters.items()):
        folder = args.output_dir / (
            f"chapter-{number:02d}-{slugify(chapter['title'])}"
        )

        folder.mkdir(parents=True, exist_ok=True)

        intro = "\n\n".join(chapter["intro_parts"]).strip()
        sections = chapter["sections"]

        # Preserve introductory material without creating chapter.md.
        if intro and sections:
            sections[0]["parts"].insert(0, intro)
        elif intro and not sections:
            preamble.append(intro)

        for section in sections:
            filename = (
                f"section-{section['number']}-"
                f"{slugify(section['title'])}.md"
            )

            body_md = "\n\n".join(section["parts"]).strip()

            (folder / filename).write_text(
                body_md + "\n" if body_md else "",
                encoding="utf-8",
            )

            section_count += 1

    if preamble:
        (args.output_dir / "preamble.md").write_text(
            "\n\n".join(preamble).strip() + "\n",
            encoding="utf-8",
        )

    image_srcs = sorted(
        {
            (img.get("src") or "").strip()
            for img in soup.find_all("img")
            if (img.get("src") or "").strip()
        }
    )

    copied = 0
    missing: list[str] = []

    if args.images_dir:
        args.public_images_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        for src in image_srcs:
            filename = Path(src.replace("\\", "/")).name
            source = args.images_dir / filename
            destination = args.public_images_dir / filename

            if source.is_file():
                if source.resolve() != destination.resolve():
                    shutil.copy2(source, destination)

                copied += 1
            else:
                missing.append(filename)

    print(
        f"Created {len(chapters)} chapter folder(s), "
        f"{section_count} section file(s)."
    )

    print(f"Markdown output: {args.output_dir.resolve()}")

    print(
        f"Found {len(image_srcs)} unique image reference(s); "
        "paths use /images/notes/<filename>."
    )

    print(
        "Core/Supplement text uses :core[...] and :supplement[...] directives."
    )
    print("Section headings are omitted from Markdown bodies.")
    print("No chapter.md files are generated.")

    if args.images_dir:
        print(
            f"Copied {copied} image(s) to "
            f"{args.public_images_dir.resolve()}."
        )

        if missing:
            print("Missing image files: " + ", ".join(missing))
    else:
        print(
            "No images copied. Put the original files in "
            f"{args.public_images_dir.resolve()}."
        )

    print(
        "Reminder: Notes.tsx must use remark-directive and map "
        "Core/Supplement directives to styled spans."
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())