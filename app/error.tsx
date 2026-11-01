'use client';

import React, { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router Caught Error:', error);
  }, [error]);

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#FAF8F5] dark:bg-[#18191B] text-neutral-800 dark:text-neutral-200 font-sans p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center text-sm font-serif font-black">
          !
        </span>
        <h1 className="text-xl font-bold">Something went wrong</h1>
      </div>
      <p className="text-xs text-neutral-500 mb-4 max-w-md text-center">
        {error.message || 'An unexpected error occurred while loading the canvas.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
