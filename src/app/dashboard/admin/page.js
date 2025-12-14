"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getAllUsers, updateUser } from "../../../lib/firebase/services";
import { useRouter } from "next/navigation";
import LoadingSkeleton from "../../../components/LoadingSkeleton";
import { useToast } from "../../../context/ToastContext";

export default function AdminPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [editingUser, setEditingUser] = useState(null);
    const [trainers, setTrainers] = useState([]);
    const [formData, setFormData] = useState({ role: "trainee", trainerId: "" });
    const { addToast } = useToast();

    const fetchData = async () => {
        const allUsers = await getAllUsers();
        // Convert timestamp to date for sorting
        allUsers.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
        setUsers(allUsers);
        setTrainers(allUsers.filter(u => u.role === 'trainer'));
        setLoading(false);
    };

    useEffect(() => {
        if (!authLoading) {
            if (!user || profile?.role !== "admin") {
                router.push("/dashboard");
                return;
            }
            fetchData();
        }
    }, [user, profile, authLoading, router]);

    const handleEditClick = (u) => {
        setEditingUser(u);
        setFormData({ role: u.role, trainerId: u.trainerId || "" });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            await updateUser(editingUser.id, formData);
            addToast("User updated successfully!", "success");
            setEditingUser(null);
            fetchData(); // Refresh list
        } catch (error) {
            console.error(error);
            addToast("Failed to update user.", "error");
        }
    };

    if (authLoading || loading) return (
        <div className="max-w-4xl mx-auto p-4">
            <LoadingSkeleton />
        </div>
    );

    if (profile?.role !== "admin") return null;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 text-transparent bg-clip-text mb-2">
                    Admin Dashboard
                </h1>
                <p className="text-gray-400">View and manage all registered users.</p>
            </header>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="p-4 text-gray-300 font-medium">User</th>
                            <th className="p-4 text-gray-300 font-medium">Role</th>
                            <th className="p-4 text-gray-300 font-medium">Trainer</th>
                            <th className="p-4 text-gray-300 font-medium">Joined</th>
                            <th className="p-4 text-gray-300 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {users.map((u) => {
                            const assignedTrainer = trainers.find(t => t.id === u.trainerId);
                            return (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-white">{u.displayName}</div>
                                        <div className="text-sm text-gray-400">{u.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`capitalize px-2 py-1 rounded text-xs font-medium border ${u.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' : u.role === 'trainer' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">
                                        {assignedTrainer ? (
                                            <span className="text-purple-300">{assignedTrainer.displayName}</span>
                                        ) : (
                                            <span className="opacity-50">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">
                                        {u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : "Unknown"}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleEditClick(u)}
                                            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleSave} className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">Edit User: {editingUser.displayName}</h2>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                >
                                    <option value="trainee">Trainee</option>
                                    <option value="trainer">Trainer</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {formData.role === "trainee" && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-300">Assign Trainer</label>
                                    <select
                                        value={formData.trainerId}
                                        onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                    >
                                        <option value="">-- No Trainer --</option>
                                        {trainers.map(t => (
                                            <option key={t.id} value={t.id}>{t.displayName}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
