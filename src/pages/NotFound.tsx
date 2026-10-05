import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="w-full max-w-2xl px-4 py-16 sm:py-24 text-center">
      <SEO
        title="Page Not Found | SoulFlow Australia"
        description="The page you are looking for does not exist. Return to the SoulFlow home page to discover soulful events across Australia."
      />
      <p className="eyebrow mb-4">404 · Page not found</p>
      <h1 className="text-5xl sm:text-7xl font-heading font-semibold text-foreground leading-[1.05]">
        This path has <span className="italic font-medium text-primary">wandered off.</span>
      </h1>
      <p className="mt-6 text-lg text-muted-foreground">
        The page you were looking for doesn't exist, or the event has finished. Plenty more is happening, though.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg" className="rounded-full px-7">
          <Link to="/">Browse events</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full px-7 bg-card">
          <Link to="/submit-event">List an event</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
