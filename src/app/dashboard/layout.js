
"use client";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/");
            } else if (!profile && window.location.pathname !== "/onboarding") {
                // Redirect to onboarding if we have a user but no profile
                router.push("/onboarding");
            }
        }
    }, [user, profile, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <>
            {children}
        </>
    );
}
