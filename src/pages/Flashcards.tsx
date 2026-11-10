import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBookOpen,
    faChevronDown,
    faChevronLeft,
    faChevronRight,
    faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import ReactMarkdown from "react-markdown";

import "./Flashcards.css";

type Chapter = {
    id: number;
    title: string;
};

type Flashcard = {
    id: string;
    question: string;
    answer: string;
    sectionId: string;
};

type FlashcardSection = {
    chapterId: number;
    sectionId: string;
    title: string;
    cards: Flashcard[];
};

const FULL_CHAPTER = "full";

const chapters: Chapter[] = [
    { id: 1, title: "Characteristics and classifications of living organisms" },
    { id: 2, title: "Organisation of the organism" },
    { id: 3, title: "Movement into and out of cells" },
    { id: 4, title: "Biological molecules" },
    { id: 5, title: "Enzymes" },
    { id: 6, title: "Plant nutrition" },
    { id: 7, title: "Human nutrition" },
    { id: 8, title: "Transport in plants" },
    { id: 9, title: "Transport in animals" },
    { id: 10, title: "Diseases and immunity" },
    { id: 11, title: "Gas exchange in humans" },
    { id: 12, title: "Respiration" },
    { id: 13, title: "Excretion in humans" },
    { id: 14, title: "Coordination and response" },
    { id: 15, title: "Drugs" },
    { id: 16, title: "Reproduction" },
    { id: 17, title: "Inheritance" },
    { id: 18, title: "Variation and selection" },
    { id: 19, title: "Organisms and their environment" },
    { id: 20, title: "Human influences on ecosystems" },
    { id: 21, title: "Biotechnology and genetic modification" },
];

const markdownFiles = import.meta.glob<string>("../data/cards/**/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
});

