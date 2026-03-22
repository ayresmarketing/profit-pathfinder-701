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
  icon?: React.ReactNode;
}

const signalStyles: Record<string, { value: string; bg: string; border: string }> = {
  safe: { value: 'number-glow-safe', bg: 'hsl(var(--emerald-soft))', border: 'border-emerald/10' },
  warning: { value: 'signal-warning', bg: 'hsl(var(--amber-soft))', border: 'border-amber/10' },
  danger: { value: 'number-glow-danger', bg: 'hsl(var(--rose-soft))', border: 'border-rose/10' },
  primary: { value: 'number-glow-primary', bg: 'hsl(var(--primary) / 0.06)', border: 'border-primary/10' },
  neutral: { value: 'text-foreground', bg: 'transparent', border: 'border-border' },
};

export default function MetricCard({ label, value, tooltip, signal = 'neutral', subtitle, compact, icon }: MetricCardProps) {
  const style = signalStyles[signal];

  return (
    <div className={`rounded-xl border ${style.border} ${compact ? 'p-4' : 'p-5'} bg-card relative overflow-hidden`}>
      {signal !== 'neutral' && (
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30 blur-2xl" style={{ background: style.bg }} />
      )}
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-muted-foreground uppercase tracking-wider`}>{label}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-popover border-border">
                <p className="text-xs text-popover-foreground">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <motion.div key={value} initial={{ opacity: 0.5, y: 4 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className={`font-mono ${compact ? 'text-lg' : 'text-xl md:text-2xl'} font-bold tracking-tight ${style.value}`}>
          {value}
        </motion.div>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-1.5">{subtitle}</p>}
      </div>
    </div>
  );
}
