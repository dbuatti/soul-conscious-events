"use client";

import React, { useEffect, useState } from 'react';

const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const currentScrollY = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setProgress((currentScrollY / totalHeight) * 100);
      }
    };

    window.addEventListener('scroll', updateScrollProgress);
    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[100] pointer-events-none">
      <div 
        className="h-full bg-primary transition-all duration-150 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ScrollProgress;