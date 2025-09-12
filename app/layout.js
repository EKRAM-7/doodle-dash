import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata = {
	title: "Doodle Dash by Ikram",
	description: "A Fun Game to play with friends",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased h-svh bg-gray-300 flex justify-center items-center`}
			>
				{/* <div className="relative h-screen w-screen bg-gray-900 overflow-hidden flex items-center justify-center">


					<div className="absolute w-24 h-24 bg-pink-500 rounded-full opacity-30 animate-bubble1"></div>

					<div className="absolute w-32 h-32 bg-blue-500 rounded-full opacity-30 animate-bubble2"></div>

					<div className="absolute w-16 h-16 bg-green-500 rounded-full opacity-30 animate-bubble3"></div>
					{children}
				</div> */}

				<div className="h-screen w-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
					

					<div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-radial opacity-40 blur-3xl animate-pulse z-0"
     style={{ background: "radial-gradient(circle, #ec4899 0%, #a78bfa 60%, transparent 100%)" }}>
</div>
			  	{children}
				</div>

			</body>
		</html>
	);
}
