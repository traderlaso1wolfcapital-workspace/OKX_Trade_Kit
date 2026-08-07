import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'TLS1 Trading OS',
  description: 'Premium Trading Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen bg-dark-bg text-text-primary overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-16 flex flex-col items-center py-4 border-r border-border glass-panel z-50">
          <div className="w-8 h-8 bg-accent-blue rounded-full mb-8 flex items-center justify-center font-bold text-white text-xs">T1</div>
          
          <nav className="flex flex-col gap-6 w-full items-center">
            <SidebarIcon href="/dashboard" label="Dashboard" icon="📊" />
            <SidebarIcon href="/trade" label="Trade" icon="📈" />
            <SidebarIcon href="/desktop" label="Desktop" icon="💻" />
            <SidebarIcon href="/strategies" label="Strategies" icon="🤖" />
            <SidebarIcon href="/analytics" label="Analytics" icon="📉" />
            <SidebarIcon href="/journal" label="Journal" icon="📓" />
          </nav>

          <div className="mt-auto flex flex-col gap-6 items-center w-full">
            <SidebarIcon href="/admin" label="Admin" icon="⚙️" />
            <SidebarIcon href="/settings" label="Settings" icon="🔧" />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Top Navigation */}
          <header className="h-14 border-b border-border glass-panel flex items-center justify-between px-4 z-40">
            <div className="flex items-center gap-4">
              <input type="text" placeholder="Search markets..." className="bg-dark-surface border border-border rounded px-3 py-1 text-sm outline-none focus:border-accent-blue" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-sm">Equity:</span>
                <span className="font-semibold text-accent-green">$10,420.69</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-xl">🔔</button>
                <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}

function SidebarIcon({ href, label, icon }) {
  return (
    <Link href={href} className="group relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-dark-surface transition-colors cursor-pointer text-xl">
      {icon}
      {/* Tooltip */}
      <span className="absolute left-14 bg-dark-surface border border-border px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {label}
      </span>
    </Link>
  );
}
