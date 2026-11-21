import React, { useState, useMemo, useCallback } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResilientImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

/**
 * An  that gracefully falls back to a coloured, category-themed SVG
 * placeholder when the external source fails (expired Eventbrite URLs,
 * 404s, CORS, etc.). Never shows a broken-image icon to the visitor.
 */
export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  width,
  height,
  priority = false,
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  // Deterministic fallback colour based on the alt text so the same event
  // always gets the same colour placeholder.
  const fallbackColor = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < alt.length; i++) {
      hash = alt.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 45%)`;
  }, [alt]);

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-white/80 bg-gradient-to-br from-primary/20 via-accent/10 to-muted/20',
          'rounded-[inherit] overflow-hidden relative',
          fallbackClassName
        )}
        style={{ width, height }}
      >
        <div className="absolute inset-0 opacity-[0.06] flex items-center justify-center text-[80px] sm:text-[140px] font-bold tracking-[0.3em] select-none pointer-events-none">
          ✦
        </div>
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <ImageOff className="h-5 w-5 text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
            Image unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src || ''}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={handleError}
      onLoad={handleLoad}
      className={cn(
        'w-full h-full object-cover transition-opacity duration-300',
        !loaded && 'opacity-0 animate-pulse',
        loaded && 'opacity-100',
        className
      )}
      style={{
        width,
        height,
        backgroundColor: !src || error ? fallbackColor : undefined,
      }}
    />
  );
};
