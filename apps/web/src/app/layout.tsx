import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mafioso',
  description: 'Real-time multiplayer Mafia game',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950">{children}</body>
    </html>
  )
}
