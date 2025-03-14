// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from './components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gemini App',
  description: 'Interact with Gemini AI using your camera and microphone',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning className={`${inter.className} min-h-screen bg-zinc-50`}>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 h-full overflow-auto">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
