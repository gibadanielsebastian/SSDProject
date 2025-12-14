"use client";
export default function StatsChart({ active, completed }) {
    const total = active + completed;
    const activePercent = total > 0 ? (active / total) * 100 : 0;
    const completedPercent = total > 0 ? (completed / total) * 100 : 0;

    // Donut chart calculations
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const activeDash = (activePercent / 100) * circumference;
    const completedDash = (completedPercent / 100) * circumference;

    return (
        <div className="flex flex-col sm:flex-row items-center gap-8 bg-white/5 border border-white/10 p-6 rounded-2xl">
            {/* Donut Chart */}
            <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#1e293b" // slate-800
                        strokeWidth="12"
                    />
                    {total > 0 && (
                        <>
                            {/* Active Segment */}
                            <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="transparent"
                                stroke="#3b82f6" // blue-500
                                strokeWidth="12"
                                strokeDasharray={`${activeDash} ${circumference}`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                            {/* Completed Segment (Offset by active) */}
                            <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="transparent"
                                stroke="#10b981" // emerald-500
                                strokeWidth="12"
                                strokeDasharray={`${completedDash} ${circumference}`}
                                strokeDashoffset={-activeDash}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </>
                    )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{total}</span>
                    <span className="text-xs text-gray-400 uppercase">Total</span>
                </div>
            </div>

            {/* Legend / Stats */}
            <div className="flex-1 w-full space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span className="text-gray-300">Active Plans</span>
                    </div>
                    <span className="text-xl font-bold text-white">{active}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span className="text-gray-300">Completed</span>
                    </div>
                    <span className="text-xl font-bold text-white">{completed}</span>
                </div>
            </div>
        </div>
    );
}
