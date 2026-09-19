import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ViewerModal from '@/components/ui/ViewerModal';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'EduHub — Learn, Share, Grow',
  description:
    'EduHub is a modern education library for notes, books, slides, quizzes and past papers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2642879705251045"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className={jakarta.className}>
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
