import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChevronDown,
    faFileLines,
    faLayerGroup,
    faStopwatch,
} from "@fortawesome/free-solid-svg-icons";

import "./TopicsGrid.css";

type Topic = {
    id: number;
    title: string;
};

const topics: Topic[] = [
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

type StudyOption = {
    label: string;
    description: string;
    icon: typeof faFileLines;
    className: string;
    path: (id: number) => string;
};

const studyOptions: StudyOption[] = [
    {
        label: "Syllabus Notes",
        description: "Review the topic notes",
        icon: faFileLines,
        className: "study-option-notes",
        path: (id) => `/notes?chapter=${id}`,
    },
    {
        label: "Flashcards",
        description: "Test your recall",
        icon: faLayerGroup,
        className: "study-option-flashcards",
        path: (id) => `/subject/${id}/flashcards`,
    },
    {
        label: "Topical MCQs",
        description: "Practise exam questions",
        icon: faStopwatch,
        className: "study-option-mcqs",
        path: (id) => `/subject/${id}/mcqs`,
    },
];

export default function TopicsGrid() {
    const [openTopicId, setOpenTopicId] = useState<number | null>(null);
    const gridRef = useRef<HTMLElement>(null);

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
            if (
                gridRef.current &&
                !gridRef.current.contains(event.target as Node)
            ) {
                setOpenTopicId(null);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpenTopicId(null);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <section
            className="topics-grid-section"
            aria-label="IGCSE Biology topics"
            ref={gridRef}
        >
            <div className="topics-grid">
                {topics.map((topic) => {
                    const isOpen = openTopicId === topic.id;

                    return (
                        <article
                            className={`topic-card${isOpen ? " topic-card-open" : ""}`}
                            key={topic.id}
                            onClick={() =>
                                setOpenTopicId(isOpen ? null : topic.id)
                            }
                        >
                            <span className="topic-card-number">
                                {String(topic.id).padStart(2, "0")}
                            </span>

                            <div className="topic-card-image">
                                <img
                                    src={`${import.meta.env.BASE_URL}images/topics/${topic.id}.png`}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>

                            <div className="topic-card-bottom">
                                <h3 className="topic-card-title">
                                    {topic.title}
                                </h3>

                                <button
                                    type="button"
                                    className="topic-card-toggle"
                                    aria-label={`Study options for ${topic.title}`}
                                    aria-expanded={isOpen}
                                    aria-controls={`topic-menu-${topic.id}`}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenTopicId(
                                            isOpen ? null : topic.id
                                        );
                                    }}
                                >
                                    <FontAwesomeIcon
                                        icon={faChevronDown}
                                        className={
                                            isOpen ? "topic-chevron-open" : ""
                                        }
                                    />
                                </button>
                            </div>

                            {isOpen && (
                                <div
                                    className="topic-study-menu"
                                    id={`topic-menu-${topic.id}`}
                                    role="group"
                                    aria-label={`Study ${topic.title}`}
                                    onClick={(event) =>
                                        event.stopPropagation()
                                    }
                                >
                                    <p className="topic-study-menu-heading">
                                        How do you want to study?
                                    </p>

                                    {studyOptions.map((option) => (
                                        <Link
                                            key={option.label}
                                            to={option.path(topic.id)}
                                            className={`topic-study-option ${option.className}`}
                                            onClick={() =>
                                                setOpenTopicId(null)
                                            }
                                        >
                                            <FontAwesomeIcon
                                                icon={option.icon}
                                                className="topic-study-option-icon"
                                            />

                                            <span className="topic-study-option-copy">
                                                <span className="topic-study-option-label">
                                                    {option.label}
                                                </span>

                                                <span className="topic-study-option-description">
                                                    {option.description}
                                                </span>
                                            </span>

                                            <span className="topic-study-option-arrow">
                                                →
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}