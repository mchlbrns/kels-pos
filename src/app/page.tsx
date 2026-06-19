'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pos');
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
      <div className="flex flex-col items-center space-y-4">
        {/* Loading Spinner */}
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-sm font-medium tracking-wide text-slate-400">Loading Kels-POS...</p>
      </div>
    </div>
  );
}
