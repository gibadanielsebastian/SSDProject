
"use client";
import { useState, useEffect, use } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import { getWorkout, subscribeToExercises, addExercise, deleteExercise, updateWorkout, cloneWorkout, subscribeToWorkout, markWorkoutComplete, toggleFeatured } from "../../../../lib/firebase/services";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoadingSkeleton from "../../../../components/LoadingSkeleton";

export default function WorkoutDetailsPage({ params }) {
    // Unap params using React.use
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const { user, profile } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();
    const [workout, setWorkout] = useState(null);
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [cloning, setCloning] = useState(false);

    // Form State
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newExercise, setNewExercise] = useState({
        name: "",
        sets: "3",
        reps: "10",
        weight: ""
    });

    useEffect(() => {
        if (!user) return;

        // Real-time subscription to workout details
        const unsubWorkout = subscribeToWorkout(id, (w) => {
            if (!w) {
                router.push("/dashboard/workouts");
                return;
            }
            setWorkout(w);
            setIsOwner(w.userId === user.uid);
            setLoading(false);
        });

        // Real-time subscription to exercises
        const unsubExercises = subscribeToExercises(id, (data) => {
            setExercises(data);
        });

        return () => {
            unsubWorkout();
            unsubExercises();
        };
    }, [id, user, router]);



    // ... (rest of state setup)

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newExercise.name || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await addExercise(id, newExercise);
            setNewExercise({ name: "", sets: "3", reps: "10", weight: "" });
            setIsAdding(false);
        } catch (error) {
            console.error("Error adding exercise:", error);
            addToast("Failed to add exercise.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ... (rest of file)

    <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {isSubmitting ? "Adding..." : "Add to Plan"}
    </button>

    const handleDeleteExercise = async (exerciseId) => {
        if (!confirm("Delete this exercise?")) return;
        try {
            await deleteExercise(workout.id, exerciseId);
        } catch (error) {
            console.error("Error deleting exercise:", error);
        }
    };

    const togglePublic = async () => {
        try {
            await updateWorkout(workout.id, { isPublic: !workout.isPublic });
        } catch (error) {
            console.error("Error updating visibility:", error);
        }
    };

    const handleClone = async () => {
        if (!user || cloning) return;
        setCloning(true);
        try {
            const newId = await cloneWorkout(workout, user);
            router.push(`/dashboard/workouts/${newId}`);
            addToast("Workout cloned successfully!", "success");
        } catch (error) {
            console.error("Error cloning workout:", error);
            addToast(error.message || "Failed to clone workout.", "error");
        } finally {
            setCloning(false);
        }
    };

    const handleComplete = async () => {
        if (!user) return;
        if (confirm("Great job! Mark this workout as complete?")) {
            try {
                await markWorkoutComplete(user.uid, workout.id, workout.name, exercises);
                addToast("Workout completed! Excellent work!", "success");
                router.push("/dashboard");
            } catch (error) {
                console.error("Error completing workout:", error);
                addToast("Failed to complete workout.", "error");
            }
        }
    };

    const toggleFeatureStatus = async () => {
        try {
            await toggleFeatured(workout.id, !workout.isFeatured);
            addToast(workout.isFeatured ? "Removed from featured." : "Marked as featured!", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed to update status.", "error");
        }
    };



    if (loading) return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <LoadingSkeleton />
        </div>
    );
    if (!workout) return <div className="p-8 text-center text-gray-400">Workout not found.</div>;

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="flex items-center gap-3 mt-2 mb-2">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                            {workout.name}
                        </h1>
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${workout.difficulty === 'Advanced' ? 'bg-red-500/10 text-red-400 border-red-500/20' : workout.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                            {workout.difficulty || 'Beginner'}
                        </span>
                    </div>
                    <p className="text-gray-400">{workout.description || "No description provided."}</p>
                    {workout.recommendations && (
                        <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                            <h4 className="text-blue-400 text-sm font-bold mb-1">💡 Trainer Recommendations</h4>
                            <p className="text-gray-300 text-sm">{workout.recommendations}</p>
                        </div>
                    )}
                </div>
                {isOwner ? (
                    <div className="flex gap-3">
                        <button
                            onClick={togglePublic}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors border ${workout.isPublic ? "border-green-500 text-green-400 hover:bg-green-500/10" : "border-gray-600 text-gray-400 hover:border-gray-400"}`}
                        >
                            {workout.isPublic ? "Make Private" : "Make Public"}
                        </button>
                        {(profile?.role === "admin" || profile?.role === "trainer") && workout.isPublic && (
                            <button
                                onClick={toggleFeatureStatus}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors border ${workout.isFeatured
                                    ? "bg-yellow-500/10 border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                                    : "border-gray-600 text-gray-400 hover:border-gray-400"
                                    }`}
                            >
                                {workout.isFeatured ? "★ Featured" : "☆ Feature"}
                            </button>
                        )}
                        <button
                            onClick={handleComplete}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            ✓ Complete
                        </button>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {isAdding ? "Cancel" : "+ Add Exercise"}
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        {(profile?.role === "admin" || profile?.role === "trainer") && workout.isPublic && (
                            <button
                                onClick={toggleFeatureStatus}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors border ${workout.isFeatured
                                    ? "bg-yellow-500/10 border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                                    : "border-gray-600 text-gray-400 hover:border-gray-400"
                                    }`}
                            >
                                {workout.isFeatured ? "★ Featured" : "☆ Feature"}
                            </button>
                        )}
                        <button
                            onClick={handleClone}
                            disabled={cloning}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {cloning ? "Cloning..." : "Clone to My Plan"}
                        </button>
                    </div>
                )}
            </header>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-8 animate-in fade-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1 text-gray-300">Exercise Name</label>
                            <input
                                type="text"
                                value={newExercise.name}
                                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g., Bench Press"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">Sets</label>
                            <input
                                type="number"
                                value={newExercise.sets}
                                onChange={(e) => setNewExercise({ ...newExercise, sets: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">Reps</label>
                            <input
                                type="text"
                                value={newExercise.reps}
                                onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors w-full"
                    >
                        Add to Plan
                    </button>
                </form>
            )}

            <div className="space-y-4">
                {exercises.map((ex, idx) => (
                    <div key={ex.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl font-bold text-slate-700">#{idx + 1}</span>
                            <div>
                                <h3 className="text-lg font-bold">{ex.name}</h3>
                                <p className="text-gray-400 text-sm">
                                    {ex.sets} sets × {ex.reps} reps
                                </p>
                            </div>
                        </div>
                        {isOwner && (
                            <button
                                onClick={() => handleDeleteExercise(ex.id)}
                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
                {exercises.length === 0 && !isAdding && (
                    <div className="text-center py-12 text-gray-500 border-2 border-dashed border-white/10 rounded-2xl">
                        No exercises yet. Add some to build your workout!
                    </div>
                )}
            </div>
        </div>
    );
}
