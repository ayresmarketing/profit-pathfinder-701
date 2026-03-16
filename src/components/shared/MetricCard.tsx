import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  tooltip?: string;
  signal?: 'safe' | 'warning' | 'danger' | 'neutral' | 'primary';
  subtitle?: string;
  compact?: boolean;
}

const signalClasses = {
  safe: 'number-glow-safe',
  warning: 'signal-warning',
  danger: 'number-glow-danger',
  primary: 'number-glow-primary',
  neutral: 'text-foreground',
};

export default function MetricCard({ label, value, tooltip, signal = 'neutral', subtitle, compact }: MetricCardProps) {
  return (
    <div className={`glass-card ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-popover text-popover-foreground border-border">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0.5, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
        className={`font-mono text-lg font-semibold tracking-tight ${signalClasses[signal]}`}
      >
        {value}
      </motion.div>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}
