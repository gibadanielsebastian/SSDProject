import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import Navbar from "../components/Navbar";
import "./globals.css";

export const metadata = {
  title: "FITUP - Workout Planner",
  description: "Track your fitness journey",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-200 min-h-screen">
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <main className="container mx-auto px-4 py-8 pt-24">
              {children}
            </main>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
