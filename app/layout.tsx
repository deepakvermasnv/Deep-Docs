import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Docs Clone',
  description: 'A modern Google Docs-like editor built with Next.js and TipTap.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body suppressHydrationWarning className="bg-[#F8F9FA] text-[#202124] antialiased">
        {children}
      </body>
    </html>
  );
}
