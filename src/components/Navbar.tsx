import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Stack from "react-bootstrap/Stack";
import {
    Search,
    MoonFill,
    SunFill,
    List,
    X,
} from "react-bootstrap-icons";

import navbarLogo from "../../Image Assets/Navbar_Logo.svg";
import "./Navbar.css";

export default function Navbar() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const brandRef = useRef<HTMLDivElement>(null);
    const [sideWidth, setSideWidth] = useState(0);

    const location = useLocation();

    useEffect(() => {
        if (!brandRef.current) return;

        const brandElement = brandRef.current;

        const updateWidth = () => {
            setSideWidth(brandElement.offsetWidth);
        };

        updateWidth();

        const observer = new ResizeObserver(updateWidth);
        observer.observe(brandElement);

        window.addEventListener("resize", updateWidth);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateWidth);
        };
    }, []);

    const toggleTheme = () => {
        const dark = !isDarkMode;
        setIsDarkMode(dark);

        document.documentElement.setAttribute(
            "data-bs-theme",
            dark ? "dark" : "light",
        );
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen((open) => !open);
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    const links = [
        { label: "Hero", path: "/", end: true },
        { label: "Topics", path: "/topics" },
        { label: "Notes", path: "/notes" },
        { label: "Flashcards", path: "/flashcards" },
        { label: "MCQs", path: "/mcqs" },
        { label: "Past Papers", path: "/past_papers" },
        { label: "About", path: "/about" },
        { label: "Contact Us", path: "/contact_us" },
    ];

    const isFlashcardsPage = /^\/subject\/\d+\/flashcards\/?$/.test(
        location.pathname,
    );

    const isMCQPage = /^\/subject\/\d+\/mcqs\/?$/.test(
        location.pathname,
    );

    const getLinkClassName = (
        label: string,
        isActive: boolean,
    ) => {
        const active =
            isActive ||
            (label === "Flashcards" && isFlashcardsPage) ||
            (label === "MCQs" && isMCQPage);

        return `nav-link-custom text-body ${active ? "active-maroon" : ""}`;
    };

    return (
        <>
            <nav
                className="navbar-custom"
                style={
                    {
                        "--navbar-side-width": `${Math.max(sideWidth, 220)}px`,
                    } as React.CSSProperties
                }
            >
                <div className="navbar-left">
                    <div className="navbar-brand" ref={brandRef}>
                        <Stack direction="horizontal" gap={2}>
                            <img
                                src={navbarLogo}
                                alt="BioMastery Logo"
                                width={50}
                            />

                            <Stack gap={0}>
                                <h3 className="m-0">BioMastery</h3>
                                <p className="m-0 text-muted small">
                                    IGCSE Biology
                                </p>
                            </Stack>
                        </Stack>
                    </div>
                </div>

                <div className="navbar-center">
                    {links.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            end={link.end}
                            className={({ isActive }) =>
                                getLinkClassName(link.label, isActive)
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </div>

                <div className="navbar-right">
                    <button
                        className="icon-button desktop-only"
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                    >
                        {isDarkMode ? (
                            <SunFill size={20} className="text-warning" />
                        ) : (
                            <MoonFill size={20} className="text-body" />
                        )}
                    </button>

                    <button
                        className="icon-button desktop-only"
                        onClick={() => alert("Search clicked!")}
                        aria-label="Search"
                    >
                        <Search size={20} className="text-body" />
                    </button>

                    <button
                        className="icon-button mobile-only"
                        onClick={toggleMobileMenu}
                        aria-label={
                            mobileMenuOpen ? "Close menu" : "Open menu"
                        }
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? (
                            <X size={28} />
                        ) : (
                            <List size={28} />
                        )}
                    </button>
                </div>
            </nav>

            <div
                className={
                    mobileMenuOpen ? "mobile-menu open" : "mobile-menu"
                }
            >
                {links.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        end={link.end}
                        className={({ isActive }) =>
                            getLinkClassName(link.label, isActive)
                        }
                        onClick={closeMobileMenu}
                    >
                        {link.label}
                    </NavLink>
                ))}

                <hr />

                <button
                    className="mobile-menu-button"
                    onClick={() => {
                        toggleTheme();
                        closeMobileMenu();
                    }}
                >
                    {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
                </button>

                <button
                    className="mobile-menu-button"
                    onClick={() => {
                        alert("Search clicked!");
                        closeMobileMenu();
                    }}
                >
                    🔍 Search
                </button>
            </div>
        </>
    );
}