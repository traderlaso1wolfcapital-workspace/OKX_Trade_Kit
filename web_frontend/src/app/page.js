import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-4">Welcome to TLS1 Trading OS</h1>
      <p className="text-text-secondary mb-8 max-w-lg text-center">
        The ultimate trading platform combining a lightning-fast Desktop Engine with a premium Web Control Center.
      </p>
      <div className="flex gap-4">
        <Link href="/trade" className="bg-accent-blue text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition-all">
          Open Workspace
        </Link>
        <Link href="/desktop" className="bg-dark-surface border border-border text-white px-6 py-2 rounded-lg font-semibold hover:bg-border transition-all">
          Desktop Overview
        </Link>
      </div>
    </div>
  );
}
