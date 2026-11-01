import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SketchBoard — Real-Time Collaborative Whiteboard',
  description: 'Hand-drawn collaborative whiteboard with pen, shapes, sticky notes, image dropping, live team presence, and version history.',
  openGraph: {
    title: 'SketchBoard — Real-Time Collaborative Whiteboard',
    description: 'Hand-drawn collaborative whiteboard with pen, shapes, sticky notes, image dropping, live team presence, and version history.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SketchBoard — Real-Time Collaborative Whiteboard',
    description: 'Hand-drawn collaborative whiteboard with pen, shapes, sticky notes, image dropping, live team presence, and version history.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased w-screen h-screen overflow-hidden bg-[#FAF8F5] dark:bg-[#18191B] text-neutral-900 dark:text-neutral-100 font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
