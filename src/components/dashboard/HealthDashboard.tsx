import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatPercent, formatNumber, getHealthStatus } from '@/lib/calculations';
import MetricCard from '@/components/shared/MetricCard';
import ProfitabilityGauge from './ProfitabilityGauge';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip as RTooltip } from 'recharts';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function HealthDashboard() {
  const { state, productCalc, funnelCalc, cpaProjection } = useOperation();

  const healthProduct = getHealthStatus(cpaProjection.projectedCPA, funnelCalc.healthZonesProduct);
  const signalMap = { healthy: 'safe' as const, moderate: 'warning' as const, aggressive: 'warning' as const, danger: 'danger' as const };
  const statusLabels = { healthy: '✅ Cenário Viável', moderate: '⚠️ Risco Moderado', aggressive: '🟠 Risco de Escala', danger: '🚨 Margem Crítica' };

  const margin = funnelCalc.totalGrossRevenue > 0
    ? ((funnelCalc.totalNetRevenue) / funnelCalc.totalGrossRevenue) * 100
    : 0;

  const delta = funnelCalc.cpaMaxProduct - cpaProjection.projectedCPA;
  const isDanger = delta < 0;

  const revenueData = [
    { name: 'Principal', value: productCalc.grossRevenue, net: productCalc.netRevenue },
    ...state.offers.map((o, i) => ({
      name: o.name.slice(0, 12),
      value: funnelCalc.offerResults[i]?.grossRevenue || 0,
      net: funnelCalc.offerResults[i]?.netRevenue || 0,
    })),
  ];

  const waterfallData = [
    { name: 'Bruto', value: state.product.price, color: 'hsl(220, 20%, 14%)' },
    { name: 'Impostos', value: -productCalc.taxPerSale, color: 'hsl(38, 92%, 50%)' },
    { name: 'Plataforma', value: -productCalc.platformFeePerSale, color: 'hsl(220, 70%, 50%)' },
    { name: 'Comissão', value: -(productCalc.commissionPerSale + state.product.otherFixedCosts), color: 'hsl(0, 72%, 51%)' },
    { name: 'Líquido', value: productCalc.netValuePerSale, color: 'hsl(152, 60%, 40%)' },
  ];

  const zones = funnelCalc.healthZonesProduct;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Status header */}
      <motion.div variants={item} className={`section-card ${isDanger ? 'bg-signal-danger' : 'bg-signal-safe'}`}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 text-center md:text-left">
            <p className={`text-lg font-bold tracking-tight ${isDanger ? 'signal-danger' : 'signal-safe'}`}>
              {statusLabels[healthProduct]}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              CPA máximo: <strong className="text-foreground">{formatBRL(funnelCalc.cpaMaxProduct)}</strong>.
              {' '}CPM: <strong className="text-foreground">{formatBRL(state.traffic.cpm)}</strong>.
              {' '}Conversão mínima: <strong className="text-foreground">{formatPercent(
                ((cpaProjection.purchases / cpaProjection.pageViews) * 100) || 0
              )}</strong>.
            </p>
          </div>
          <div className="w-48 shrink-0">
            <ProfitabilityGauge cpaMax={funnelCalc.cpaMaxProduct} cpaProjected={cpaProjection.projectedCPA} />
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Faturamento Bruto" value={formatBRL(funnelCalc.totalGrossRevenue)} />
        <MetricCard label="Faturamento Líquido" value={formatBRL(funnelCalc.totalNetRevenue)} signal="safe" />
        <MetricCard label="Lucro / venda" value={formatBRL(productCalc.netValuePerSale)} signal={productCalc.netValuePerSale > 0 ? 'safe' : 'danger'} />
        <MetricCard label="Lucro projetado" value={formatBRL(cpaProjection.projectedProfit)} signal={cpaProjection.projectedProfit > 0 ? 'safe' : 'danger'} />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="CPA Máximo" value={formatBRL(funnelCalc.cpaMaxProduct)} signal="primary" />
        <MetricCard label="CPA Projetado" value={formatBRL(cpaProjection.projectedCPA)} signal={signalMap[healthProduct]} />
        <MetricCard label="Margem" value={formatPercent(margin)} signal={margin > 30 ? 'safe' : margin > 15 ? 'warning' : 'danger'} />
        <MetricCard label="Break-even" value={`${funnelCalc.breakEvenSales} vendas`} />
      </motion.div>

      {/* Health zones */}
      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <h3 className="section-title">🎯 Zonas de Saúde</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HealthZone emoji="🟢" label="Saudável" range={`${formatBRL(zones.healthy[0])} – ${formatBRL(zones.healthy[1])}`} active={healthProduct === 'healthy'} desc="Margem confortável" />
          <HealthZone emoji="🟡" label="Moderado" range={`${formatBRL(zones.moderate[0])} – ${formatBRL(zones.moderate[1])}`} active={healthProduct === 'moderate'} desc="Margem apertada" />
          <HealthZone emoji="🟠" label="Agressivo" range={`${formatBRL(zones.aggressive[0])} – ${formatBRL(zones.aggressive[1])}`} active={healthProduct === 'aggressive'} desc="Risco ao escalar" />
          <HealthZone emoji="🔴" label="Risco" range={`Acima de ${formatBRL(zones.dangerAbove)}`} active={healthProduct === 'danger'} desc="Provável prejuízo" />
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Composição de Receita</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} />
              <RTooltip
                contentStyle={{ background: 'white', border: '1px solid hsl(220, 13%, 90%)', borderRadius: 8 }}
                formatter={(v: number) => formatBRL(v)}
              />
              <Bar dataKey="value" name="Bruto" radius={[4, 4, 0, 0]}>
                {revenueData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? 'hsl(220, 70%, 50%)' : `hsl(152, 60%, ${40 + i * 5}%)`} />
                ))}
              </Bar>
              <Bar dataKey="net" name="Líquido" radius={[4, 4, 0, 0]}>
                {revenueData.map((_, i) => (
                  <Cell key={i} fill={`hsl(152, 60%, ${50 + i * 5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Waterfall de Custos (por venda)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={waterfallData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} />
              <RTooltip
                contentStyle={{ background: 'white', border: '1px solid hsl(220, 13%, 90%)', borderRadius: 8 }}
                formatter={(v: number) => formatBRL(Math.abs(v))}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waterfallData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* CPA comparison */}
      <motion.div variants={item} className="glass-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">CPA Máximo vs CPA Projetado</h3>
        <div className="flex items-end gap-6 h-32">
          <div className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              className="w-full rounded-t-lg bg-primary"
              initial={{ height: 0 }}
              animate={{ height: `${(funnelCalc.cpaMaxProduct / Math.max(funnelCalc.cpaMaxProduct, cpaProjection.projectedCPA)) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
            <span className="text-xs font-mono text-primary font-semibold">{formatBRL(funnelCalc.cpaMaxProduct)}</span>
            <span className="text-[10px] text-muted-foreground">CPA Máx.</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              className={`w-full rounded-t-lg ${isDanger ? 'bg-rose' : 'bg-emerald'}`}
              initial={{ height: 0 }}
              animate={{ height: `${(cpaProjection.projectedCPA / Math.max(funnelCalc.cpaMaxProduct, cpaProjection.projectedCPA)) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.1 }}
            />
            <span className={`text-xs font-mono font-semibold ${isDanger ? 'text-rose' : 'text-emerald'}`}>{formatBRL(cpaProjection.projectedCPA)}</span>
            <span className="text-[10px] text-muted-foreground">CPA Proj.</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HealthZone({ emoji, label, range, active, desc }: { emoji: string; label: string; range: string; active: boolean; desc: string }) {
  return (
    <div className={`p-4 rounded-xl text-center transition-all ${active ? 'glass-card ring-2 ring-primary scale-105' : 'bg-muted/50'}`}>
      <span className="text-lg">{emoji}</span>
      <p className={`text-xs font-semibold mt-1 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
      <p className="text-[10px] font-mono text-muted-foreground">{range}</p>
      <p className="text-[9px] text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}