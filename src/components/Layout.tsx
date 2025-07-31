import React from 'react';
import Header from './Header';
import Footer from './Footer'; // Import the new Footer component

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
      <Header />
      <main className="flex-grow w-full max-w-7xl px-4 flex flex-col items-center py-8">
        {children}
      </main>
      {/* Removed the old MadeWithDyad and Buy Me a Coffee divs */}
      <Footer /> {/* Add the new Footer component here */}
    </div>
  );
};

export default Layout;