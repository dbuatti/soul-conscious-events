import { CalendarDays, LayoutGrid, List, Map as MapIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'compact' | 'calendar' | 'map';

const MODES: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: 'compact', label: 'List', icon: List },
  { value: 'list', label: 'Cards', icon: LayoutGrid },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
  { value: 'map', label: 'Map', icon: MapIcon },
];

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

/** Icon-only view switcher that fits at the end of the state-chip row. */
const ViewModeToggle = ({ value, onChange, className }: ViewModeToggleProps) => (
  <div className={cn('flex items-center bg-card border border-border/80 p-0.5 rounded-full shrink-0', className)}>
    <ToggleGroup type="single" value={value} onValueChange={(v: ViewMode) => v && onChange(v)} aria-label="View">
      {MODES.map(({ value: mode, label, icon: Icon }) => (
        <ToggleGroupItem
          key={mode}
          value={mode}
          title={label}
          aria-label={`${label} view`}
          className="rounded-full h-8 w-8 p-0 data-[state=on]:bg-foreground data-[state=on]:text-background"
        >
          <Icon className="h-3.5 w-3.5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  </div>
);

export default ViewModeToggle;
