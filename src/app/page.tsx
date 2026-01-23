export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-accent-400 mb-4">
          Army Tracker
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Warhammer 40k Army List Builder and Game State Tracker
        </p>
        <div className="bg-gray-800 rounded-lg p-6 max-w-md">
          <p className="text-gray-300 mb-4">
            Next.js migration in progress. This app is being rebuilt with:
          </p>
          <ul className="text-left text-gray-400 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Next.js 14 with App Router
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> TypeScript
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Tailwind CSS
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">○</span> Zustand for state management
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">○</span> React components
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}
