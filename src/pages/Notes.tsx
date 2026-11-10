import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBookOpen,
    faChevronDown,
    faChevronRight,
    faChevronUp,
} from "@fortawesome/free-solid-svg-icons";

import "./Notes.css";

/* ===========================
   Types
=========================== */

interface NoteSection {
    id: string;
    title: string;
    markdownPath: string;
    content: string;
}

interface Chapter {
    id: number;
    title: string;
    sections: NoteSection[];
}

/* ===========================
   Markdown File Discovery
=========================== */

const markdownModules = import.meta.glob<string>(
    "../data/notes/**/*.md",
    {
        query: "?raw",
        import: "default",
        eager: true,
    },
);

const chapterFolderPattern = /\/chapter-(\d+)-([^/]+)\//i;

const sectionFilePattern =
    /\/section-(\d+(?:\.\d+)+)-([^/]+)\.md$/i;

/* ===========================
   Helpers
=========================== */

function titleFromSlug(slug: string): string {
    return slug
        .replace(/^\d+(?:\.\d+)*-?/, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .trim();
}

function sectionIdFromPath(path: string): string | undefined {
    return path.match(sectionFilePattern)?.[1];
}

function sectionTitleFromPath(
    path: string,
    markdown: string,
): string {
    const heading = markdown.match(/^#{1,6}\s+(.+)$/m)?.[1];

    if (heading) {
        return heading
            .replace(/[*_`]/g, "")
            .replace(/^\d+(?:\.\d+)+\s*/, "")
            .replace(/\s+#+\s*$/, "")
            .trim();
    }

    const slug = path.match(sectionFilePattern)?.[2];

    return slug ? titleFromSlug(slug) : "Untitled section";
}

function chapterTitleFromPath(path: string): string {
    const slug = path.match(chapterFolderPattern)?.[2] ?? "";
    return titleFromSlug(slug);
}

function compareSectionIds(a: string, b: string): number {
    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);

    for (
        let index = 0;
        index < Math.max(aParts.length, bParts.length);
        index += 1
    ) {
        const difference =
            (aParts[index] ?? 0) - (bParts[index] ?? 0);

        if (difference !== 0) {
            return difference;
        }
    }

    return 0;
}

/* ===========================
   Build Chapters Automatically
=========================== */

function buildChapters(
    files: Record<string, string>,
): Chapter[] {
    const chapterMap = new Map<number, Chapter>();

    for (const [path, content] of Object.entries(files)) {
        const folderMatch = path.match(chapterFolderPattern);

        if (!folderMatch) {
            continue;
        }

        const chapterId = Number(folderMatch[1]);

        if (!Number.isInteger(chapterId)) {
            continue;
        }

        let chapter = chapterMap.get(chapterId);

        if (!chapter) {
            chapter = {
                id: chapterId,
                title: chapterTitleFromPath(path),
                sections: [],
            };

            chapterMap.set(chapterId, chapter);
        }

        const sectionId = sectionIdFromPath(path);

        // Ignore chapter.md and any other non-section Markdown files.
        if (!sectionId) {
            continue;
        }

        chapter.sections.push({
            id: sectionId,
            title: sectionTitleFromPath(path, content),
            markdownPath: path,
            content,
        });
    }

    return [...chapterMap.values()]
        .map((chapter) => ({
            ...chapter,
            sections: chapter.sections.sort((a, b) =>
                compareSectionIds(a.id, b.id),
            ),
        }))
        .sort((a, b) => a.id - b.id);
}

/* ===========================
   URL Helpers
=========================== */

function getChapterIdFromUrl(
    searchParams: URLSearchParams,
    chapters: Chapter[],
): number {
    const rawChapterId = searchParams.get("chapter");

    if (rawChapterId === null || rawChapterId.trim() === "") {
        return chapters[0]?.id ?? 1;
    }

    const chapterId = Number(rawChapterId);

    return Number.isInteger(chapterId) &&
    chapters.some((chapter) => chapter.id === chapterId)
        ? chapterId
        : chapters[0]?.id ?? 1;
}

/* ===========================
   Core / Supplement Directives

   Markdown examples:

   :core[Core content.]

   :supplement[Supplement content.]

   The directive's children remain Markdown AST nodes. Mapping the
   directive to a span lets ReactMarkdown render nested strong, em,
   lists, and other supported elements inside that colored span.
=========================== */

function remarkSyllabusColors() {
    return (tree: any) => {
        visit(tree, (node: any) => {
            if (
                node.type !== "textDirective" &&
                node.type !== "leafDirective" &&
                node.type !== "containerDirective"
            ) {
                return;
            }

            if (
                node.name !== "core" &&
                node.name !== "supplement"
            ) {
                return;
            }

            node.data ??= {};

            node.data.hName = "span";
            node.data.hProperties = {
                className: [`notes-${node.name}`],
            };
        });
    };
}

/* ===========================
   Markdown Renderer
=========================== */

function MarkdownContent({
                             content,
                         }: {
    content: string;
}) {
    return (
        <ReactMarkdown
            remarkPlugins={[
                remarkGfm,
                remarkDirective,
                remarkSyllabusColors,
            ]}
            components={{
                span: ({ className, children, ...props }) => (
                    <span
                        className={[
                            "notes-markdown-span",
                            className,
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        {...props}
                    >
                        {children}
                    </span>
                ),

                table: ({ children, ...props }) => (
                    <div className="notes-table-wrapper">
                        <table {...props}>{children}</table>
                    </div>
                ),

                img: ({ src, alt, title, ...props }) => {
                    if (!src) {
                        return null;
                    }

                    return (
                        <figure className="notes-image-figure">
                            <img
                                {...props}
                                src={src}
                                alt={alt ?? ""}
                                loading="lazy"
                                decoding="async"
                            />

                            {title && (
                                <figcaption className="notes-image-caption">
                                    {title}
                                </figcaption>
                            )}
                        </figure>
                    );
                },

                a: ({ href, children, ...props }) => {
                    const isExternal =
                        typeof href === "string" &&
                        /^https?:\/\//i.test(href);

                    return (
                        <a
                            {...props}
                            href={href}
                            {...(
                                isExternal
                                    ? {
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                    }
                                    : {}
                            )}
                        >
                            {children}
                        </a>
                    );
                },
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

/* ===========================
   Notes Page
=========================== */

export default function Notes() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const chapters = useMemo(
        () => buildChapters(markdownModules),
        [],
    );

    const chapterIdFromUrl = getChapterIdFromUrl(
        searchParams,
        chapters,
    );

    const selectedChapter =
        chapters.find(
            (chapter) => chapter.id === chapterIdFromUrl,
        ) ?? chapters[0];

    const [expandedSections, setExpandedSections] =
        useState<Record<string, boolean>>({});

    useEffect(() => {
        const rawChapterId = searchParams.get("chapter");
        const normalizedId = String(chapterIdFromUrl);

        if (rawChapterId !== normalizedId) {
            const nextParams = new URLSearchParams(searchParams);

            nextParams.set("chapter", normalizedId);

            setSearchParams(nextParams, {
                replace: true,
            });
        }
    }, [
        chapterIdFromUrl,
        searchParams,
        setSearchParams,
    ]);

    function handleChapterSelect(chapterId: number) {
        if (
            !chapters.some(
                (chapter) => chapter.id === chapterId,
            )
        ) {
            return;
        }

        const nextParams = new URLSearchParams(searchParams);

        nextParams.set("chapter", String(chapterId));

        setSearchParams(nextParams);
    }

    function toggleSection(sectionId: string) {
        setExpandedSections((previous) => ({
            ...previous,
            [sectionId]: !previous[sectionId],
        }));
    }

    if (chapters.length === 0 || !selectedChapter) {
        return (
            <main className="notes-page">
                <section className="notes-main">
                    <div className="notes-empty-state">
                        <h2>No notes found</h2>

                        <p>
                            Add generated Markdown files to{" "}
                            <code>src/data/notes/</code>.
                            Expected paths look like{" "}
                            <code>
                                chapter-01-example/section-1.1-example.md
                            </code>.
                        </p>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main
            className={`notes-page ${
                sidebarCollapsed
                    ? "notes-page-collapsed"
                    : ""
            }`}
        >
            <aside
                className={`notes-sidebar ${
                    sidebarCollapsed
                        ? "notes-sidebar-is-collapsed"
                        : ""
                }`}
            >
                <div className="notes-sidebar-header">
                    {!sidebarCollapsed && (
                        <h2 className="notes-sidebar-title">
                            Chapters
                        </h2>
                    )}

                    <button
                        type="button"
                        className="notes-sidebar-collapse"
                        onClick={() =>
                            setSidebarCollapsed(
                                (previous) => !previous,
                            )
                        }
                        aria-label={
                            sidebarCollapsed
                                ? "Expand chapter sidebar"
                                : "Collapse chapter sidebar"
                        }
                        aria-expanded={!sidebarCollapsed}
                    >
                        <FontAwesomeIcon icon={faBookOpen} />
                    </button>
                </div>

                <nav
                    className="notes-chapter-list"
                    aria-label="Biology chapters"
                >
                    {chapters.map((chapter) => {
                        const active =
                            selectedChapter.id === chapter.id;

                        return (
                            <button
                                key={chapter.id}
                                type="button"
                                className={`notes-chapter-item ${
                                    active
                                        ? "notes-chapter-active"
                                        : ""
                                }`}
                                onClick={() =>
                                    handleChapterSelect(chapter.id)
                                }
                                aria-current={
                                    active ? "page" : undefined
                                }
                                aria-label={`Chapter ${chapter.id}: ${chapter.title}`}
                            >
                                <span className="notes-chapter-number">
                                    {String(chapter.id).padStart(2, "0")}
                                </span>

                                {!sidebarCollapsed && (
                                    <>
                                        <span className="notes-chapter-name">
                                            {chapter.title}
                                        </span>

                                        {active && (
                                            <FontAwesomeIcon
                                                icon={faChevronRight}
                                                className="notes-chapter-arrow"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <section className="notes-main">
                <div className="notes-top-row">
                    <div className="notes-breadcrumb">
                        <span className="notes-breadcrumb-muted">
                            Chapter {selectedChapter.id}
                        </span>

                        <FontAwesomeIcon
                            icon={faChevronRight}
                            className="notes-breadcrumb-chevron"
                            aria-hidden="true"
                        />

                        <span className="notes-breadcrumb-current">
                            {selectedChapter.title}
                        </span>
                    </div>

                    <div
                        className="notes-legend"
                        aria-label="Syllabus content legend"
                    >
                        <span className="notes-legend-item">
                            <span
                                className="notes-legend-dot notes-legend-core"
                                aria-hidden="true"
                            />
                            <span>Core</span>
                        </span>

                        <span className="notes-legend-item">
                            <span
                                className="notes-legend-dot notes-legend-supplement"
                                aria-hidden="true"
                            />
                            <span>Supplement</span>
                        </span>
                    </div>
                </div>

                <div className="notes-sections">
                    {selectedChapter.sections.map((section) => {
                        const isExpanded = Boolean(
                            expandedSections[section.id],
                        );

                        return (
                            <article
                                key={section.id}
                                className={`notes-section-card ${
                                    isExpanded
                                        ? "notes-section-expanded"
                                        : ""
                                }`}
                            >
                                <button
                                    type="button"
                                    className="notes-section-header"
                                    onClick={() =>
                                        toggleSection(section.id)
                                    }
                                    aria-expanded={isExpanded}
                                >
                                    <span className="notes-section-number">
                                        {section.id}
                                    </span>

                                    <span className="notes-section-title">
                                        {section.title}
                                    </span>

                                    <span className="notes-section-toggle">
                                        <FontAwesomeIcon
                                            icon={
                                                isExpanded
                                                    ? faChevronUp
                                                    : faChevronDown
                                            }
                                        />
                                    </span>
                                </button>

                                {isExpanded && (
                                    <div className="notes-section-body">
                                        <div className="notes-markdown">
                                            <MarkdownContent
                                                content={section.content}
                                            />
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}