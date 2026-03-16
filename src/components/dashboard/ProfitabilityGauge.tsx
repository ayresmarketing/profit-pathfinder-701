import { motion } from 'framer-motion';

interface ProfitabilityGaugeProps {
  cpaMax: number;
  cpaProjected: number;
}

export default function ProfitabilityGauge({ cpaMax, cpaProjected }: ProfitabilityGaugeProps) {
  // Map CPA to gauge angle (0 = left/green, 180 = right/red)
  // 0% of max = 0°, 100% = 120°, >100% = up to 180°
  const ratio = cpaMax > 0 ? cpaProjected / cpaMax : 1;
  const projectedAngle = Math.min(ratio * 140, 180); // cap at 180
  const maxAngle = 140; // CPA max is always at 140°

  const isOverBudget = cpaProjected > cpaMax;

  // SVG arc calculations
  const cx = 150, cy = 130, r = 100;
  const startAngle = -180; // left

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const arcStart = polarToCartesian(startAngle);
  const arcEnd = polarToCartesian(0);
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`;

  // Pointer positions
  const maxPointer = polarToCartesian(startAngle + maxAngle);
  const projPointer = polarToCartesian(startAngle + projectedAngle);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 160" className="w-full max-w-xs">
        {/* Background arc */}
        <path d={arcPath} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeLinecap="round" />

        {/* Colored arc segments */}
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--emerald))" />
            <stop offset="50%" stopColor="hsl(var(--amber))" />
            <stop offset="100%" stopColor="hsl(var(--rose))" />
          </linearGradient>
        </defs>
        <path d={arcPath} fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round" opacity="0.6" />

        {/* CPA Max pointer (static) */}
        <motion.circle
          cx={maxPointer.x} cy={maxPointer.y} r="6"
          fill="hsl(var(--electric))"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        />
        <text x={maxPointer.x} y={maxPointer.y - 12} textAnchor="middle" className="text-[8px] fill-electric font-mono font-semibold">MAX</text>

        {/* CPA Projected pointer (dynamic) */}
        <motion.circle
          cx={projPointer.x} cy={projPointer.y} r="8"
          fill={isOverBudget ? 'hsl(var(--rose))' : 'hsl(var(--emerald))'}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className={isOverBudget ? 'animate-pulse-danger' : ''}
        />
        <text x={projPointer.x} y={projPointer.y - 14} textAnchor="middle"
          className={`text-[8px] font-mono font-semibold ${isOverBudget ? 'fill-rose' : 'fill-emerald'}`}>
          PROJ
        </text>
      </svg>
    </div>
  );
}
