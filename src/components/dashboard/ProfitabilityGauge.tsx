import { motion } from 'framer-motion';

interface ProfitabilityGaugeProps {
  cpaMax: number;
  cpaProjected: number;
}

export default function ProfitabilityGauge({ cpaMax, cpaProjected }: ProfitabilityGaugeProps) {
  const ratio = cpaMax > 0 ? cpaProjected / cpaMax : 1;
  const projectedAngle = Math.min(ratio * 140, 180);
  const maxAngle = 140;
  const isOverBudget = cpaProjected > cpaMax;

  const cx = 150, cy = 130, r = 100;
  const startAngle = -180;

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const arcStart = polarToCartesian(startAngle);
  const arcEnd = polarToCartesian(0);
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`;

  const maxPointer = polarToCartesian(startAngle + maxAngle);
  const projPointer = polarToCartesian(startAngle + projectedAngle);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 160" className="w-full max-w-xs">
        {/* Background arc */}
        <path d={arcPath} fill="none" stroke="hsl(222, 30%, 16%)" strokeWidth="14" strokeLinecap="round" />

        {/* Gradient arc */}
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(152, 69%, 45%)" />
            <stop offset="50%" stopColor="hsl(38, 92%, 50%)" />
            <stop offset="100%" stopColor="hsl(0, 84%, 60%)" />
          </linearGradient>
        </defs>
        <path d={arcPath} fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round" opacity="0.7" />

        {/* CPA Max pointer */}
        <motion.circle
          cx={maxPointer.x} cy={maxPointer.y} r="7"
          fill="hsl(217, 91%, 60%)"
          stroke="hsl(222, 47%, 8%)"
          strokeWidth="3"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        />
        <text x={maxPointer.x} y={maxPointer.y - 14} textAnchor="middle" fill="hsl(217, 91%, 60%)" fontSize="9" fontFamily="JetBrains Mono" fontWeight="700">MAX</text>

        {/* CPA Projected pointer */}
        <motion.circle
          cx={projPointer.x} cy={projPointer.y} r="9"
          fill={isOverBudget ? 'hsl(0, 84%, 60%)' : 'hsl(152, 69%, 45%)'}
          stroke="hsl(222, 47%, 8%)"
          strokeWidth="3"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        />
        <text x={projPointer.x} y={projPointer.y - 14} textAnchor="middle"
          fill={isOverBudget ? 'hsl(0, 84%, 60%)' : 'hsl(152, 69%, 45%)'}
          fontSize="9" fontFamily="JetBrains Mono" fontWeight="700">
          PROJ
        </text>
      </svg>
    </div>
  );
}
