import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Shared warm page intro used across V2 content pages. */
const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, actions, className }) => (
  <header className={cn('hero-glow rounded-[1.5rem] px-5 py-8 sm:px-10 sm:py-10 mb-8', className)}>
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-4xl sm:text-6xl font-heading font-semibold text-foreground leading-[1.05]">{title}</h1>
        {description && <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-3">{actions}</div>}
    </div>
  </header>
);

export default PageHeader;
