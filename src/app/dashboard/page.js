"use client";
import { useAuth } from "../../context/AuthContext";
import { getStats, subscribeToFeedback, deleteFeedback, getCompletionHistory, subscribeToUserWorkouts, getAllUsers, updateUser, sendFeedback, markMessagesAsRead, subscribeToExercises, deleteWorkout } from "../../lib/firebase/services";
import Link from "next/link";
import StatsChart from "../../components/StatsChart";
import AdminStatsChart from "../../components/AdminStatsChart";
import { useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { getDifficultyColor } from "../../lib/utils";

export default function DashboardPage() {
    const { user, profile } = useAuth();
    const { addToast } = useToast();

    // Joint State
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState([]);

    // Trainee State
    const [stats, setStats] = useState({ activePlans: 0, completedWorkouts: 0 });
    const [activeWorkouts, setActiveWorkouts] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [messageInput, setMessageInput] = useState("");

    // Trainer/Admin State
    const [trainees, setTrainees] = useState([]); // Used for list view
    const [allUsersCount, setAllUsersCount] = useState({ trainees: 0, trainers: 0 }); // For Admin Chart
    const [unassignedTrainees, setUnassignedTrainees] = useState([]);
    const [selectedTrainee, setSelectedTrainee] = useState(null);
    const [traineeStats, setTraineeStats] = useState(null);
    const [traineeWorkouts, setTraineeWorkouts] = useState([]);
    const [traineeTab, setTraineeTab] = useState('active');
    const [traineeHistory, setTraineeHistory] = useState([]);
    const [viewingWorkout, setViewingWorkout] = useState(null);
    const [viewingWorkoutExercises, setViewingWorkoutExercises] = useState([]);
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [chatMessage, setChatMessage] = useState("");

    useEffect(() => {
        if (!user || !profile) return;

        setLoading(true);

        // 1. Subscribe to Feedback (All Roles)
        const unsubFeedback = subscribeToFeedback(user.uid, profile.role, (data) => {
            setFeedback(data);
        });

        // 2. Role-Specific Data Fetching
        const loadRoleData = async () => {
            if (profile.role === "trainee") {
                getStats(user.uid).then(setStats);
                getCompletionHistory(user.uid).then(setRecentActivity);
                const unsubWorkouts = subscribeToUserWorkouts(user.uid, (data) => {
                    setActiveWorkouts(data.slice(0, 3));
                });
                return () => unsubWorkouts();
            } else if (profile.role === "trainer") {
                await fetchTrainerData();
            } else if (profile.role === "admin") {
                await fetchAdminData();
            }
        };

        const cleanupPromise = loadRoleData();

        setLoading(false);

        return () => {
            unsubFeedback();
            // cleanupPromise is async, so we can't easily sync wait for unsubWorkouts here without more complex logic
        };
    }, [user, profile]);

    // Effect to handle Trainee Selection (Mark Read + Fetch Workouts)
    useEffect(() => {
        let unsubWorkouts;
        if (selectedTrainee && user) {
            // 1. Mark messages as read
            markMessagesAsRead(user.uid, selectedTrainee.id).catch(console.error);

            // 2. Fetch stats
            getStats(selectedTrainee.id).then(setTraineeStats).catch(console.error);

            // 3. Subscribe to their workouts
            unsubWorkouts = subscribeToUserWorkouts(selectedTrainee.id, (data) => {
                setTraineeWorkouts(data);
            });

            // 4. Fetch Completion History
            getCompletionHistory(selectedTrainee.id).then(setTraineeHistory).catch(console.error);
            setTraineeTab('active'); // Reset tab to active by default
        }
        return () => {
            if (unsubWorkouts) unsubWorkouts();
        };
    }, [selectedTrainee, user]);

    // NEW Effect: Fetch Exercises when Viewing a Workout
    useEffect(() => {
        let unsubExercises;
        if (viewingWorkout) {
            unsubExercises = subscribeToExercises(viewingWorkout.id, (data) => {
                setViewingWorkoutExercises(data);
            });
        }
        return () => {
            if (unsubExercises) unsubExercises();
            setViewingWorkoutExercises([]); // Clear on close
        };
    }, [viewingWorkout]);


    // --- Trainer Helpers ---
    const fetchTrainerData = async () => {
        const allUsers = await getAllUsers();
        // Trainer sees only THEIR assigned trainees (or all for admin, but we separate admin now)
        const myTrainees = allUsers.filter(u => u.role === "trainee" && u.trainerId === user.uid);
        const unassigned = allUsers.filter(u => u.role === "trainee" && !u.trainerId);
        setTrainees(myTrainees);
        setUnassignedTrainees(unassigned);
    };

    const fetchAdminData = async () => {
        const allUsers = await getAllUsers();
        // Admin sees ALL users
        setTrainees(allUsers); // Reusing 'trainees' state as 'usersList' to save refactor time
        const traineeCount = allUsers.filter(u => u.role === "trainee").length;
        const trainerCount = allUsers.filter(u => u.role === "trainer").length;
        setAllUsersCount({ trainees: traineeCount, trainers: trainerCount });
    };

    const handleDeleteTraineeWorkout = async (workoutId) => {
        if (!confirm("Are you sure you want to delete this workout? This cannot be undone.")) return;
        try {
            await deleteWorkout(workoutId);
            addToast("Workout deleted by Admin.", "success");
            // Workouts will auto-update via subscription
        } catch (error) {
            console.error("Error deleting workout:", error);
            addToast("Failed to delete workout.", "error");
        }
    };

    const handleClaimTrainee = async (traineeId) => {
        try {
            await updateUser(traineeId, { trainerId: user.uid });
            addToast("Student added to your roster!", "success");
            setIsAddingStudent(false);
            fetchTrainerData();
        } catch (error) {
            console.error(error);
            addToast("Failed to add student.", "error");
        }
    };

    const handleViewTrainee = (trainee) => {
        setSelectedTrainee(trainee);
        setTraineeStats(null); // Reset
        setTraineeWorkouts([]); // Reset
    };

    const sendMessage = async (recipientId, text, asTrainer = false) => {
        if (!text.trim()) return;
        try {
            // If trainer sending: trainerId = user.uid, traineeId = recipientId
            // If trainee sending: trainerId = profile.trainerId, traineeId = user.uid

            let tId, trId;
            if (asTrainer) {
                trId = user.uid;
                tId = recipientId;
            } else {
                trId = profile.trainerId;
                tId = user.uid;
                if (!trId) { // Should not happen if UI is correct
                    addToast("You don't have a trainer assigned.", "error");
                    return;
                }
            }

            await sendFeedback(trId, tId, text, user.uid);
            // Optimistic UI update handled by subscription
            if (asTrainer) setChatMessage(""); else setMessageInput("");
        } catch (error) {
            console.error(error);
            addToast("Failed to send.", "error");
        }
    };

    const handleDismissFeedback = async (id) => {
        try {
            await deleteFeedback(id);
            addToast("Dismissed.", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed.", "error");
        }
    };

    // Filter messages for the specific chat view
    const getChatHistory = (targetUserId) => {
        // Find messages between current user and target
        return feedback.filter(m =>
            (m.trainerId === user.uid && m.traineeId === targetUserId) ||
            (m.trainerId === targetUserId && m.traineeId === user.uid) || // handle admin/other cases
            (m.traineeId === targetUserId || m.traineeId === user.uid) // simplified logic for relevant messages
        ).filter(m =>
            // Exact match for this pair
            (m.traineeId === targetUserId && m.trainerId === user.uid) ||
            (m.traineeId === user.uid && m.trainerId === targetUserId) ||
            (profile.role === 'admin' && m.traineeId === targetUserId) // Admin sees all for that trainee
        );
    };


    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    // --- RENDER TRAINEE DASHBOARD ---
    if (profile?.role === "trainee") {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                <header>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text mb-2">
                        Welcome back, {user?.displayName}!
                    </h1>
                    <p className="text-gray-400">Here's your fitness overview today.</p>
                </header>

                <StatsChart active={stats.activePlans} completed={stats.completedWorkouts} />

                {/* Trainer Communication Area */}
                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 p-6 rounded-2xl flex flex-col h-[500px]">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 flex-shrink-0">
                        💬 Chat with Trainer
                    </h3>

                    {/* Chat History */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mb-4 space-y-4 flex flex-col-reverse">
                        {feedback.length > 0 ? (
                            feedback.map((msg) => {
                                const isMe = msg.senderId === user.uid;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-xl relative group ${isMe
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-slate-700/80 text-gray-200 rounded-bl-none'
                                            }`}>
                                            <p className="text-sm">{msg.message}</p>
                                            <div className="text-[10px] opacity-70 mt-1 text-right flex justify-end items-center gap-2">
                                                <span>{msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}</span>
                                                {!isMe && (
                                                    <button
                                                        onClick={() => handleDismissFeedback(msg.id)}
                                                        className="opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity"
                                                        title="Dismiss message"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center text-gray-500 italic my-auto">
                                No messages yet. Start the conversation!
                            </div>
                        )}
                    </div>

                    {/* Send Message */}
                    <div className="flex-shrink-0 pt-4 border-t border-white/10">
                        {profile.trainerId ? (
                            <form onSubmit={(e) => { e.preventDefault(); sendMessage(profile.trainerId, messageInput, false); }} className="flex gap-2">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!messageInput.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Send
                                </button>
                            </form>
                        ) : (
                            <div className="text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded-lg text-center border border-yellow-500/20">
                                You don't have a trainer assigned yet.
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Recent Activity */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">📊</span><h3 className="font-bold text-white">Recent Activity</h3>
                        </div>
                        {recentActivity.length > 0 ? (
                            <div className="space-y-3">
                                {recentActivity.map((activity) => (
                                    <div key={activity.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0">
                                        <span className="text-gray-300">{activity.workoutName || "Unknown"}</span>
                                        <span className="text-gray-500 text-xs">{activity.completedAt?.seconds ? new Date(activity.completedAt.seconds * 1000).toLocaleDateString() : "-"}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-gray-500 text-sm italic">No recent activity.</div>}
                    </div>
                    {/* Schedule */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">📅</span><h3 className="font-bold text-white">Your Plans</h3>
                        </div>
                        {activeWorkouts.length > 0 ? (
                            <div className="space-y-3">
                                {activeWorkouts.map((plan) => (
                                    <Link href={`/dashboard/workouts/${plan.id}`} key={plan.id} className="block group">
                                        <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg group-hover:bg-black/40 transition-colors">
                                            <div>
                                                <div className="font-medium text-blue-300">{plan.name}</div>
                                                <div className="text-xs text-gray-500">{plan.difficulty || "Beginner"}</div>
                                            </div>
                                            <span className="text-gray-400">→</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm italic">
                                No active plans. <Link href="/dashboard/community" className="text-blue-400">Find one?</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER ADMIN DASHBOARD ---
    if (profile?.role === "admin") {
        const adminChatHistory = selectedTrainee ? feedback.filter(m => m.traineeId === selectedTrainee.id || m.senderId === selectedTrainee.id) : [];

        return (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
                <header>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 text-transparent bg-clip-text mb-2">
                        Admin Console
                    </h1>
                    <p className="text-gray-400">System overview and user management.</p>
                </header>

                {/* Admin Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">User Distribution</h3>
                        <div className="flex gap-8">
                            <div>
                                <div className="text-3xl font-bold text-blue-400">{allUsersCount.trainees}</div>
                                <div className="text-sm text-gray-400 uppercase tracking-wider">Trainees</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-purple-400">{allUsersCount.trainers}</div>
                                <div className="text-sm text-gray-400 uppercase tracking-wider">Trainers</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <AdminStatsChart trainees={allUsersCount.trainees} trainers={allUsersCount.trainers} />
                    </div>
                </div>

                {/* User Management Grid */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Manage Users</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {trainees.map((u) => (
                            <div
                                key={u.id}
                                onClick={() => handleViewTrainee(u)}
                                className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${u.role === 'trainer' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                                        {u.displayName?.charAt(0) || "?"}
                                    </div>
                                    <div className="truncate">
                                        <div className="font-bold text-white truncate max-w-[150px]">{u.displayName}</div>
                                        <div className="text-xs text-gray-400">{u.email}</div>
                                    </div>
                                </div>
                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${u.role === 'trainer' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : 'border-blue-500/30 text-blue-400 bg-blue-500/10'}`}>
                                    {u.role}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Admin Enhanced User Modal */}
                {selectedTrainee && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-red-900/10">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-white">{selectedTrainee.displayName}</h2>
                                        <span className="text-xs border border-white/20 px-2 py-0.5 rounded uppercase text-gray-400">{selectedTrainee.role}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{selectedTrainee.email}</p>
                                </div>
                                <button onClick={() => { setSelectedTrainee(null); setViewingWorkoutExercises([]); }} className="text-gray-400 hover:text-white text-2xl">✕</button>
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                                {/* Left: Workouts Manager */}
                                <div className="w-full md:w-1/2 p-6 border-r border-white/10 overflow-y-auto custom-scrollbar bg-black/10">
                                    <h3 className="font-bold text-white mb-4 uppercase text-xs tracking-wider opacity-70 flex items-center gap-2">
                                        Workout Management <span className="bg-white/10 text-white rounded-full px-2 py-0.5 text-[10px]">{traineeWorkouts.length}</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {traineeWorkouts.length > 0 ? (
                                            traineeWorkouts.map(w => (
                                                <div key={w.id} className="bg-white/5 p-3 rounded-lg border border-white/5 group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="font-medium text-white">{w.name}</div>
                                                            <div className={`text-[10px] inline-block px-1.5 py-0.5 rounded mt-1 bg-black/20 text-gray-400`}>
                                                                {w.difficulty}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteTraineeWorkout(w.id); }}
                                                            className="text-red-400 hover:bg-red-500/20 p-2 rounded transition-colors text-xs uppercase font-bold"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-mono">{w.id}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-gray-500 italic text-sm">No workouts found for this user.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Chat Conversations */}
                                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                                    <h3 className="font-bold text-white mb-4 uppercase text-xs tracking-wider opacity-70">Conversations</h3>

                                    {(() => {
                                        // 1. Get all messages involving selected user
                                        const relevantMessages = feedback.filter(m => m.traineeId === selectedTrainee.id || m.trainerId === selectedTrainee.id);

                                        // 2. Group by "Other Person"
                                        const conversations = {};
                                        relevantMessages.forEach(msg => {
                                            const otherId = msg.traineeId === selectedTrainee.id ? msg.trainerId : msg.traineeId;
                                            if (!conversations[otherId]) conversations[otherId] = [];
                                            conversations[otherId].push(msg);
                                        });

                                        const conversationKeys = Object.keys(conversations);

                                        // State for selected conversation view (using local var logic for simplicity in this render block, 
                                        // but ideally we'd need state. Since we can't add state easily inside conditional return blocks without hook errors, 
                                        // we will use a sub-component or just render the list if no specific state.
                                        // Wait, I can't add 'const [viewChatId, setViewChatId] = useState' here.
                                        // I need to use an existing state variable or add one to the top level.
                                        // I'll assume I can use 'viewingWorkout' as a hack or better, simply add 'viewingChatId' to main component state 
                                        // in next step if needed. For now, I'll render the list, and if list has only 1, auto-show? 
                                        // actually, I'll use 'viewingWorkoutExercises' as a hack storage for chat ID? No that's messy.
                                        // I will add a new state variable in a separate tool call before this one to be safe? 
                                        // proper way: I'll modify the top first.

                                        // ACTUALLY, I can't modify top level inside this replace block. 
                                        // I will use 'viewingWorkout' state to store the OTHER USER ID for the chat view.
                                        // When clicking a user card, setViewingWorkout({ id: otherUserId, type: 'chat_partner' }).

                                        const activeChatPartnerId = viewingWorkout?.type === 'chat_partner' ? viewingWorkout.id : null;

                                        if (activeChatPartnerId) {
                                            const chatMsgs = conversations[activeChatPartnerId] || [];
                                            const partner = trainees.find(u => u.id === activeChatPartnerId);

                                            return (
                                                <div className="flex-1 flex flex-col bg-slate-900/50 rounded-xl overflow-hidden border border-white/5">
                                                    <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                                                        <span className="font-bold text-white">Chat with {partner?.displayName || "Unknown User"}</span>
                                                        <button onClick={() => setViewingWorkout(null)} className="text-gray-400 hover:text-white text-xs">Back to list</button>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col-reverse space-y-4 space-y-reverse">
                                                        {chatMsgs.map(m => (
                                                            <div key={m.id} className={`flex ${m.senderId === selectedTrainee.id ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`max-w-[85%] p-2 rounded-lg text-xs ${m.senderId === selectedTrainee.id ? 'bg-blue-600/40 text-blue-100' : 'bg-purple-600/40 text-purple-100'}`}>
                                                                    <div className="font-bold mb-0.5 opacity-75 text-[10px]">{m.senderId === selectedTrainee.id ? selectedTrainee.displayName : (partner?.displayName || "Partner")}</div>
                                                                    {m.message}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1">
                                                {conversationKeys.length > 0 ? (
                                                    conversationKeys.map(partnerId => {
                                                        const partner = trainees.find(u => u.id === partnerId);
                                                        const msgs = conversations[partnerId];
                                                        const lastMsg = msgs[0]; // Sorted by newest
                                                        return (
                                                            <div
                                                                key={partnerId}
                                                                onClick={() => setViewingWorkout({ id: partnerId, type: 'chat_partner' })}
                                                                className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 cursor-pointer transition-colors group"
                                                            >
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <div className="font-bold text-white">{partner?.displayName || "Unknown User"}</div>
                                                                    <div className="text-[10px] text-gray-500">{new Date(lastMsg?.createdAt?.seconds * 1000).toLocaleDateString()}</div>
                                                                </div>
                                                                <div className="text-xs text-gray-400 truncate group-hover:text-gray-300">
                                                                    <span className={lastMsg.senderId === selectedTrainee.id ? "text-blue-400" : "text-purple-400"}>
                                                                        {lastMsg.senderId === selectedTrainee.id ? "You: " : "Them: "}
                                                                    </span>
                                                                    {lastMsg.message}
                                                                </div>
                                                                <div className="text-[10px] text-gray-600 mt-2 text-right">{msgs.length} messages</div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="text-gray-500 italic text-sm text-center py-8">No conversation history found.</div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- RENDER TRAINER DASHBOARD ---
    const chatHistory = selectedTrainee ? feedback.filter(m =>
        (m.traineeId === selectedTrainee.id && m.trainerId === user.uid) ||
        (m.traineeId === selectedTrainee.id && profile.role === 'admin') // simplified
    ) : [];

    // Only count UNREAD messages where sender is NOT the trainer (so, sent by trainee)
    const newMessagesCount = feedback.filter(m => m.trainerId === user.uid && m.senderId !== user.uid && !m.read).length;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text mb-2">
                        Trainer Dashboard
                    </h1>
                    <p className="text-gray-400">Overview of your {trainees.length} students and their progress.</p>
                </div>
                <button
                    onClick={() => setIsAddingStudent(true)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                    + Add Student
                </button>
            </header>

            {/* Analytics Rows */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-400/10 border border-blue-500/20 p-6 rounded-2xl">
                    <h3 className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-2">Total Students</h3>
                    <p className="text-4xl font-bold text-white">{trainees.length}</p>
                </div>

                <div className="bg-gradient-to-br from-green-600/10 to-green-400/10 border border-green-500/20 p-6 rounded-2xl relative overflow-hidden">
                    <h3 className="text-green-400 text-sm font-bold uppercase tracking-wider mb-2">New Messages</h3>
                    <p className="text-4xl font-bold text-white">{newMessagesCount}</p>
                    {newMessagesCount > 0 && (
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="text-9xl">🔔</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Student Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {trainees.map((trainee) => {
                    const hasUnread = feedback.some(m => m.traineeId === trainee.id && m.senderId !== user.uid && !m.read);
                    return (
                        <div
                            key={trainee.id}
                            onClick={() => handleViewTrainee(trainee)}
                            className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group relative"
                        >
                            {hasUnread && (
                                <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" title="New messages"></div>
                            )}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-lg">
                                    {trainee.displayName?.charAt(0) || "?"}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors">{trainee.displayName}</h3>
                                    <p className="text-sm text-gray-400">{trainee.email}</p>
                                </div>
                            </div>
                            <div className="text-xs text-right text-purple-400 font-medium group-hover:underline">View Details & Chat →</div>
                        </div>
                    );
                })}
                {trainees.length === 0 && (
                    <div className="col-span-full text-center py-16 text-gray-500 border-2 border-dashed border-white/10 rounded-2xl">
                        No students yet. Start by adding one!
                    </div>
                )}
            </div>

            {/* Add Student Modal */}
            {isAddingStudent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Add Student</h2>
                            <button onClick={() => setIsAddingStudent(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {unassignedTrainees.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                    <div className="truncate mr-4 flex-1">
                                        <div className="font-bold text-sm">{u.displayName}</div>
                                        <div className="text-xs text-gray-400">{u.email}</div>
                                    </div>
                                    <button onClick={() => handleClaimTrainee(u.id)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">Add +</button>
                                </div>
                            ))}
                            {unassignedTrainees.length === 0 && <p className="text-gray-500 text-center">No unassigned students.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Student Details & Chat Modal */}
            {selectedTrainee && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedTrainee(null);
                }}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedTrainee.displayName}</h2>
                                <p className="text-gray-400 text-sm">{selectedTrainee.email}</p>
                            </div>
                            <button onClick={() => setSelectedTrainee(null)} className="text-gray-400 hover:text-white text-2xl">✕</button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Left Column: Info & Stats */}
                            <div className="w-full md:w-1/3 p-6 border-r border-white/10 overflow-y-auto custom-scrollbar bg-black/10">
                                <h3 className="font-bold text-white mb-4 uppercase text-xs tracking-wider opacity-70">Progress Stats</h3>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button
                                        onClick={() => setTraineeTab('active')}
                                        className={`p-3 rounded-xl text-center border transition-all ${traineeTab === 'active' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}
                                    >
                                        <div className="text-xs mb-1 opacity-70">Active</div>
                                        <div className={`text-xl font-bold ${traineeTab === 'active' ? 'text-blue-400' : 'text-gray-300'}`}>{traineeStats ? traineeStats.activePlans : "-"}</div>
                                    </button>
                                    <button
                                        onClick={() => setTraineeTab('completed')}
                                        className={`p-3 rounded-xl text-center border transition-all ${traineeTab === 'completed' ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}
                                    >
                                        <div className="text-xs mb-1 opacity-70">Done</div>
                                        <div className={`text-xl font-bold ${traineeTab === 'completed' ? 'text-emerald-400' : 'text-gray-300'}`}>{traineeStats ? traineeStats.completedWorkouts : "-"}</div>
                                    </button>
                                </div>

                                <h3 className="font-bold text-white mb-4 uppercase text-xs tracking-wider opacity-70">
                                    {traineeTab === 'active' ? 'Active Workouts' : 'Completed History'}
                                </h3>
                                <div className="space-y-2">
                                    {traineeTab === 'active' ? (
                                        traineeWorkouts.length > 0 ? (
                                            traineeWorkouts.map(w => (
                                                <div
                                                    key={w.id}
                                                    onClick={() => setViewingWorkout(w)}
                                                    className="text-sm bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 visited:bg-white/5 cursor-pointer transition-colors group"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="font-medium text-gray-200 group-hover:text-blue-300 transition-colors">{w.name}</div>
                                                        <span className="text-gray-500 text-xs">ℹ️</span>
                                                    </div>
                                                    <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${getDifficultyColor(w.difficulty)}`}>
                                                        {w.difficulty || 'Beginner'}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-gray-500 italic">No active workouts assigned.</div>
                                        )
                                    ) : (
                                        // Completed List
                                        traineeHistory.length > 0 ? (
                                            traineeHistory.map(h => (
                                                <div key={h.id} className="bg-emerald-900/10 border border-emerald-500/20 p-3 rounded-lg">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="font-bold text-emerald-400 text-sm">{h.workoutName}</div>
                                                            <div className="text-[10px] text-gray-500">
                                                                {h.completedAt?.seconds ? new Date(h.completedAt.seconds * 1000).toLocaleDateString() : 'Unknown date'}
                                                            </div>
                                                        </div>
                                                        <div className="text-emerald-500 text-xs">✓</div>
                                                    </div>
                                                    {/* If exercises snapshot exists, show simple summary */}
                                                    {h.exercises && h.exercises.length > 0 ? (
                                                        <div className="mt-2 text-[10px] bg-black/20 p-2 rounded text-gray-400 space-y-1">
                                                            {h.exercises.map((ex, i) => (
                                                                <div key={i} className="flex justify-between">
                                                                    <span>{ex.name}</span>
                                                                    <span className="font-mono opacity-70">{ex.sets}x{ex.reps} {ex.weight}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-gray-600 italic mt-1">Details not available for older records.</div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-gray-500 italic">No completed workouts yet.</div>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Chat */}
                            <div className="flex-1 flex flex-col bg-slate-900/50">
                                <div className="p-4 border-b border-white/5 bg-white/5">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        💬 Conversation
                                        <span className="text-xs font-normal text-gray-400 ml-auto">
                                            {/* Could show 'Active now' status later */}
                                        </span>
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col-reverse space-y-4 space-y-reverse">
                                    {chatHistory.length > 0 ? (
                                        chatHistory.map(msg => (
                                            <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] p-3 rounded-xl ${msg.senderId === user.uid ? 'bg-purple-600/80 text-white rounded-br-none' : 'bg-white/10 text-gray-200 rounded-bl-none'}`}>
                                                    <p className="text-sm">{msg.message}</p>
                                                    <div className="text-[10px] opacity-50 mt-1 text-right">
                                                        {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-gray-500 py-8 italic my-auto">No messages yet. Start the conversation!</div>
                                    )}
                                </div>
                                <div className="p-4 bg-black/20 border-t border-white/10">
                                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(selectedTrainee.id, chatMessage, true); }} className="flex gap-2">
                                        <input
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                            placeholder="Type a message..."
                                            value={chatMessage}
                                            onChange={(e) => setChatMessage(e.target.value)}
                                        />
                                        <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold transition-colors">Send</button>
                                    </form>
                                </div>
                            </div>
                        </div>

                        {/* NESTED MODAL: Workout Details (Only if NOT looking at a chat) */}
                        {viewingWorkout && viewingWorkout.type !== 'chat_partner' && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[60] animate-in fade-in duration-200">
                                <div className="bg-slate-900 border border-white/20 shadow-2xl rounded-2xl w-full max-w-lg max-h-full flex flex-col">
                                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{viewingWorkout.name}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getDifficultyColor(viewingWorkout.difficulty)}`}>{viewingWorkout.difficulty || "General"}</span>
                                        </div>
                                        <button onClick={() => setViewingWorkout(null)} className="text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                                        {viewingWorkoutExercises.length > 0 ? (
                                            viewingWorkoutExercises.map((ex, idx) => (
                                                <div key={ex.id || idx} className="bg-black/20 rounded-xl p-4 border border-white/5 flex justify-between items-center group hover:bg-black/30 transition-colors">
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded">#{idx + 1}</span>
                                                            <h4 className="font-bold text-gray-200 text-sm">{ex.name}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-white font-mono text-sm font-bold">{ex.sets} x {ex.reps}</div>
                                                        {ex.weight && <div className="text-xs text-gray-500">{ex.weight}</div>}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-gray-500 italic text-center py-8">
                                                No exercises found for this workout.
                                                <br />
                                                <span className="text-xs opacity-50">(They might be loading or empty)</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-white/10 bg-white/5 rounded-b-2xl">
                                        <p className="text-xs text-gray-500 text-center">Viewing as Trainer • Read Only</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

