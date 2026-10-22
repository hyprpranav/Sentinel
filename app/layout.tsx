import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SENTINELTRACK — H₂S Sentinel | Cumulative Gas Exposure Monitoring',
  description:
    'SENTINELTRACK: A Color-Changing Wristband for Tracking Cumulative H₂S Gas Exposure. Passive colorimetric sensing, smartphone image analysis, and digital worker exposure records.',
  keywords: ['H2S', 'dosimeter', 'safety', 'industrial', 'MRPL', 'exposure monitoring', 'SENTINELTRACK'],
  authors: [{ name: 'Team Sensation' }],
  openGraph: {
    title: 'SENTINELTRACK — H₂S Sentinel',
    description: 'A Color-Changing Wristband for Tracking Cumulative H₂S Gas Exposure',
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sentinel-theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&p)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
