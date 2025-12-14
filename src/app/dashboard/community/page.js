"use client";
import { useState, useEffect } from "react";
import { subscribeToPublicWorkouts, cloneWorkout } from "../../../lib/firebase/services";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSkeleton from "../../../components/LoadingSkeleton";
import { getDifficultyColor } from "../../../lib/utils";

export default function CommunityPage() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();
    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cloningId, setCloningId] = useState(null);

    useEffect(() => {
        const unsubscribe = subscribeToPublicWorkouts((data) => {
            setWorkouts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleClone = async (workout) => {
        if (!user) return;
        setCloningId(workout.id);
        try {
            const newId = await cloneWorkout(workout, user);
            router.push(`/dashboard/workouts/${newId}`);
        } catch (error) {
            console.error("Error cloning workout:", error);
            addToast(error.message || "Failed to clone workout.", "error");
        } finally {
            setCloningId(null);
        }
    };

    if (loading) return (
        <div className="max-w-4xl mx-auto p-4">
            <LoadingSkeleton />
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Community Plans</h1>
                    <p className="text-gray-400">Discover and clone workouts created by the community.</p>
                </div>
            </header>

            <div className="grid gap-4">
                {workouts.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 text-3xl">
                            🌍
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Community is quiet</h3>
                        <p className="text-gray-400 mb-4 max-w-sm">
                            No public workouts yet. Be the first to share your plan with the community!
                        </p>
                        <Link
                            href="/dashboard/workouts"
                            className="text-purple-400 hover:text-purple-300 font-medium"
                        >
                            Go to My Workouts →
                        </Link>
                    </div>
                ) : (
                    workouts.map((workout) => (
                        <div key={workout.id} className={`bg-white/5 border rounded-xl p-6 hover:bg-white/10 transition-all flex flex-col sm:flex-row justify-between gap-4 ${workout.isFeatured ? "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]" : "border-white/10"
                            }`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <h3 className="text-xl font-bold text-white mb-0">{workout.name}</h3>
                                    {workout.isFeatured && (
                                        <span className="bg-yellow-500/10 text-yellow-500 text-xs px-2 py-1 rounded-full border border-yellow-500/50 font-medium whitespace-nowrap">
                                            ★ Featured
                                        </span>
                                    )}
                                    {workout.userId === user?.uid && (
                                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/30 font-medium whitespace-nowrap">
                                            Yours
                                        </span>
                                    )}
                                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getDifficultyColor(workout.difficulty)}`}>
                                        {workout.difficulty || 'Beginner'}
                                    </span>
                                </div>
                                <p className="text-gray-300 mb-3 mt-1">{workout.description || "No description provided."}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span>Created by {workout.createdBy || "Unknown User"}</span>
                                    <span>•</span>
                                    <span>{new Date(workout.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {workout.userId !== user?.uid && (
                                    <button
                                        onClick={() => handleClone(workout)}
                                        disabled={cloningId === workout.id}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {cloningId === workout.id ? "Cloning..." : "Clone to My Plan"}
                                    </button>
                                )}
                                <Link href={`/dashboard/workouts/${workout.id}`} className="text-gray-400 hover:text-white px-4 py-2 hover:bg-white/5 rounded-lg transition-colors">
                                    View
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
