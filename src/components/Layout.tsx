import React from 'react';
import Header from './Header';
import { MadeWithDyad } from './made-with-dyad';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
      <Header />
      <main className="flex-grow w-full max-w-6xl px-4 flex flex-col items-center py-8"> {/* Increased max-w and added horizontal padding */}
        {children}
      </main>
      <div className="p-4 text-center">
        <a
          href="https://buymeacoffee.com/danielebuatti"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-2"
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
            alt="Buy Me a Coffee"
            style={{ height: '40px', width: '140px' }}
            className="shadow-md rounded-md hover:opacity-90 transition-opacity"
          />
        </a>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Layout;