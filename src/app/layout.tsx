import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hitta ett möte',
  description: 'Möten för AA, ACA och CA i Sverige',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
