import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-mono p-4">
      <h1 className="text-4xl font-bold mb-4 text-red-500">404</h1>
      <p className="text-white/60 uppercase tracking-widest">System Error: Resource Not Found</p>
      <Link href="/" className="mt-8 px-6 py-2 border border-white/20 hover:border-red-500 hover:text-red-500 transition-colors">
        Return to Base
      </Link>
    </div>
  );
}
