import React from 'react';
import Header from './Header';
import Footer from './Footer'; // Import the new Footer component

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-background"> {/* Changed background to a solid color */}
      <Header />
      <main className="flex-grow w-full max-w-screen-xl px-2 flex flex-col items-center py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;