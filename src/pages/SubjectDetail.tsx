import { useParams } from "react-router-dom";

export default function SubjectDetail() {
    const { id } = useParams();

    return (
        <div>
            <h1>{id?.toUpperCase()}</h1>

            <button>Syllabus Notes</button>
            <button>Topical Past Papers</button>
            <button>Flashcards</button>
        </div>
    );
}