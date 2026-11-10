import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import mcqData from "../data/mcqs.json";
import "./MCQ.css";

type MCQQuestion = {
    id: string;
    chapter: number;
    questionNumber: number;
    answer: string;
    image: string;
};

type AnswerState = {
    selected: string;
    checked: boolean;
};

const questions = mcqData as MCQQuestion[];
const OPTIONS = ["A", "B", "C", "D"];

export default function MCQ() {
    const [, setSearchParams] = useSearchParams();
    const { id: subjectId } = useParams<{ id: string }>();

    const availableChapters = useMemo(
        () =>
            [...new Set(questions.map((question) => question.chapter))].sort(
                (a, b) => a - b,
            ),
        [],
    );

    const [selectedChapter, setSelectedChapter] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const requestedChapter = Number(params.get("chapter")) || 1;

        return availableChapters.includes(requestedChapter)
            ? requestedChapter
            : (availableChapters[0] ?? 1);
    });

    const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
    const [reviewIncorrect, setReviewIncorrect] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);

    const chapterQuestions = useMemo(
        () =>
            questions
                .filter((question) => question.chapter === selectedChapter)
                .sort((a, b) => a.questionNumber - b.questionNumber),
        [selectedChapter],
    );

    const displayedQuestions = useMemo(() => {
        if (!reviewIncorrect) return chapterQuestions;

        return chapterQuestions.filter((question) => {
            const answer = answers[question.id];

            return (
                answer?.checked &&
                answer.selected !== question.answer
            );
        });
    }, [chapterQuestions, reviewIncorrect, answers]);

    const answeredCount = chapterQuestions.filter(
        (question) => Boolean(answers[question.id]?.selected),
    ).length;

    const checkedQuestions = chapterQuestions.filter(
        (question) => answers[question.id]?.checked,
    );

    const correctCount = checkedQuestions.filter(
        (question) => answers[question.id]?.selected === question.answer,
    ).length;

    const incorrectCount = checkedQuestions.length - correctCount;
    const unansweredCount = chapterQuestions.length - answeredCount;

    const accuracy =
        checkedQuestions.length > 0
            ? Math.round((correctCount / checkedQuestions.length) * 100)
            : 0;

    const progress =
        chapterQuestions.length > 0
            ? (answeredCount / chapterQuestions.length) * 100
            : 0;

    function resetQuestionListScroll() {
        const list = document.querySelector(".mcq-question-list");

        if (list) list.scrollTop = 0;
    }

    function changeChapter(chapter: number) {
        setSelectedChapter(chapter);
        setReviewIncorrect(false);
        setStatsOpen(false);
        setSearchParams({ chapter: String(chapter) });
        resetQuestionListScroll();
    }

    function selectAnswer(question: MCQQuestion, option: string) {
        setAnswers((previous) => {
            const existing = previous[question.id];

            if (existing?.checked) return previous;

            return {
                ...previous,
                [question.id]: {
                    selected: option,
                    checked: false,
                },
            };
        });
    }

    function checkAnswer(question: MCQQuestion) {
        setAnswers((previous) => {
            const existing = previous[question.id];

            if (!existing?.selected || existing.checked) return previous;

            return {
                ...previous,
                [question.id]: {
                    ...existing,
                    checked: true,
                },
            };
        });
    }

    function clearAllAnswers() {
        setAnswers((previous) => {
            const next = { ...previous };

            chapterQuestions.forEach((question) => {
                delete next[question.id];
            });

            return next;
        });

        setReviewIncorrect(false);
        resetQuestionListScroll();
    }

    function startReviewIncorrect() {
        setReviewIncorrect(true);
        setStatsOpen(false);
        resetQuestionListScroll();
    }

    function toggleStats() {
        setStatsOpen((open) => !open);
    }

    if (!questions.length || !availableChapters.length) {
        return (
            <main className="mcq-page">
                <div className="mcq-page-inner">
                    <div className="mcq-empty">
                        <h1>No questions available</h1>
                        <p>Check that your MCQ JSON file contains questions.</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="mcq-page">
            <div className="mcq-page-inner">
                <header className="mcq-page-heading">
                    <h1>Topical MCQs</h1>
                    <span className="mcq-heading-underline" />
                    <p>
                        Practice by topic. Get instant feedback and learn
                        from your mistakes.
                    </p>
                </header>

                <section className="mcq-controls">
                    <label className="mcq-chapter-select">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"
                                stroke="currentColor"
                                strokeWidth="1.6"
                            />
                        </svg>

                        <select
                            value={selectedChapter}
                            onChange={(event) =>
                                changeChapter(Number(event.target.value))
                            }
                            aria-label="Select chapter"
                        >
                            {availableChapters.map((chapter) => (
                                <option key={chapter} value={chapter}>
                                    Chapter {chapter}
                                </option>
                            ))}
                        </select>

                        <svg
                            className="mcq-select-chevron"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="m7 10 5 5 5-5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </label>

                    <button
                        type="button"
                        className={`mcq-stats-toggle ${
                            statsOpen ? "is-open" : ""
                        }`}
                        aria-expanded={statsOpen}
                        aria-controls="mcq-stats-panel"
                        onClick={toggleStats}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-6m4 10V9"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span>Stats</span>
                        <svg
                            className="mcq-stats-toggle-chevron"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="m7 10 5 5 5-5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>

                    <div className="mcq-control-spacer" />

                    <span className="mcq-question-total">
                        {reviewIncorrect
                            ? `${displayedQuestions.length} incorrect`
                            : `${chapterQuestions.length} questions`}
                    </span>

                    {reviewIncorrect && (
                        <button
                            type="button"
                            className="mcq-clear-filter"
                            onClick={() => {
                                setReviewIncorrect(false);
                                resetQuestionListScroll();
                            }}
                        >
                            Show all
                        </button>
                    )}
                </section>

                {/* Mobile stats panel: only the Stats button toggles visibility. */}
                <div
                    className={`mcq-mobile-stats ${
                        statsOpen ? "is-open" : ""
                    }`}
                    id="mcq-stats-panel"
                    aria-hidden={!statsOpen}
                    inert={!statsOpen}
                >
                    <aside className="mcq-sidebar mcq-mobile-sidebar">
                        <ProgressCard
                            answeredCount={answeredCount}
                            questionCount={chapterQuestions.length}
                            progress={progress}
                        />

                        <StatsCard
                            correctCount={correctCount}
                            incorrectCount={incorrectCount}
                            unansweredCount={unansweredCount}
                            checkedCount={checkedQuestions.length}
                            accuracy={accuracy}
                        />

                        <ActionsCard
                            onReviewIncorrect={startReviewIncorrect}
                            onClearAnswers={clearAllAnswers}
                        />
                    </aside>
                </div>

                <div className="mcq-main-layout">
                    <section
                        className="mcq-question-list"
                        aria-label="Multiple choice questions"
                    >
                        {displayedQuestions.length === 0 ? (
                            <div className="mcq-empty mcq-empty-list">
                                <div className="mcq-empty-icon">✓</div>
                                <h2>
                                    {reviewIncorrect
                                        ? "All caught up!"
                                        : "No questions found"}
                                </h2>
                                <p>
                                    {reviewIncorrect
                                        ? "There are no checked incorrect answers to review in this chapter."
                                        : "Try selecting another chapter."}
                                </p>

                                {reviewIncorrect && (
                                    <button
                                        type="button"
                                        className="mcq-primary-button"
                                        onClick={() => {
                                            setReviewIncorrect(false);
                                            resetQuestionListScroll();
                                        }}
                                    >
                                        Back to all questions
                                    </button>
                                )}
                            </div>
                        ) : (
                            displayedQuestions.map((question, index) => {
                                const answer = answers[question.id];
                                const selected = answer?.selected;
                                const checked = Boolean(answer?.checked);
                                const isCorrect =
                                    checked && selected === question.answer;

                                const imageFilename = question.image.split("/").pop();

                                const imageSrc = imageFilename
                                    ? `${import.meta.env.BASE_URL}images/mcq/${imageFilename}`
                                    : "";

                                return (
                                    <article
                                        className="mcq-question-card"
                                        id={`mcq-${question.id}`}
                                        key={question.id}
                                    >
                                        <div className="mcq-card-heading">
                                            <span className="mcq-card-number">
                                                {index + 1}.
                                            </span>

                                            <div className="mcq-card-heading-main">
                                                <span className="mcq-card-chapter">
                                                    Chapter {question.chapter}
                                                    {" · "}
                                                    Question {question.questionNumber}
                                                </span>

                                                {checked && (
                                                    <span
                                                        className={
                                                            isCorrect
                                                                ? "mcq-status-correct"
                                                                : "mcq-status-incorrect"
                                                        }
                                                    >
                                                        {isCorrect
                                                            ? "✓ Correct"
                                                            : "× Incorrect"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mcq-card-content">
                                            <div className="mcq-question-image-wrap">
                                                <img
                                                    className="mcq-question-image"
                                                    src={imageSrc}
                                                    alt={`Chapter ${question.chapter}, question ${question.questionNumber}`}
                                                    loading={index < 3 ? "eager" : "lazy"}
                                                    onError={(event) => {
                                                        event.currentTarget.style.display =
                                                            "none";

                                                        const fallback =
                                                            event.currentTarget
                                                                .nextElementSibling as
                                                                | HTMLElement
                                                                | null;

                                                        if (fallback) {
                                                            fallback.style.display =
                                                                "flex";
                                                        }
                                                    }}
                                                />

                                                <div
                                                    className="mcq-image-error"
                                                    style={{ display: "none" }}
                                                >
                                                    <strong>
                                                        Unable to load question image
                                                    </strong>
                                                    <span>
                                                        Check that{" "}
                                                        <code>{question.image}</code>{" "}
                                                        exists in your public/images directory.
                                                    </span>
                                                </div>
                                            </div>

                                            <div
                                                className="mcq-options"
                                                role="group"
                                                aria-label={`Answer choices for question ${question.questionNumber}`}
                                            >
                                                {OPTIONS.map((option) => {
                                                    const optionSelected =
                                                        selected === option;

                                                    const optionCorrect =
                                                        checked &&
                                                        question.answer === option;

                                                    const optionIncorrect =
                                                        checked &&
                                                        optionSelected &&
                                                        option !== question.answer;

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={option}
                                                            className={[
                                                                "mcq-option",
                                                                optionSelected
                                                                    ? "is-selected"
                                                                    : "",
                                                                optionCorrect
                                                                    ? "is-correct"
                                                                    : "",
                                                                optionIncorrect
                                                                    ? "is-incorrect"
                                                                    : "",
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" ")}
                                                            onClick={() =>
                                                                selectAnswer(question, option)
                                                            }
                                                            disabled={checked}
                                                            aria-pressed={optionSelected}
                                                        >
                                                            <span className="mcq-option-letter">
                                                                {option}
                                                            </span>

                                                            {checked && optionCorrect && (
                                                                <span className="mcq-option-mark">
                                                                    ✓
                                                                </span>
                                                            )}

                                                            {checked && optionIncorrect && (
                                                                <span className="mcq-option-mark">
                                                                    ×
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {checked ? (
                                                <div
                                                    className={`mcq-feedback ${
                                                        isCorrect
                                                            ? "feedback-correct"
                                                            : "feedback-incorrect"
                                                    }`}
                                                    role="status"
                                                >
                                                    <span className="mcq-feedback-symbol">
                                                        {isCorrect ? "✓" : "!"}
                                                    </span>

                                                    <div className="mcq-feedback-copy">
                                                        <strong>
                                                            {isCorrect
                                                                ? "Correct!"
                                                                : "Not quite."}
                                                        </strong>
                                                        <p>
                                                            {isCorrect
                                                                ? `You selected the correct answer: ${question.answer}.`
                                                                : `The correct answer is ${question.answer}.`}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`mcq-your-answer ${
                                                            isCorrect
                                                                ? "answer-correct"
                                                                : "answer-incorrect"
                                                        }`}
                                                    >
                                                        Your answer:{" "}
                                                        <strong>{selected}</strong>
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="mcq-card-footer">
                                                    <span className="mcq-select-hint">
                                                        {selected
                                                            ? `Option ${selected} selected`
                                                            : "Select your answer"}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        className="mcq-check-button"
                                                        onClick={() => checkAnswer(question)}
                                                        disabled={!selected}
                                                    >
                                                        Check answer
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            aria-hidden="true"
                                                        >
                                                            <path
                                                                d="m5 12 4 4L19 6"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </section>

                    {/* Desktop sidebar remains permanently visible. */}
                    <aside className="mcq-sidebar mcq-desktop-sidebar">
                        <ProgressCard
                            answeredCount={answeredCount}
                            questionCount={chapterQuestions.length}
                            progress={progress}
                        />

                        <StatsCard
                            correctCount={correctCount}
                            incorrectCount={incorrectCount}
                            unansweredCount={unansweredCount}
                            checkedCount={checkedQuestions.length}
                            accuracy={accuracy}
                        />

                        <ActionsCard
                            onReviewIncorrect={startReviewIncorrect}
                            onClearAnswers={clearAllAnswers}
                        />
                    </aside>
                </div>
            </div>
        </main>
    );
}

type ProgressCardProps = {
    answeredCount: number;
    questionCount: number;
    progress: number;
};

function ProgressCard({
                          answeredCount,
                          questionCount,
                          progress,
                      }: ProgressCardProps) {
    return (
        <section className="mcq-sidebar-card mcq-progress-card">
            <h2>Your Progress</h2>

            <div
                className="mcq-progress-ring"
                style={
                    {
                        "--mcq-progress": `${progress}%`,
                    } as React.CSSProperties
                }
            >
                <div className="mcq-progress-ring-inner">
                    <strong>{Math.round(progress)}%</strong>
                </div>
            </div>

            <p className="mcq-progress-caption">
                <strong>{answeredCount}</strong> / {questionCount} answered
            </p>

            <div className="mcq-sidebar-progress-track">
                <div
                    className="mcq-sidebar-progress-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </section>
    );
}

type StatsCardProps = {
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    checkedCount: number;
    accuracy: number;
};

function StatsCard({
                       correctCount,
                       incorrectCount,
                       unansweredCount,
                       checkedCount,
                       accuracy,
                   }: StatsCardProps) {
    return (
        <section className="mcq-sidebar-card mcq-stats-card">
            <h2>Study Stats</h2>

            <div className="mcq-stat-row">
                <span>
                    <i className="mcq-stat-dot stat-dot-correct" />
                    Correct
                </span>
                <strong className="stat-text-correct">{correctCount}</strong>
            </div>

            <div className="mcq-stat-row">
                <span>
                    <i className="mcq-stat-dot stat-dot-incorrect" />
                    Incorrect
                </span>
                <strong className="stat-text-incorrect">{incorrectCount}</strong>
            </div>

            <div className="mcq-stat-row">
                <span>
                    <i className="mcq-stat-dot stat-dot-unanswered" />
                    Unattempted
                </span>
                <strong>{unansweredCount}</strong>
            </div>

            <div className="mcq-stat-row">
                <span>
                    <i className="mcq-stat-dot stat-dot-accuracy" />
                    Accuracy
                </span>
                <strong>
                    {checkedCount ? `${accuracy}%` : "—"}
                </strong>
            </div>
        </section>
    );
}

type ActionsCardProps = {
    onReviewIncorrect: () => void;
    onClearAnswers: () => void;
};

function ActionsCard({
                         onReviewIncorrect,
                         onClearAnswers,
                     }: ActionsCardProps) {
    return (
        <section className="mcq-sidebar-card mcq-actions-card">
            <h2>Quick Actions</h2>

            <button
                type="button"
                className="mcq-quick-action"
                onClick={onReviewIncorrect}
            >
                <span className="mcq-quick-icon">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                    >
                        <path
                            d="M12 3 20 6v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-3Z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                        />
                        <path
                            d="m9 12 2 2 4-4"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>

                <span className="mcq-quick-copy">
                    <strong>Review Incorrect</strong>
                    <small>Review your mistakes</small>
                </span>

                <span className="mcq-quick-chevron">›</span>
            </button>

            <button
                type="button"
                className="mcq-quick-action"
                onClick={onClearAnswers}
            >
                <span className="mcq-quick-icon">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                    >
                        <path
                            d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>

                <span className="mcq-quick-copy">
                    <strong>Clear All Answers</strong>
                    <small>Reset this chapter&apos;s answers</small>
                </span>

                <span className="mcq-quick-chevron">›</span>
            </button>
        </section>
    );
}