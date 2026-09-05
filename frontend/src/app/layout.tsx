import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ViewerModal from '@/components/ui/ViewerModal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EduHub — Learn, Share, Grow',
  description:
    'EduHub is a modern education library for notes, books, slides, quizzes and past papers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <AuthProvider>
            <Header />
            <main>{children}</main>
            <ViewerModal />
            <Footer />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
