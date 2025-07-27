import React from 'react';
import Header from './Header';
import { MadeWithDyad } from './made-with-dyad';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100">
      <Header />
      <main className="flex-grow w-full flex flex-col items-center py-8">
        {children}
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Layout;