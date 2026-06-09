import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLANKR — Clanker Creator Index",
  description: "Check token deployer reputation across launchpads. Rug scores, deployment history, and trust verdicts for every token creator.",
  openGraph: {
    title: "CLANKR — Clanker Creator Index",
    description: "Check token deployer reputation before you buy. Rug scores for every Clanker creator.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0f] text-white antialiased min-h-screen">
        <nav className="border-b border-white/10 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="/" className="text-2xl font-bold tracking-tight">
              <span className="text-purple-400">RUGRAG</span>
            </a>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="/" className="hover:text-white transition">Search</a>
              <a href="/leaderboard" className="hover:text-white transition">Leaderboard</a>
              <a href="/docs" className="hover:text-white transition">API</a>
              <a
                href="https://github.com/ragna999/clankr"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition"
              >
                GitHub
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-white/10 px-6 py-6 mt-16">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-500">
            <span>RUGRAG — Token Creator Index</span>
            <span>Built on Base • Powered by Clanker</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
