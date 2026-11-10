import orchidImage from "../../Image Assets/flower2-transparent.png";
import "./TopicsHero.css";

export default function TopicsHero() {
    return (
        <section className="topics-hero">
            <div className="topics-hero-inner">

                {/* Main Content */}

                <div className="topics-hero-content">
                    <h1 className="topics-hero-title">
                        All Topics
                    </h1>

                    <div className="topics-hero-underline" />

                    <p className="topics-hero-description">
                        Explore all 21 topics in the IGCSE Biology syllabus.
                        <br />
                        Choose a topic to start your{" "}
                        <span>Master.Test.Fix</span> journey.
                    </p>
                </div>

                {/* Moth Orchid Illustration */}

                <div className="topics-hero-illustration">
                    <img
                        src={orchidImage}
                        alt="Pink and white moth orchid"
                    />
                </div>

                {/* Botanical Label */}

                <div
                    className="topics-hero-annotation"
                    aria-label="Moth orchid, Phalaenopsis"
                >
                    <span className="topics-hero-annotation-line" />

                    <div className="topics-hero-annotation-text">
                        <span className="topics-hero-annotation-name">
                            Moth Orchid
                        </span>

                        <span className="topics-hero-annotation-scientific">
                            Phalaenopsis
                        </span>
                    </div>
                </div>

            </div>
        </section>
    );
}