import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#FAF8F5] dark:bg-[#18191B] text-neutral-800 dark:text-neutral-200 font-sans p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center text-sm font-serif font-black">
          ✎
        </span>
        <h1 className="text-xl font-bold">Page Not Found</h1>
      </div>
      <p className="text-xs text-neutral-500 mb-4">
        The requested canvas or page could not be located.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
      >
        Return to Whiteboard
      </Link>
    </div>
  );
}
