import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useCallback } from 'react';

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tooltip?: string;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  highlight?: boolean;
}

export default function InputField({
  label, value, onChange, tooltip, prefix, suffix,
  step = 0.01, min = 0, max, disabled, highlight
}: InputFieldProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) onChange(v);
  }, [onChange]);

  const inputClass = highlight ? 'user-input' : 'precision-input';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {highlight && <span className="text-[9px] text-amber">✏️</span>}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-xs text-muted-foreground font-mono">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={handleChange}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          className={`${inputClass} w-full text-foreground ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-8' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 text-xs text-muted-foreground font-mono">{suffix}</span>
        )}
      </div>
    </div>
  );
}