import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatPercent, getHealthStatus } from '@/lib/calculations';
import MetricCard from '@/components/shared/MetricCard';
import ProfitabilityGauge from './ProfitabilityGauge';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Cell, Tooltip as RTooltip, PieChart, Pie
} from 'recharts';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const chartStyle = {
  background: 'hsl(222, 40%, 11%)',
  border: '1px solid hsl(222, 20%, 18%)',
  borderRadius: 12,
  color: 'hsl(210, 40%, 98%)',
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
    { name: 'Principal', bruto: productCalc.grossRevenue, liquido: productCalc.netRevenue },
    ...state.offers.map((o, i) => ({
      name: o.name.slice(0, 12),
      bruto: funnelCalc.offerResults[i]?.grossRevenue || 0,
      liquido: funnelCalc.offerResults[i]?.netRevenue || 0,
    })),
  ];

  const costPie = [
    { name: 'Impostos', value: productCalc.taxPerSale, color: 'hsl(38, 92%, 50%)' },
    { name: 'Plataforma', value: productCalc.platformFeePerSale, color: 'hsl(217, 91%, 60%)' },
    { name: 'Comissão', value: productCalc.commissionPerSale + state.product.otherFixedCosts, color: 'hsl(263, 70%, 58%)' },
    { name: 'Líquido', value: Math.max(productCalc.netValuePerSale, 0), color: 'hsl(152, 69%, 45%)' },
  ].filter(d => d.value > 0);

  const zones = funnelCalc.healthZonesProduct;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground tracking-tight">Dashboard de Saúde</h2>
        </div>
      </motion.div>

      {/* Status banner + gauge */}
      <motion.div variants={item} className={`premium-card ${isDanger ? 'bg-signal-danger' : 'bg-signal-safe'}`}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 text-center md:text-left">
            <p className={`text-xl font-bold tracking-tight ${isDanger ? 'signal-danger' : 'signal-safe'}`}>
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
          <div className="w-56 shrink-0">
            <ProfitabilityGauge cpaMax={funnelCalc.cpaMaxProduct} cpaProjected={cpaProjection.projectedCPA} />
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard label="Faturamento Bruto" value={formatBRL(funnelCalc.totalGrossRevenue)} />
        <MetricCard label="Faturamento Líquido" value={formatBRL(funnelCalc.totalNetRevenue)} signal="safe" />
        <MetricCard label="Lucro / venda" value={formatBRL(productCalc.netValuePerSale)} signal={productCalc.netValuePerSale > 0 ? 'safe' : 'danger'} />
        <MetricCard label="Lucro projetado" value={formatBRL(cpaProjection.projectedProfit)} signal={cpaProjection.projectedProfit > 0 ? 'safe' : 'danger'} />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard label="CPA Máximo" value={formatBRL(funnelCalc.cpaMaxProduct)} signal="primary" />
        <MetricCard label="CPA Projetado" value={formatBRL(cpaProjection.projectedCPA)} signal={signalMap[healthProduct]} />
        <MetricCard label="Margem" value={formatPercent(margin)} signal={margin > 30 ? 'safe' : margin > 15 ? 'warning' : 'danger'} />
        <MetricCard label="Break-even" value={`${funnelCalc.breakEvenSales} vendas`} />
      </motion.div>

      {/* Health zones */}
      <motion.div variants={item} className="premium-card space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🎯 Zonas de Saúde do CPA</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HealthZone emoji="🟢" label="Saudável" range={`${formatBRL(zones.healthy[0])} – ${formatBRL(zones.healthy[1])}`} active={healthProduct === 'healthy'} desc="Margem confortável" />
          <HealthZone emoji="🟡" label="Moderado" range={`${formatBRL(zones.moderate[0])} – ${formatBRL(zones.moderate[1])}`} active={healthProduct === 'moderate'} desc="Margem apertada" />
          <HealthZone emoji="🟠" label="Agressivo" range={`${formatBRL(zones.aggressive[0])} – ${formatBRL(zones.aggressive[1])}`} active={healthProduct === 'aggressive'} desc="Risco ao escalar" />
          <HealthZone emoji="🔴" label="Risco" range={`Acima de ${formatBRL(zones.dangerAbove)}`} active={healthProduct === 'danger'} desc="Provável prejuízo" />
        </div>
      </motion.div>

      {/* Charts row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue chart */}
        <div className="premium-card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Composição de Receita</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} barSize={20} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 20%, 55%)' }} axisLine={false} tickLine={false} />
              <RTooltip contentStyle={chartStyle} formatter={(v: number) => formatBRL(v)} />
              <Bar dataKey="bruto" name="Bruto" radius={[4, 4, 0, 0]} fill="hsl(217, 91%, 60%)" />
              <Bar dataKey="liquido" name="Líquido" radius={[4, 4, 0, 0]} fill="hsl(152, 69%, 45%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost pie */}
        <div className="premium-card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Distribuição de Custos</h3>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {costPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RTooltip contentStyle={chartStyle} formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {costPie.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-muted-foreground flex-1">{d.name}</span>
                  <span className="text-xs font-mono font-semibold text-foreground">{formatBRL(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* CPA Comparison */}
      <motion.div variants={item} className="premium-card">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">CPA Máximo vs CPA Projetado</h3>
        <div className="flex items-end gap-8 h-36 justify-center max-w-xs mx-auto">
          <div className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              className="w-full rounded-t-xl"
              style={{ background: 'var(--gradient-primary)' }}
              initial={{ height: 0 }}
              animate={{ height: `${(funnelCalc.cpaMaxProduct / Math.max(funnelCalc.cpaMaxProduct, cpaProjection.projectedCPA)) * 100}%` }}
              transition={{ duration: 0.7 }}
            />
            <span className="text-sm font-mono number-glow-primary font-bold">{formatBRL(funnelCalc.cpaMaxProduct)}</span>
            <span className="text-[10px] text-muted-foreground">CPA Máx.</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              className={`w-full rounded-t-xl ${isDanger ? 'bg-rose' : 'bg-emerald'}`}
              initial={{ height: 0 }}
              animate={{ height: `${(cpaProjection.projectedCPA / Math.max(funnelCalc.cpaMaxProduct, cpaProjection.projectedCPA)) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.1 }}
            />
            <span className={`text-sm font-mono font-bold ${isDanger ? 'number-glow-danger' : 'number-glow-safe'}`}>{formatBRL(cpaProjection.projectedCPA)}</span>
            <span className="text-[10px] text-muted-foreground">CPA Proj.</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HealthZone({ emoji, label, range, active, desc }: { emoji: string; label: string; range: string; active: boolean; desc: string }) {
  return (
    <div className={`p-4 rounded-xl text-center transition-all ${
      active ? 'glass-card ring-2 ring-primary scale-[1.02]' : 'bg-secondary/50'
    }`}>
      <span className="text-xl">{emoji}</span>
      <p className={`text-xs font-bold mt-1.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{range}</p>
      <p className="text-[9px] text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}
