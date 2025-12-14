export default function LoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/5 rounded-lg w-1/3"></div>
            <div className="h-32 bg-white/5 rounded-xl"></div>
            <div className="space-y-2">
                <div className="h-16 bg-white/5 rounded-xl"></div>
                <div className="h-16 bg-white/5 rounded-xl"></div>
                <div className="h-16 bg-white/5 rounded-xl"></div>
            </div>
        </div>
    );
}
