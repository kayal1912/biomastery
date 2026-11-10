import Hero from "./Hero";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileLines,
    faCopy,
    faCrosshairs,
    faChartLine
} from "@fortawesome/free-solid-svg-icons";

import "./Home.css";

export default function Home() {
    return (
        <main className="home-page">

            {/* ===========================
                Hero
            =========================== */}

            <Hero />


            {/* ===========================
                Feature Strip
            =========================== */}

            <section className="feature-section">

                <div className="feature-strip">

                    {/* Syllabus Aligned */}

                    <div className="feature-item">

                        <div className="feature-icon">
                            <FontAwesomeIcon icon={faFileLines} />
                        </div>

                        <div className="feature-content">

                            <h3>
                                Syllabus Aligned
                            </h3>

                            <p>
                                100% aligned with the latest
                                <br />
                                IGCSE Biology syllabus.
                            </p>

                        </div>

                    </div>


                    {/* Active Recall */}

                    <div className="feature-item">

                        <div className="feature-icon">
                            <FontAwesomeIcon icon={faCopy} />
                        </div>

                        <div className="feature-content">

                            <h3>
                                Active Recall
                            </h3>

                            <p>
                                Flashcards and spaced
                                <br />
                                repetition to strengthen memory.
                            </p>

                        </div>

                    </div>


                    {/* Exam Focused */}

                    <div className="feature-item">

                        <div className="feature-icon">
                            <FontAwesomeIcon icon={faCrosshairs} />
                        </div>

                        <div className="feature-content">

                            <h3>
                                Exam Focused
                            </h3>

                            <p>
                                Topical MCQs and past papers
                                <br />
                                to ace your exams.
                            </p>

                        </div>

                    </div>


                    {/* Track Progress */}

                    <div className="feature-item">

                        <div className="feature-icon">
                            <FontAwesomeIcon icon={faChartLine} />
                        </div>

                        <div className="feature-content">

                            <h3>
                                Track Progress
                            </h3>

                            <p>
                                Monitor your progress and
                                <br />
                                stay consistent.
                            </p>

                        </div>

                    </div>

                </div>

            </section>


            {/* ===========================
                Explore Topics
            =========================== */}

            <section className="topics-section">

                <div className="topics-header">

                    <h2>
                        Explore Topics
                    </h2>

                    <a
                        href="/topics"
                        className="topics-view-all"
                    >
                        View All Topics
                        <span>
                            →
                        </span>
                    </a>

                </div>


                <div className="topic-cards">

                    {/* Coming next */}

                </div>

            </section>

        </main>
    );
}