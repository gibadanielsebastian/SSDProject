
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { subscribeToUserWorkouts, addWorkout, deleteWorkout } from "../../../lib/firebase/services";
import Link from "next/link";
import LoadingSkeleton from "../../../components/LoadingSkeleton";
import { useToast } from "../../../context/ToastContext";

export default function WorkoutsPage() {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newWorkout, setNewWorkout] = useState({ name: "", description: "", difficulty: "Beginner", recommendations: "" });
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let unsubscribe;
        if (user) {
            // Real-time subscription
            unsubscribe = subscribeToUserWorkouts(user.uid, (data) => {
                setWorkouts(data);
                setLoading(false);
            });
        }
        return () => unsubscribe && unsubscribe();
    }, [user]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newWorkout.name || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await addWorkout(user, newWorkout);
            setNewWorkout({ name: "", description: "", difficulty: "Beginner", recommendations: "" });
            setIsCreating(false);
            addToast("Workout created successfully!", "success");
        } catch (error) {
            console.error("Error creating workout:", error);
            addToast("Failed to create workout.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        // e.stopPropagation is no longer needed if we structure correctly, 
        // but we'll keep it simple by separating the elements.

        if (confirm("Are you sure you want to delete this workout?")) {
            try {
                await deleteWorkout(id);
                addToast("Workout deleted.", "success");
            } catch (error) {
                console.error("Error deleting workout:", error);
                addToast("Failed to delete workout. Please try again.", "error");
            }
        }
    };

    if (loading) return (
        <div className="max-w-4xl mx-auto p-4">
            <LoadingSkeleton />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Workouts</h1>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    {isCreating ? "Cancel" : "+ New Workout"}
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-8 animate-in fade-in slide-in-from-top-4">
                    {/* ... (Form fields remain same) ... */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">Workout Name</label>
                            <input
                                type="text"
                                value={newWorkout.name}
                                onChange={(e) => setNewWorkout({ ...newWorkout, name: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g., Upper Body Power"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">Difficulty</label>
                            <select
                                value={newWorkout.difficulty}
                                onChange={(e) => setNewWorkout({ ...newWorkout, difficulty: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                            <textarea
                                value={newWorkout.description}
                                onChange={(e) => setNewWorkout({ ...newWorkout, description: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none h-24"
                                placeholder="Describe your workout goals..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">Trainer Recommendations</label>
                            <textarea
                                value={newWorkout.recommendations}
                                onChange={(e) => setNewWorkout({ ...newWorkout, recommendations: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none h-24"
                                placeholder="Tips, warnings, or focus areas..."
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-lg font-medium transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Saving..." : "Save Workout"}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid gap-4">
                {workouts.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 text-3xl">
                            💪
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No workouts found</h3>
                        <p className="text-gray-400 mb-6 max-w-sm">
                            Create your first workout plan to start tracking your progress and achieving your goals.
                        </p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            + Create New Plan
                        </button>
                    </div>
                ) : (
                    workouts.map((workout) => (
                        <div
                            key={workout.id}
                            className="relative bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group flex justify-between items-center p-6"
                        >
                            {/* Clickable Area for Navigation */}
                            <Link href={`/dashboard/workouts/${workout.id}`} className="absolute inset-0 z-0" />

                            <div className="pointer-events-none relative z-10">
                                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300">{workout.name}</h3>
                                <p className="text-gray-400 text-sm mt-1 max-w-md truncate">{workout.description}</p>
                                <div className="text-xs text-slate-500 mt-2">
                                    {workout.createdAt?.seconds ? new Date(workout.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 relative z-20">
                                <span className="text-sm text-gray-500 group-hover:text-gray-300 pointer-events-none">View Details →</span>
                                <button
                                    onClick={() => handleDelete(workout.id)}
                                    className="text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1 rounded-lg text-sm transition-colors cursor-pointer"
                                    style={{ isolation: 'isolate' }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