function parseMarkdownSection(
    filePath: string,
    content: string
): FlashcardSection | null {
    const chapterMatch = filePath.match(/chapter-(\d+)\/([^/]+)\.md$/);

    if (!chapterMatch) {
        return null;
    }

    const chapterId = Number(chapterMatch[1]);
    const fileSectionId = chapterMatch[2];

    const frontmatterMatch = content.match(
        /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/
    );

    if (!frontmatterMatch) {
        console.warn(`Flashcards: Missing frontmatter in "${filePath}".`);
        return null;
    }

    const frontmatter = frontmatterMatch[1];
    const markdownBody = content.slice(frontmatterMatch[0].length);

    const sectionMatch = frontmatter.match(
        /^section:\s*["']?([^"'\r\n]+)["']?\s*$/m
    );

    const titleMatch = frontmatter.match(
        /^title:\s*["']?(.+?)["']?\s*$/m
    );

    const sectionId = sectionMatch?.[1].trim() || fileSectionId;
    const title = titleMatch?.[1].trim() || `Section ${sectionId}`;

    const cardBlocks = markdownBody
        .split(/<!--\s*card\s*-->/i)
        .map((block) => block.trim())
        .filter(Boolean);

    const cards: Flashcard[] = cardBlocks.flatMap((block, index) => {
        const answerSeparator = block.match(/<!--\s*answer\s*-->/i);

        if (!answerSeparator || answerSeparator.index === undefined) {
            console.warn(
                `Flashcards: Card ${index + 1} in "${filePath}" is missing its answer separator.`
            );
            return [];
        }

        const question = block.slice(0, answerSeparator.index).trim();

        const answer = block
            .slice(answerSeparator.index + answerSeparator[0].length)
            .trim();

        if (!question || !answer) {
            console.warn(
                `Flashcards: Card ${index + 1} in "${filePath}" has an empty question or answer.`
            );
            return [];
        }

        return [
            {
                id: `${chapterId}-${sectionId}-${index + 1}`,
                question,
                answer,
                sectionId,
            },
        ];
    });

    return { chapterId, sectionId, title, cards };
}

const sections: FlashcardSection[] = Object.entries(markdownFiles)
    .map(([filePath, content]) => parseMarkdownSection(filePath, content))
    .filter(
        (section): section is FlashcardSection => section !== null
    )
    .sort((a, b) => {
        if (a.chapterId !== b.chapterId) {
            return a.chapterId - b.chapterId;
        }

        return a.sectionId.localeCompare(b.sectionId, undefined, {
            numeric: true,
        });
    });

export default function Flashcards() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const routeChapterId = Number(id);

    const selectedChapterId = chapters.some(
        (chapter) => chapter.id === routeChapterId
    )
        ? routeChapterId
        : 1;

    const selectedChapter = chapters.find(
        (chapter) => chapter.id === selectedChapterId
    );

    const chapterSections = useMemo(
        () =>
            sections.filter(
                (section) => section.chapterId === selectedChapterId
            ),
        [selectedChapterId]
    );

    const requestedSectionId = searchParams.get("section") || "";

    const selectedSectionId = requestedSectionId
        ? chapterSections.some(
            (section) => section.sectionId === requestedSectionId
        )
            ? requestedSectionId
            : FULL_CHAPTER
        : FULL_CHAPTER;

    const cards = useMemo(() => {
        if (selectedSectionId === FULL_CHAPTER) {
            return chapterSections.flatMap((section) => section.cards);
        }

        return (
            chapterSections.find(
                (section) => section.sectionId === selectedSectionId
            )?.cards ?? []
        );
    }, [chapterSections, selectedSectionId]);

    const totalCards = cards.length;

    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isAnswerVisible, setIsAnswerVisible] = useState(false);

    function handleChapterChange(chapterId: number) {
        setCurrentCardIndex(0);
        setIsAnswerVisible(false);

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("section");

        const query = nextParams.toString();

        navigate(
            `/subject/${chapterId}/flashcards${query ? `?${query}` : ""}`
        );
    }

    function handleSectionChange(sectionId: string) {
        setCurrentCardIndex(0);
        setIsAnswerVisible(false);

        const nextParams = new URLSearchParams(searchParams);

        if (sectionId === FULL_CHAPTER) {
            nextParams.delete("section");
        } else {
            nextParams.set("section", sectionId);
        }

        setSearchParams(nextParams);
    }

    function handlePreviousCard() {
        if (currentCardIndex > 0) {
            setCurrentCardIndex((index) => index - 1);
            setIsAnswerVisible(false);
        }
    }

    function handleNextCard() {
        if (currentCardIndex < totalCards - 1) {
            setCurrentCardIndex((index) => index + 1);
            setIsAnswerVisible(false);
        }
    }

    function handleFlipCard() {
        if (cards[currentCardIndex]) {
            setIsAnswerVisible((visible) => !visible);
        }
    }

    function handleRestartSection() {
        setCurrentCardIndex(0);
        setIsAnswerVisible(false);
    }

    const currentCard = cards[currentCardIndex];

    const progress = totalCards
        ? ((currentCardIndex + 1) / totalCards) * 100
        : 0;

    return (
        <main className="flashcards-page">
            <header className="flashcards-header">
                <div className="flashcards-header-copy">
                    <p className="flashcards-eyebrow">STUDY &amp; REVISE</p>
                    <h1>Flashcards</h1>
                    <span className="flashcards-title-underline" />
                    <p className="flashcards-description">
                        Review key concepts, one card at a time.
                    </p>
                </div>
            </header>

            <section
                className="flashcards-workspace"
                aria-label="Flashcard study area"
            >
                <div className="flashcards-toolbar">
                    <label className="flashcards-select-wrapper">
                        <FontAwesomeIcon
                            icon={faBookOpen}
                            className="flashcards-select-icon"
                            aria-hidden="true"
                        />
                        <span className="sr-only">Select chapter</span>

                        <select
                            value={selectedChapterId}
                            onChange={(event) =>
                                handleChapterChange(Number(event.target.value))
                            }
                        >
                            {chapters.map((chapter) => (
                                <option key={chapter.id} value={chapter.id}>
                                    Chapter {chapter.id}
                                </option>
                            ))}
                        </select>

                        <FontAwesomeIcon
                            icon={faChevronDown}
                            className="flashcards-select-chevron"
                            aria-hidden="true"
                        />
                    </label>

                    <span className="flashcards-toolbar-divider" />

                    <label className="flashcards-select-wrapper flashcards-section-select">
                        <span className="sr-only">Select section</span>

                        <select
                            value={selectedSectionId}
                            onChange={(event) =>
                                handleSectionChange(event.target.value)
                            }
                            disabled={chapterSections.length === 0}
                        >
                            <option value={FULL_CHAPTER}>Full Chapter</option>

                            {chapterSections.map((section) => (
                                <option
                                    key={section.sectionId}
                                    value={section.sectionId}
                                >
                                    {section.sectionId} {section.title}
                                </option>
                            ))}
                        </select>

                        <FontAwesomeIcon
                            icon={faChevronDown}
                            className="flashcards-select-chevron"
                            aria-hidden="true"
                        />
                    </label>

                    <div className="flashcards-card-count">
                        <span>
                            {totalCards} {totalCards === 1 ? "card" : "cards"}
                        </span>
                    </div>
                </div>

                <section className="flashcards-study-panel">
                    {currentCard ? (
                        <>
                            <div className="flashcards-card-stage">
                                <button
                                    type="button"
                                    className="flashcards-nav-button flashcards-nav-previous"
                                    onClick={handlePreviousCard}
                                    disabled={currentCardIndex === 0}
                                    aria-label="Previous flashcard"
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} />
                                </button>

                                <button
                                    type="button"
                                    className={`flashcard${isAnswerVisible ? " flashcard-answer-visible" : ""}`}
                                    onClick={handleFlipCard}
                                    aria-label={
                                        isAnswerVisible
                                            ? "Show question"
                                            : "Reveal answer"
                                    }
                                >
                                    <span className="flashcard-side-label">
                                        {isAnswerVisible ? "ANSWER" : "QUESTION"}
                                    </span>

                                    <span className="flashcard-section-label">
                                        {currentCard.sectionId}
                                    </span>

                                    <span className="flashcard-content">
                                        <span className="flashcard-markdown">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {isAnswerVisible
                                                    ? currentCard.answer
                                                    : currentCard.question}
                                            </ReactMarkdown>
                                        </span>
                                    </span>

                                    <span className="flashcard-bottom-hint">
                                        <FontAwesomeIcon
                                            icon={faRotateLeft}
                                            aria-hidden="true"
                                        />
                                        {isAnswerVisible
                                            ? "Click to see the question"
                                            : "Click the card to reveal the answer"}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className="flashcards-nav-button flashcards-nav-next"
                                    onClick={handleNextCard}
                                    disabled={currentCardIndex === totalCards - 1}
                                    aria-label="Next flashcard"
                                >
                                    <FontAwesomeIcon icon={faChevronRight} />
                                </button>
                            </div>

                            <div className="flashcards-progress">
                                <div
                                    className="flashcards-progress-track"
                                    role="progressbar"
                                    aria-label="Flashcard position"
                                    aria-valuemin={1}
                                    aria-valuemax={totalCards}
                                    aria-valuenow={currentCardIndex + 1}
                                >
                                    <div
                                        className="flashcards-progress-fill"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                <span className="flashcards-progress-count">
                                    {currentCardIndex + 1} / {totalCards}
                                </span>

                                <button
                                    type="button"
                                    className="flashcards-restart-button"
                                    onClick={handleRestartSection}
                                    aria-label="Restart flashcards"
                                    title="Restart flashcards"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flashcards-empty-state">
                            <div className="flashcards-empty-icon">
                                <FontAwesomeIcon icon={faBookOpen} />
                            </div>

                            <h2>
                                {chapterSections.length === 0
                                    ? "Cards coming soon"
                                    : "No cards in this selection yet"}
                            </h2>

                            <p>
                                {chapterSections.length === 0
                                    ? `Flashcards for Chapter ${selectedChapter?.id ?? selectedChapterId} haven't been added yet.`
                                    : "This selection doesn't contain any valid flashcards yet. Check back soon."}
                            </p>
                        </div>
                    )}
                </section>
            </section>
        </main>
    );
}