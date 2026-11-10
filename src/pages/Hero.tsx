import { Link } from "react-router-dom";
import flowerImage from "../../Image Assets/flower-transparent.png";
import "./Hero.css";

export default function Hero() {
    return (
        <section className="hero-section">
            <div className="hero-inner">

                {/* Main Content */}

                <div className="hero-content">
                    <h1 className="hero-title">
                        Master{" "}
                        <span className="hero-title-highlight">
                            IGCSE
                        </span>
                        <br />
                        <span className="hero-title-maroon">
                            Biology.
                        </span>
                    </h1>

                    <p className="hero-description">
                        Syllabus-aligned notes, smart flashcards,
                        <br />
                        topical MCQs, and exam strategies—
                        <br />
                        all in one place.
                    </p>

                    <div className="hero-buttons">
                        <Link
                            to="/topics"
                            className="hero-button hero-button-primary"
                        >
                            Start Learning
                            <span className="hero-button-arrow">→</span>
                        </Link>

                        <Link
                            to="/topics"
                            className="hero-button hero-button-secondary"
                        >
                            Explore Topics
                        </Link>
                    </div>
                </div>

                {/* Botanical Illustration */}

                <div className="hero-illustration">
                    <img
                        src={flowerImage}
                        alt="Botanical flower illustration"
                    />
                </div>

                {/* Botanical Label */}

                <div
                    className="hero-annotation"
                    aria-label="Botanical illustration"
                >
                    <span className="hero-annotation-line" />

                    <div className="hero-annotation-text">
                        <span className="hero-annotation-name">
                            Boat orchid
                        </span>

                        <span className="hero-annotation-scientific">
                            Cymbidium
                        </span>
                    </div>
                </div>

                {/* Quote Card */}

                <div className="hero-quote">
                    <div className="hero-quote-mark">“</div>

                    <p className="hero-quote-text">
                        The best way to
                        <br />
                        understand life is to
                        <br />
                        study it.
                    </p>

                    <div className="hero-quote-divider" />

                    <p className="hero-quote-attribution">
                        – Visualize. Understand.
                        <br />
                        &nbsp;&nbsp;Remember.
                    </p>
                </div>

            </div>
        </section>
    );
}