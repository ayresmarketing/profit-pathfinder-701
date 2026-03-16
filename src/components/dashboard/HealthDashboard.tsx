import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatPercent, formatNumber, getHealthStatus } from '@/lib/calculations';
import MetricCard from '@/components/shared/MetricCard';
import ProfitabilityGauge from './ProfitabilityGauge';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip as RTooltip, PieChart, Pie } from 'recharts';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function HealthDashboard() {
  const { state, productCalc, funnelCalc, cpaProjection } = useOperation();

  const healthProduct = getHealthStatus(cpaProjection.projectedCPA, funnelCalc.healthZonesProduct);
  const healthFunnel = getHealthStatus(cpaProjection.projectedCPA, funnelCalc.healthZonesFunnel);
  const signalMap = { healthy: 'safe' as const, moderate: 'warning' as const, aggressive: 'warning' as const, danger: 'danger' as const };
  const statusLabels = { healthy: 'Cenário Viável', moderate: 'Risco Moderado', aggressive: 'Risco de Escala', danger: 'Margem Crítica' };

  const margin = funnelCalc.totalGrossRevenue > 0
    ? ((funnelCalc.totalNetRevenue) / funnelCalc.totalGrossRevenue) * 100
    : 0;

  const delta = funnelCalc.cpaMaxProduct - cpaProjection.projectedCPA;
  const isDanger = delta < 0;

  // Revenue composition data
  const revenueData = [
    { name: 'Principal', value: productCalc.grossRevenue, net: productCalc.netRevenue },
    ...state.offers.map((o, i) => ({
      name: o.name.slice(0, 15),
      value: funnelCalc.offerResults[i]?.grossRevenue || 0,
      net: funnelCalc.offerResults[i]?.netRevenue || 0,
    })),
  ];

  // Cost waterfall
  const waterfallData = [
    { name: 'Preço Bruto', value: state.product.price, color: 'hsl(var(--foreground))' },
    { name: 'Impostos', value: -productCalc.taxPerSale, color: 'hsl(var(--amber))' },
    { name: 'Plataforma', value: -productCalc.platformFeePerSale, color: 'hsl(var(--electric))' },
    { name: 'Comissão', value: -(productCalc.commissionPerSale + state.product.otherFixedCosts), color: 'hsl(var(--rose))' },
    { name: 'Líquido', value: productCalc.netValuePerSale, color: 'hsl(var(--emerald))' },
  ];

  // Health zones for product
  const zones = funnelCalc.healthZonesProduct;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Dashboard de Saúde</h2>
        <p className="text-sm text-muted-foreground">Visão executiva da operação.</p>
      </motion.div>

      {/* Status header */}
      <motion.div variants={item} className={`glass-card p-5 ${isDanger ? 'bg-signal-danger' : 'bg-signal-safe'}`}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 text-center md:text-left">
            <p className={`text-xl font-bold tracking-tight ${isDanger ? 'signal-danger' : 'signal-safe'}`}>
              {statusLabels[healthProduct]}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Seu CPA máximo é <strong className="text-foreground">{formatBRL(funnelCalc.cpaMaxProduct)}</strong>.
              {' '}Com o CPM atual de <strong className="text-foreground">{formatBRL(state.traffic.cpm)}</strong>,
              {' '}você precisa de <strong className="text-foreground">{formatPercent(
                ((cpaProjection.purchases / cpaProjection.pageViews) * 100) || 0
              )}</strong> de conversão para manter o lucro.
            </p>
          </div>
          <div className="w-48 shrink-0">
            <ProfitabilityGauge cpaMax={funnelCalc.cpaMaxProduct} cpaProjected={cpaProjection.projectedCPA} />
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Faturamento Bruto" value={formatBRL(funnelCalc.totalGrossRevenue)} />
        <MetricCard label="Faturamento Líquido" value={formatBRL(funnelCalc.totalNetRevenue)} signal="safe" />
        <MetricCard label="Lucro / venda" value={formatBRL(productCalc.netValuePerSale)} signal={productCalc.netValuePerSale > 0 ? 'safe' : 'danger'} />
        <MetricCard label="Lucro projetado" value={formatBRL(cpaProjection.projectedProfit)} signal={cpaProjection.projectedProfit > 0 ? 'safe' : 'danger'} />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="CPA Máximo" value={formatBRL(funnelCalc.cpaMaxProduct)} signal="primary"
          tooltip="Valor limite para manter margem positiva" />
        <MetricCard label="CPA Projetado" value={formatBRL(cpaProjection.projectedCPA)} signal={signalMap[healthProduct]}
          tooltip="CPA estimado com métricas de tráfego atuais" />
        <MetricCard label="Margem" value={formatPercent(margin)} signal={margin > 30 ? 'safe' : margin > 15 ? 'warning' : 'danger'} />
        <MetricCard label="Break-even" value={`${funnelCalc.breakEvenSales} vendas`}
          tooltip="Ponto de equilíbrio considerando investimento em tráfego" />
      </motion.div>

      {/* Health zones */}
      <motion.div variants={item} className="glass-card p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Zonas de Saúde (Produto Principal)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <HealthZone emoji="🟢" label="Saudável" range={`${formatBRL(zones.healthy[0])} – ${formatBRL(zones.healthy[1])}`} active={healthProduct === 'healthy'} />
          <HealthZone emoji="🟡" label="Moderado" range={`${formatBRL(zones.moderate[0])} – ${formatBRL(zones.moderate[1])}`} active={healthProduct === 'moderate'} />
          <HealthZone emoji="🟠" label="Agressivo" range={`${formatBRL(zones.aggressive[0])} – ${formatBRL(zones.aggressive[1])}`} active={healthProduct === 'aggressive'} />
          <HealthZone emoji="🔴" label="Zona de risco" range={`Acima de ${formatBRL(zones.dangerAbove)}`} active={healthProduct === 'danger'} />
        </div>
      </motion.div>

      {/* Charts row */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue composition */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Composição de Receita</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220, 8%, 52%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 8%, 52%)' }} />
              <RTooltip
                contentStyle={{ background: 'hsl(240, 6%, 8%)', border: '1px solid hsl(0, 0%, 100%, 0.08)', borderRadius: 8 }}
                labelStyle={{ color: 'hsl(220, 10%, 92%)' }}
                formatter={(v: number) => formatBRL(v)}
              />
              <Bar dataKey="value" name="Bruto" radius={[4, 4, 0, 0]}>
                {revenueData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? 'hsl(var(--electric))' : `hsl(var(--emerald) / ${0.5 + i * 0.1})`} />
                ))}
              </Bar>
              <Bar dataKey="net" name="Líquido" radius={[4, 4, 0, 0]}>
                {revenueData.map((_, i) => (
                  <Cell key={i} fill={`hsl(var(--emerald) / ${0.3 + i * 0.1})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost waterfall */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Waterfall de Custos (por venda)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={waterfallData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220, 8%, 52%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 8%, 52%)' }} />
              <RTooltip
                contentStyle={{ background: 'hsl(240, 6%, 8%)', border: '1px solid hsl(0, 0%, 100%, 0.08)', borderRadius: 8 }}
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
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">CPA Máximo vs CPA Projetado</h3>
        <div className="flex items-end gap-4 h-32">
          <div className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              className="w-full rounded-t bg-electric"
              initial={{ height: 0 }}
              animate={{ height: `${(funnelCalc.cpaMaxProduct / Math.max(funnelCalc.cpaMaxProduct, cpaProjection.projectedCPA)) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
            <span className="text-xs font-mono text-electric">{formatBRL(funnelCalc.cpaMaxProduct)}</span>
            <span className="text-[10px] text-muted-foreground">CPA Máx.</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              className={`w-full rounded-t ${isDanger ? 'bg-rose' : 'bg-emerald'}`}
              initial={{ height: 0 }}
              animate={{ height: `${(cpaProjection.projectedCPA / Math.max(funnelCalc.cpaMaxProduct, cpaProjection.projectedCPA)) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.1 }}
            />
            <span className={`text-xs font-mono ${isDanger ? 'text-rose' : 'text-emerald'}`}>{formatBRL(cpaProjection.projectedCPA)}</span>
            <span className="text-[10px] text-muted-foreground">CPA Proj.</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HealthZone({ emoji, label, range, active }: { emoji: string; label: string; range: string; active: boolean }) {
  return (
    <div className={`p-3 rounded-lg text-center transition-all ${active ? 'glass-card ring-1 ring-primary scale-105' : 'bg-muted/30'}`}>
      <span className="text-lg">{emoji}</span>
      <p className={`text-xs font-semibold mt-1 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
      <p className="text-[10px] font-mono text-muted-foreground">{range}</p>
    </div>
  );
}
