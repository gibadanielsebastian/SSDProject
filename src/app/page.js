
import Navbar from "../components/Navbar";
import Link from "next/link";

export default function Home() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-8 pb-20 pt-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
			<Navbar />

			<main className="flex flex-col gap-8 row-start-2 items-center text-center mt-20">
				<h1 className="text-6xl md:text-8xl font-bold tracking-tighter">
					Level Up Your
					<span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
						Fitness Journey
					</span>
				</h1>

				<p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">
					The ultimate platform for efficient workout planning, tracking, and trainer connection.
				</p>

				<div className="flex gap-4 items-center flex-col sm:flex-row">
					<Link
						className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 text-lg sm:text-xl h-12 sm:h-14 px-8 sm:px-10 font-bold"
						href="/dashboard"
					>
						Start Training Now
					</Link>
					<Link
						className="rounded-full border border-solid border-white/[.15] transition-colors flex items-center justify-center hover:bg-white/10 hover:text-white text-lg sm:text-xl h-12 sm:h-14 px-8 sm:px-10"
						href="#features"
					>
						Learn More
					</Link>
				</div>
			</main>

			<div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 w-full max-w-6xl">
				<div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors">
					<h3 className="text-2xl font-bold mb-4">Plan</h3>
					<p className="text-gray-400">Create custom workout routines tailored to your goals.</p>
				</div>
				<div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors">
					<h3 className="text-2xl font-bold mb-4">Track</h3>
					<p className="text-gray-400">Log your progress and analyze your performance over time.</p>
				</div>
				<div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-colors">
					<h3 className="text-2xl font-bold mb-4">Connect</h3>
					<p className="text-gray-400">Collaborate with trainers and get professional feedback.</p>
				</div>
			</div>
		</div>
	);
}
