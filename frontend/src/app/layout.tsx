import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import OfflineProvider from './components/OfflineProvider';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const AuthNav = dynamic(() => import('./components/AuthNav'), { ssr: false });

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Micros - Nutrition Tracking',
  description: 'Track your nutrition with precision',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={inter.className}>
        <OfflineProvider>
        {/* Desktop Header */}
        <div className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="container">
            <div className="flex items-center justify-between py-4">
              <Link href="/" className="text-2xl font-bold text-gray-900 mb-0">🥗 Micros</Link>
              <nav className="flex gap-6">
                {/* Simplified nav per spec */}
                <Link href="/" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">🏠 Home</Link>
                <Link href="/log" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">📝 Log</Link>
                <Link href="/recipes" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">📋 Templates & Recipes</Link>
                <Link href="/profile" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">👤 Profile</Link>
                <AuthNav />
              </nav>
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900 mb-0 text-center">🥗 Micros</h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="container py-4 md:py-8 min-h-screen">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-nav md:hidden">
          <Link href="/" className="mobile-nav-item">
            <span className="mobile-nav-icon">🏠</span>
            <span>Home</span>
          </Link>
          <Link href="/log" className="mobile-nav-item">
            <span className="mobile-nav-icon">📝</span>
            <span>Log</span>
          </Link>
          <Link href="/recipes" className="mobile-nav-item">
            <span className="mobile-nav-icon">📋</span>
            <span>Templates</span>
          </Link>
          <Link href="/profile" className="mobile-nav-item">
            <span className="mobile-nav-icon">👤</span>
            <span>Profile</span>
          </Link>
        </nav>
        </OfflineProvider>
      </body>
    </html>
  );
}