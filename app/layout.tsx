import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SENTINEL - Passive Exposure Intelligence for Safer Workplaces',
  description:
    'SENTINEL is a digital platform for passive colorimetric H₂S exposure dosimeter wristbands. Track, analyse, and manage cumulative H₂S exposure for industrial workers.',
  keywords: ['H2S', 'dosimeter', 'safety', 'industrial', 'MRPL', 'exposure monitoring'],
  authors: [{ name: 'Team Sensation' }],
  openGraph: {
    title: 'SENTINEL',
    description: 'Passive Exposure Intelligence for Safer Workplaces',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
