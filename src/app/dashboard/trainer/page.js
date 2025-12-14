"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getAllUsers, getStats, sendFeedback } from "../../../lib/firebase/services";
import { useRouter } from "next/navigation";
import LoadingSkeleton from "../../../components/LoadingSkeleton";
import { useToast } from "../../../context/ToastContext";

export default function TrainerPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [trainees, setTrainees] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { addToast } = useToast();

    // Modal State
    const [selectedTrainee, setSelectedTrainee] = useState(null);
    const [traineeStats, setTraineeStats] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [unassignedTrainees, setUnassignedTrainees] = useState([]);

    useEffect(() => {
        if (!authLoading) {
            if (!user || (profile?.role !== "trainer" && profile?.role !== "admin")) {
                router.push("/dashboard");
                return;
            }
            fetchTrainees();
        }
    }, [user, profile, authLoading, router]);

    const fetchTrainees = async () => {
        const allUsers = await getAllUsers();
        // Filter only trainees assigned to this trainer (or show all if admin)
        const myTrainees = allUsers.filter(u =>
            u.role === "trainee" && (u.trainerId === user.uid || profile.role === "admin")
        );

        // Also fetch unassigned for the "Add Student" feature
        const unassigned = allUsers.filter(u => u.role === "trainee" && !u.trainerId);

        setTrainees(myTrainees);
        setUnassignedTrainees(unassigned);
        setLoading(false);
    };

    const handleViewTrainee = async (trainee) => {
        setSelectedTrainee(trainee);
        setTraineeStats(null); // Reset
        try {
            const stats = await getStats(trainee.id);
            setTraineeStats(stats);
        } catch (error) {
            console.error("Error fetching trainee stats:", error);
        }
    };

    const handleClaimTrainee = async (traineeId) => {
        try {
            const { updateUser } = require("../../../lib/firebase/services");
            await updateUser(traineeId, { trainerId: user.uid });
            addToast("Student added to your roster!", "success");
            setIsAddingStudent(false);
            fetchTrainees(); // Refresh lists
        } catch (error) {
            console.error(error);
            addToast("Failed to add student.", "error");
        }
    };

    const handleSendFeedback = async (e) => {
        e.preventDefault();
        if (!feedbackMessage.trim() || !selectedTrainee) return;

        try {
            await sendFeedback(user.uid, selectedTrainee.id, feedbackMessage);
            addToast("Feedback sent!", "success");
            setFeedbackMessage("");
        } catch (error) {
            console.error(error);
            addToast("Failed to send feedback.", "error");
        }
    };

    if (authLoading || loading) return (
        <div className="max-w-4xl mx-auto p-4">
            <LoadingSkeleton />
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text mb-2">
                        Trainer Dashboard
                    </h1>
                    <p className="text-gray-400">Monitor trainee progress and stats.</p>
                </div>
                <button
                    onClick={() => setIsAddingStudent(true)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                    + Add Student
                </button>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {trainees.map((trainee) => (
                    <div
                        key={trainee.id}
                        onClick={() => handleViewTrainee(trainee)}
                        className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300 pointer-events-none" />
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {trainee.displayName?.charAt(0) || "?"}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors">{trainee.displayName}</h3>
                                <p className="text-sm text-gray-400">{trainee.email}</p>
                            </div>
                        </div>
                        <div className="space-y-2 relative z-10">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Status</span>
                                <span className="text-green-400 font-medium">Active</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Joined</span>
                                <span className="text-gray-300">
                                    {trainee.createdAt?.seconds ? new Date(trainee.createdAt.seconds * 1000).toLocaleDateString() : "Unknown"}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {trainees.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-white/10 rounded-2xl">
                        No trainees assigned to you yet. Click "Add Student" to find some!
                    </div>
                )}
            </div>

            {/* Add Student Modal */}
            {isAddingStudent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Add Student</h2>
                            <button onClick={() => setIsAddingStudent(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">Select a trainee who doesn't have a trainer yet.</p>

                        <div className="overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {unassignedTrainees.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/20 transition-colors">
                                    <div className="truncate mr-4">
                                        <div className="font-bold">{u.displayName}</div>
                                        <div className="text-xs text-gray-400">{u.email}</div>
                                    </div>
                                    <button
                                        onClick={() => handleClaimTrainee(u.id)}
                                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs font-medium whitespace-nowrap"
                                    >
                                        Add +
                                    </button>
                                </div>
                            ))}
                            {unassignedTrainees.length === 0 && (
                                <div className="text-center text-gray-500 py-4">No unassigned trainees found.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Trainee Details Modal */}
            {selectedTrainee && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedTrainee(null);
                }}>
                    <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-white">{selectedTrainee.displayName}</h2>
                                <p className="text-gray-400 text-sm">{selectedTrainee.email}</p>
                            </div>
                            <button onClick={() => setSelectedTrainee(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                <h3 className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Active Plans</h3>
                                <p className="text-3xl font-bold text-blue-400">{traineeStats ? traineeStats.activePlans : "..."}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                <h3 className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Completed</h3>
                                <p className="text-3xl font-bold text-emerald-400">{traineeStats ? traineeStats.completedWorkouts : "..."}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSendFeedback} className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <h3 className="font-bold text-white mb-2 text-sm uppercase tracking-wider">Send Feedback</h3>
                            <textarea
                                value={feedbackMessage}
                                onChange={(e) => setFeedbackMessage(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white h-24 mb-3 resize-none"
                                placeholder={`Write a message for ${selectedTrainee.displayName}...`}
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Send Message
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
