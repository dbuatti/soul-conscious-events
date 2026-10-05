import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';

const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  // Event pages have a fixed ticket bar on small screens in this corner.
  const hasMobileTicketBar = useLocation().pathname.startsWith('/events/');

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) { // Show button after scrolling down 300px
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 rounded-full shadow-lg transition-all duration-500 transform hover:scale-110 bg-card/90 backdrop-blur-md border-border",
        hasMobileTicketBar && "max-lg:hidden",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
      title="Scroll to top"
    >
      <ChevronUp className="h-6 w-6 text-primary" />
    </Button>
  );
};

export default ScrollToTopButton;