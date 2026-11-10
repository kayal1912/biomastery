import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Subjects from "./pages/Subjects";
import SubjectDetail from "./pages/SubjectDetail";
import Notes from "./pages/Notes";
import Flashcards from "./pages/Flashcards";
import MCQ from "./pages/MCQ";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";

export default function App() {
    return (
        <>
            <Navbar />

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/topics" element={<Subjects />} />
                <Route path="/subject/:id" element={<SubjectDetail />} />
                <Route path="/notes" element={<Notes />} />

                {/* Flashcards */}
                <Route
                    path="/subject/:id/flashcards"
                    element={<Flashcards />}
                />
                <Route
                    path="/flashcards"
                    element={<Navigate to="/subject/1/flashcards" replace />}
                />

                {/* MCQs */}
                <Route path="/subject/:id/mcqs" element={<MCQ />} />
                <Route
                    path="/mcqs"
                    element={<Navigate to="/subject/1/mcqs" replace />}
                />

                {/* Past papers placeholder */}
                <Route
                    path="/past_papers"
                    element={<Navigate to="/topics" replace />}
                />
            </Routes>
        </>
    );
}