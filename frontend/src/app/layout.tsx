import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import OfflineProvider from './components/OfflineProvider';

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
              <h1 className="text-2xl font-bold text-gray-900 mb-0">🥗 Micros</h1>
              <nav className="flex gap-6">
                <a href="/" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">🔍 Search</a>
                <a href="/overview" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">📊 Overview</a>
                <a href="/log" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">📝 Log</a>
                <a href="/templates" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">📋 Templates</a>
                <a href="/recipes" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">🍳 Recipes</a>
                <a href="/profile" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">👤 Profile</a>
                <a href="/goals" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">⚙️ Goals</a>
                <a href="/social" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">🤝 Social</a>
                <a href="/progress" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">📊 Progress</a>
                <a href="/offline" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">📴 Offline</a>
                <a href="/barcode" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">📱 Barcode</a>
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
          <a href="/" className="mobile-nav-item">
            <span className="mobile-nav-icon">🔍</span>
            <span>Search</span>
          </a>
          <a href="/overview" className="mobile-nav-item">
            <span className="mobile-nav-icon">📊</span>
            <span>Overview</span>
          </a>
          <a href="/log" className="mobile-nav-item">
            <span className="mobile-nav-icon">📝</span>
            <span>Log</span>
          </a>
          <a href="/recipes" className="mobile-nav-item">
            <span className="mobile-nav-icon">🍳</span>
            <span>Recipes</span>
          </a>
          <a href="/profile" className="mobile-nav-item">
            <span className="mobile-nav-icon">👤</span>
            <span>Profile</span>
          </a>
        </nav>
        </OfflineProvider>
      </body>
    </html>
  );
}