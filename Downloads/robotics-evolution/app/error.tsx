'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-mono p-4">
      <h1 className="text-4xl font-bold mb-4 text-red-500">ERROR</h1>
      <p className="text-white/60 uppercase tracking-widest mb-8">System Malfunction Detected</p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 border border-white/20 hover:border-red-500 hover:text-red-500 transition-colors"
      >
        Reboot System
      </button>
    </div>
  );
}
