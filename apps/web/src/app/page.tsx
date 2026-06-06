import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-950 px-4 text-center">
      <div className="space-y-3">
        <h1 className="text-6xl font-bold text-white">Mafioso</h1>
        <p className="text-xl text-gray-400">Real-time multiplayer Mafia game</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-red-600 px-8 py-3 font-semibold text-white transition hover:bg-red-700"
        >
          Play Now
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-white px-8 py-3 font-semibold text-white transition hover:bg-white/10"
        >
          Create Room
        </Link>
      </div>

      <p className="text-sm text-gray-500">Play online or host on-site with friends</p>
    </main>
  )
}
