import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Docs — RUGRAG',
  description: 'Free API for Clanker token creator analysis. Agent-friendly, no auth required.',
};

export default function DocsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">API Documentation</h1>
      <p className="text-gray-400 mb-8">
        Free, no-auth API for Clanker creator analysis. Agent-friendly. No rate limits (be reasonable).
      </p>

      {/* Creator Analysis */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-purple-400">Creator Analysis</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold">GET</span>
            <code className="text-sm">/api/creator/{'{wallet}'}</code>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Analyze a token creator by wallet address or Farcaster username. Returns rug score, deployment history, and trust verdict.
          </p>
          <h4 className="text-sm font-medium mb-2">Parameters</h4>
          <table className="w-full text-sm mb-4">
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-2 text-purple-400 font-mono">wallet</td>
                <td className="py-2 text-gray-400">0x address or Farcaster username</td>
                <td className="py-2 text-right text-yellow-400">required</td>
              </tr>
            </tbody>
          </table>
          <h4 className="text-sm font-medium mb-2">Example</h4>
          <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto">
            <code>{`curl https://rugrag.vercel.app/api/creator/0x1234...abcd`}</code>
          </pre>
        </div>
      </section>

      {/* Token Check */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-purple-400">Token Check</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold">GET</span>
            <code className="text-sm">/api/token-check/{'{contract}'}</code>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Check a token&apos;s deployer reputation. Returns token info + full creator analysis.
          </p>
          <h4 className="text-sm font-medium mb-2">Parameters</h4>
          <table className="w-full text-sm mb-4">
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-2 text-purple-400 font-mono">contract</td>
                <td className="py-2 text-gray-400">Token contract address (0x...)</td>
                <td className="py-2 text-right text-yellow-400">required</td>
              </tr>
            </tbody>
          </table>
          <h4 className="text-sm font-medium mb-2">Example</h4>
          <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto">
            <code>{`curl https://rugrag.vercel.app/api/token-check/0xABCD...1234`}</code>
          </pre>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-purple-400">Leaderboard</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold">GET</span>
            <code className="text-sm">/api/leaderboard</code>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Top Clanker creators ranked by trust score. Cached for 5 minutes.
          </p>
          <h4 className="text-sm font-medium mb-2">Example</h4>
          <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto">
            <code>{`curl https://rugrag.vercel.app/api/leaderboard`}</code>
          </pre>
        </div>
      </section>

      {/* Agent Integration */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 text-purple-400">AI Agent Integration</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-4">
            All endpoints return JSON with CORS enabled. No authentication required. Designed for AI agents to call directly.
          </p>
          <h4 className="text-sm font-medium mb-2">Response Format</h4>
          <pre className="bg-black/50 rounded-lg p-4 text-sm overflow-x-auto mb-4">
            <code>{`{
  "wallet": "0x...",
  "rugScore": 85,
  "verdict": "LEGIT",
  "totalTokensDeployed": 5,
  "aliveTokens": 4,
  "deadTokens": 1,
  "flags": ["✅ 80% of tokens still alive", ...],
  "tokens": [...]
}`}</code>
          </pre>
          <h4 className="text-sm font-medium mb-2">Verdict Values</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li><span className="text-green-400 font-bold">LEGIT</span> — Score ≥ 65, likely trustworthy</li>
            <li><span className="text-yellow-400 font-bold">SUSPICIOUS</span> — Score 35-64, proceed with caution</li>
            <li><span className="text-red-400 font-bold">RUGGER</span> — Score &lt; 35, high risk</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
