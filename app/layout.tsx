import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/supabase/auth-context';

export const metadata: Metadata = {
  title: 'BiharStack AI — Turn your website into an AI chatbot in under 2 minutes',
  description: 'AI for Every Business. Deploy production-ready AI chatbots on your website in under 2 minutes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
