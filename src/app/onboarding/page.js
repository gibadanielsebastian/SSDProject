
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { createUserProfile } from "../../lib/firebase/services";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
    const { user, profile, fetchProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [role, setRole] = useState("trainee");
    const [loading, setLoading] = useState(false);
    const [trainerId, setTrainerId] = useState("");
    const [trainers, setTrainers] = useState([]);
    const { getAllUsers } = require("../../lib/firebase/services");

    useEffect(() => {
        // If profile already exists, redirect to dashboard
        if (!authLoading && profile?.role) {
            router.push("/dashboard");
        }
    }, [profile, authLoading, router]);

    useEffect(() => {
        const loadTrainers = async () => {
            if (role === 'trainee') {
                const users = await getAllUsers();
                setTrainers(users.filter(u => u.role === 'trainer'));
            }
        };
        loadTrainers();
    }, [role]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createUserProfile(user.uid, {
                email: user.email,
                role: role,
                displayName: user.displayName || "User",
                trainerId: role === 'trainee' ? trainerId : null
            });
            await fetchProfile(user.uid); // Force update context
            router.push("/dashboard");
        } catch (error) {
            console.error("Onboarding error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || (profile && profile.role)) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl max-w-md w-full animate-in fade-in zoom-in duration-500">
                <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                    Welcome to FitUp
                </h1>
                <p className="text-gray-400 text-center mb-8">
                    Choose your role to get started.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div
                        onClick={() => setRole("trainee")}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${role === "trainee" ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-500"}`}
                    >
                        <h3 className="font-bold text-lg mb-1">🏋️‍♀️ I want to Train</h3>
                        <p className="text-sm text-gray-400">I'm here to plan workouts, track progress, and get fit.</p>
                    </div>

                    {role === "trainee" && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm text-gray-400 mb-1 ml-1">Select a Personal Trainer (Optional)</label>
                            <select
                                value={trainerId}
                                onChange={(e) => setTrainerId(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                            >
                                <option value="">-- No Trainer --</option>
                                {trainers.map(t => (
                                    <option key={t.id} value={t.id}>{t.displayName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div
                        onClick={() => setRole("trainer")}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${role === "trainer" ? "border-purple-500 bg-purple-500/10" : "border-slate-700 hover:border-slate-500"}`}
                    >
                        <h3 className="font-bold text-lg mb-1">🧑‍🏫 I am a Trainer</h3>
                        <p className="text-sm text-gray-400">I want to create programs and manage trainees.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-6"
                    >
                        {loading ? "Setting up..." : "Continue"}
                    </button>
                </form>
            </div>
        </div>
    );
}
