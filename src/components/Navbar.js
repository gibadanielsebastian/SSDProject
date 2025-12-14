"use client";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
    const { user, logOut, googleSignIn, profile } = useAuth(); // Destructure profile
    const router = useRouter();
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleLogin = async () => {
        try {
            await googleSignIn();
            router.push("/dashboard");
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const handleLogout = async () => {
        try {
            await logOut();
            router.push("/");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const NavLink = ({ href, children }) => {
        const isActive = pathname === href;
        return (
            <Link
                href={href}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${isActive
                    ? "text-white bg-white/10 shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-white/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
            >
                {children}
                {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-[1px]" />
                )}
            </Link>
        );
    };

    return (
        <nav
            className={`fixed w-full top-0 z-50 transition-all duration-300 border-b ${isScrolled
                ? "bg-slate-950/95 backdrop-blur-xl border-white/10 py-3"
                : "bg-transparent border-transparent py-5"
                }`}
        >
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link href="/" className="group flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                        <span className="text-white font-bold text-lg">F</span>
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                        FITUP
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-full border border-white/5 backdrop-blur-md">
                    {user && (
                        <>
                            <NavLink href="/dashboard">Dashboard</NavLink>
                            <NavLink href="/dashboard/workouts">Workouts</NavLink>
                            <NavLink href="/dashboard/community">Community</NavLink>
                            {profile?.role === "admin" && (
                                <NavLink href="/dashboard/admin">Admin</NavLink>
                            )}

                        </>
                    )}
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">
                                {user.displayName?.split(" ")[0]}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="bg-white text-slate-950 px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        >
                            Get Started
                        </button>
                    )}
                </div>

                {/* Mobile Actions: Burger if User, Get Started if Guest */}
                <div className="md:hidden">
                    {user ? (
                        <button
                            className="text-white p-2"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? "✕" : "☰"}
                        </button>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="bg-white text-slate-950 px-4 py-2 rounded-full text-xs font-bold hover:bg-gray-200 transition-colors"
                        >
                            Get Started
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-slate-950 border-b border-white/10 p-4 flex flex-col gap-4 animate-in slide-in-from-top-4">
                    {user && (
                        <>
                            <Link href="/dashboard" className="text-gray-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                            <Link href="/dashboard/workouts" className="text-gray-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>Workouts</Link>
                            <Link href="/dashboard/community" className="text-gray-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>Community</Link>
                            <div className="h-px bg-white/10 my-2" />
                            <button onClick={handleLogout} className="text-red-400 text-left">Logout</button>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
}
