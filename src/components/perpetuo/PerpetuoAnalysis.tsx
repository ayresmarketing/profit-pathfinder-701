import { useState, useRef } from 'react';
import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatPercent, formatNumber, getHealthStatus, calcScenario2 } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import ProfitabilityGauge from '@/components/dashboard/ProfitabilityGauge';
import { motion } from 'framer-motion';
import {
  Activity, Megaphone, MousePointerClick, FlaskConical, Lightbulb, AlertTriangle,
  TrendingUp, FileDown, ChevronDown, ChevronUp, Target, DollarSign, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Cell, Tooltip as RTooltip, PieChart, Pie
} from 'recharts';

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const chartStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  color: 'hsl(var(--foreground))',
};

export default function PerpetuoAnalysis() {
  const { state, updateTraffic, cpaProjection, funnelCalc, productCalc } = useOperation();
  const t = state.traffic;
  const mainProduct = state.product;
  const printRef = useRef<HTMLDivElement>(null);

  // Section toggles
  const [sections, setSections] = useState({
    traffic: true, funnel: true, scenarios: true, roi: true, health: true, salesGoal: true,
  });
  const toggle = (s: keyof typeof sections) => setSections(prev => ({ ...prev, [s]: !prev[s] }));

  // Scenario states
  const [targetProfitPerSale, setTargetProfitPerSale] = useState(50);
  const [assumedCpa, setAssumedCpa] = useState(25);
  const [monthlyTarget2, setMonthlyTarget2] = useState(20000);

  // Sales goal simulation
  const [salesGoal, setSalesGoal] = useState(mainProduct.salesGoal);
  const profitMainOnly = (productCalc.netValuePerSale - cpaProjection.projectedCPA) * salesGoal;
  const profitFullFunnel = (funnelCalc.revenuePerClient - cpaProjection.projectedCPA) * salesGoal;

  // Scenario calcs
  const requiredCPA = productCalc.netValuePerSale - targetProfitPerSale;
  const monthlyProfit = targetProfitPerSale * mainProduct.salesGoal;
  const requiredInvestment = requiredCPA * mainProduct.salesGoal;
  const scenario2 = calcScenario2(assumedCpa, productCalc.netValuePerSale, monthlyTarget2);

  // Health
  const healthProduct = getHealthStatus(cpaProjection.projectedCPA, funnelCalc.healthZonesProduct);
  const signalMap = { healthy: 'safe' as const, moderate: 'warning' as const, aggressive: 'warning' as const, danger: 'danger' as const };
  const statusLabels = { healthy: '✅ Pode Escalar', moderate: '⚠️ Risco Moderado', aggressive: '🟠 Risco de Escala', danger: '🚨 Margem Crítica' };

  const delta = funnelCalc.cpaMaxProduct - cpaProjection.projectedCPA;
  const isDanger = delta < 0;
  const margin = funnelCalc.totalGrossRevenue > 0 ? (funnelCalc.totalNetRevenue / funnelCalc.totalGrossRevenue) * 100 : 0;
  const zones = funnelCalc.healthZonesProduct;

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

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6" ref={printRef}>
      {/* Header + Export */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground tracking-tight">Análise Perpétuo</h2>
            <span className="tag-auto">⚡ Tempo real</span>
          </div>
          <p className="text-xs text-muted-foreground">Visão completa da operação perpétua: CPA, escalabilidade, cenários e saúde financeira.</p>
        </div>
        <Button variant="outline" onClick={handleExportPDF} className="gap-2 print:hidden">
          <FileDown className="h-4 w-4" /> Exportar PDF
        </Button>
      </motion.div>

      {/* ===== TOP KPIs ===== */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard label="CPA Projetado" value={formatBRL(cpaProjection.projectedCPA)} signal={signalMap[healthProduct]}
          tooltip="Quanto cada venda vai custar com base no tráfego" />
        <MetricCard label="CPA Máximo" value={formatBRL(funnelCalc.cpaMaxProduct)} signal="primary"
          tooltip="Limite de custo por venda sem prejuízo" />
        <MetricCard label="Lucro / venda" value={formatBRL(cpaProjection.projectedProfitPerSale)}
          signal={cpaProjection.projectedProfitPerSale > 0 ? 'safe' : 'danger'} />
        <MetricCard label="LTV por Cliente" value={formatBRL(funnelCalc.revenuePerClient)} signal="safe"
          tooltip="Receita líquida total com funil completo" />
      </motion.div>

      {/* ===== SCALABILITY BANNER ===== */}
      <motion.div variants={item} className={`premium-card ${isDanger ? 'bg-signal-danger' : 'bg-signal-safe'}`}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 text-center md:text-left">
            <p className={`text-xl font-bold tracking-tight ${isDanger ? 'signal-danger' : 'signal-safe'}`}>
              {statusLabels[healthProduct]}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {cpaProjection.isViable
                ? `CPA projetado está ${formatBRL(Math.abs(delta))} abaixo do limite. Margem para escalar!`
                : `CPA projetado excede o máximo em ${formatBRL(Math.abs(delta))}. Ajuste as métricas.`
              }
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-xl font-bold shrink-0">
            <span className={cpaProjection.isViable ? 'number-glow-safe' : 'number-glow-danger'}>{formatBRL(cpaProjection.projectedCPA)}</span>
            <span className="text-muted-foreground text-sm">vs</span>
            <span className="number-glow-primary">{formatBRL(funnelCalc.cpaMaxProduct)}</span>
          </div>
        </div>
      </motion.div>

      {/* ===== SALES GOAL SIMULATOR ===== */}
      <motion.div variants={item} className="premium-card space-y-4">
        <SectionHeader icon={<Target className="h-4 w-4 text-white" />} title="Simulador de Meta" desc="Defina uma meta de vendas e veja o lucro projetado"
          expanded={sections.salesGoal} onToggle={() => toggle('salesGoal')} gradient />
        {sections.salesGoal && (
          <div className="space-y-4">
            <div className="max-w-xs">
              <InputField label="Meta de vendas (30 dias)" value={salesGoal} onChange={setSalesGoal} step={1} highlight
                tooltip="Quantas vendas você quer fazer no mês" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-5 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Apenas Produto Principal</p>
                <p className={`text-2xl font-mono font-bold ${profitMainOnly > 0 ? 'number-glow-safe' : 'number-glow-danger'}`}>
                  {formatBRL(profitMainOnly)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {salesGoal} vendas × {formatBRL(productCalc.netValuePerSale - cpaProjection.projectedCPA)} lucro/venda
                </p>
              </div>
              <div className="glass-card p-5 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Funil Completo</p>
                <p className={`text-2xl font-mono font-bold ${profitFullFunnel > 0 ? 'number-glow-safe' : 'number-glow-danger'}`}>
                  {formatBRL(profitFullFunnel)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {salesGoal} vendas × {formatBRL(funnelCalc.revenuePerClient - cpaProjection.projectedCPA)} lucro/venda (c/ funil)
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ===== TRAFFIC INPUTS ===== */}
      <motion.div variants={item} className="premium-card space-y-4">
        <SectionHeader icon={<Megaphone className="h-4 w-4 text-white" />} title="Métricas de Tráfego" desc="Dados das campanhas de anúncios"
          expanded={sections.traffic} onToggle={() => toggle('traffic')} gradient />
        {sections.traffic && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InputField label="Investimento em Ads" value={t.investment} prefix="R$" step={100} onChange={(v) => updateTraffic({ investment: v })} highlight />
              <InputField label="CPM" value={t.cpm} prefix="R$" step={0.5} onChange={(v) => updateTraffic({ cpm: v })} highlight tooltip="Custo por mil impressões" />
              <InputField label="CTR" value={t.ctr} suffix="%" step={0.1} onChange={(v) => updateTraffic({ ctr: v })} highlight tooltip="Taxa de clique" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald/10 flex items-center justify-center">
                <MousePointerClick className="h-4 w-4 text-emerald" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Funil de Conversão</h4>
                <p className="text-[11px] text-muted-foreground">Taxas de cada etapa</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InputField label="Connect Rate" value={t.connectRate} suffix="%" step={1} onChange={(v) => updateTraffic({ connectRate: v })} highlight />
              <InputField label="Página → Checkout" value={t.pageToCheckout} suffix="%" step={0.5} onChange={(v) => updateTraffic({ pageToCheckout: v })} highlight />
              <InputField label="Checkout → Compra" value={t.checkoutToPurchase} suffix="%" step={0.5} onChange={(v) => updateTraffic({ checkoutToPurchase: v })} highlight />
            </div>
          </div>
        )}
      </motion.div>

      {/* ===== FUNIL PROJETADO ===== */}
      <motion.div variants={item} className="premium-card space-y-4">
        <SectionHeader icon={<TrendingUp className="h-4 w-4 text-emerald" />} title="Funil Projetado" desc="Visualização do funil de tráfego"
          expanded={sections.funnel} onToggle={() => toggle('funnel')} bg="bg-emerald/10" />
        {sections.funnel && (
          <div className="space-y-3">
            <FunnelStep label="Impressões" value={formatNumber(cpaProjection.impressions, 0)} width={100} />
            <FunnelStep label="Cliques" value={formatNumber(cpaProjection.clicks, 0)} cost={formatBRL(cpaProjection.cpc)} width={(cpaProjection.clicks / cpaProjection.impressions) * 100} />
            <FunnelStep label="Visualizações" value={formatNumber(cpaProjection.pageViews, 0)} cost={formatBRL(cpaProjection.costPerPageView)} width={(cpaProjection.pageViews / cpaProjection.impressions) * 100} />
            <FunnelStep label="Checkouts" value={formatNumber(cpaProjection.checkouts, 0)} cost={formatBRL(cpaProjection.costPerCheckout)} width={(cpaProjection.checkouts / cpaProjection.impressions) * 100} />
            <FunnelStep label="Compras" value={formatNumber(cpaProjection.purchases, 0)} cost={formatBRL(cpaProjection.projectedCPA)} width={Math.max((cpaProjection.purchases / cpaProjection.impressions) * 100, 2)} highlight />
          </div>
        )}
      </motion.div>

      {/* ===== CENÁRIOS ===== */}
      <motion.div variants={item} className="premium-card space-y-4">
        <SectionHeader icon={<FlaskConical className="h-4 w-4 text-white" />} title="Cenários de Simulação" desc="Simule diferentes situações"
          expanded={sections.scenarios} onToggle={() => toggle('scenarios')} gradient />
        {sections.scenarios && (
          <div className="space-y-6">
            {/* Cenário 1 */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">01</span>
                <span className="text-sm font-bold text-foreground">Meta de Lucro por Venda</span>
              </div>
              <div className="space-y-3">
                <SentenceRow>
                  <span>Se eu quiser lucrar</span>
                  <InlineInput value={targetProfitPerSale} onChange={setTargetProfitPerSale} prefix="R$" />
                  <span>por venda, preciso de CPA:</span>
                  <CalcDisplay value={formatBRL(requiredCPA)} positive={requiredCPA > 0} />
                </SentenceRow>
                <SentenceRow>
                  <span>Com {mainProduct.salesGoal} vendas/mês → Lucro mensal:</span>
                  <CalcDisplay value={formatBRL(monthlyProfit)} positive={monthlyProfit > 0} />
                </SentenceRow>
                <SentenceRow>
                  <span>Investimento necessário:</span>
                  <CalcDisplay value={formatBRL(requiredInvestment)} positive={requiredInvestment > 0} />
                </SentenceRow>
              </div>
              {requiredCPA <= 0 && (
                <div className="flex items-start gap-3 bg-signal-danger rounded-xl p-4 border border-rose/20">
                  <AlertTriangle className="h-4 w-4 text-rose shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">Lucro desejado maior que o líquido por venda ({formatBRL(productCalc.netValuePerSale)}). Reduza o valor.</p>
                </div>
              )}
            </div>

            {/* Cenário 2 */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald bg-emerald/10 px-2.5 py-1 rounded-lg">02</span>
                <span className="text-sm font-bold text-foreground">CPA Fixo + Meta Mensal</span>
              </div>
              <div className="space-y-3">
                <SentenceRow>
                  <span>CPA máximo do produto:</span>
                  <CalcDisplay value={formatBRL(funnelCalc.cpaMaxProduct)} positive />
                  <span>Meta mensal:</span>
                  <InlineInput value={monthlyTarget2} onChange={setMonthlyTarget2} prefix="R$" />
                </SentenceRow>
                <SentenceRow>
                  <span>Com CPA de</span>
                  <InlineInput value={assumedCpa} onChange={setAssumedCpa} prefix="R$" />
                  <span>→</span>
                  <CalcDisplay value={`${formatNumber(scenario2.requiredSales, 0)} vendas`} positive />
                </SentenceRow>
                <SentenceRow>
                  <span>Investimento:</span>
                  <CalcDisplay value={formatBRL(scenario2.requiredInvestment)} positive={scenario2.requiredInvestment > 0 && isFinite(scenario2.requiredInvestment)} />
                  <span>Lucro/venda:</span>
                  <CalcDisplay value={formatBRL(scenario2.profitPerSale)} positive={scenario2.profitPerSale > 0} />
                </SentenceRow>
              </div>
              {assumedCpa > funnelCalc.cpaMaxProduct && (
                <div className="flex items-start gap-3 bg-signal-danger rounded-xl p-4 border border-rose/20">
                  <AlertTriangle className="h-4 w-4 text-rose shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">CPA de {formatBRL(assumedCpa)} acima do máximo de {formatBRL(funnelCalc.cpaMaxProduct)}.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* ===== ROI PROJECTION ===== */}
      <motion.div variants={item} className="premium-card space-y-4">
        <SectionHeader icon={<span className="text-amber font-bold text-xs">📈</span>} title="Projeção de ROI do Funil" desc="Qual CPA para cada nível de retorno"
          expanded={sections.roi} onToggle={() => toggle('roi')} bg="bg-amber/10" />
        {sections.roi && (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ROI</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Significado</th>
                  <th className="text-right py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">CPA Necessário</th>
                  <th className="text-right py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Investimento</th>
                </tr>
              </thead>
              <tbody>
                {funnelCalc.roiProjections.map((row) => (
                  <tr key={row.roi} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`font-mono font-bold text-sm ${row.roi === 0 ? 'signal-warning' : row.roi <= 2 ? 'text-foreground' : 'signal-safe'}`}>
                        {row.roi === 0 ? 'Break-even' : `${row.roi}x`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">
                      {row.roi === 0 && 'Não ganha nem perde'}
                      {row.roi === 1 && 'Lucra o dobro do investido'}
                      {row.roi === 2 && 'Lucra o triplo'}
                      {row.roi === 3 && 'Lucra 4x'}
                      {row.roi === 5 && 'Lucra 6x'}
                    </td>
                    <td className="py-3 px-3 text-right"><span className="font-mono text-sm font-semibold text-foreground">{formatBRL(row.cpaNeeded)}</span></td>
                    <td className="py-3 px-3 text-right"><span className="font-mono text-sm font-semibold text-foreground">{formatBRL(row.investmentNeeded)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ===== HEALTH DASHBOARD ===== */}
      <motion.div variants={item} className="premium-card space-y-4">
        <SectionHeader icon={<Activity className="h-4 w-4 text-white" />} title="Dashboard de Saúde Financeira" desc="Visão executiva da operação"
          expanded={sections.health} onToggle={() => toggle('health')} gradient />
        {sections.health && (
          <div className="space-y-5">
            {/* Gauge + Status */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-56 shrink-0">
                <ProfitabilityGauge cpaMax={funnelCalc.cpaMaxProduct} cpaProjected={cpaProjection.projectedCPA} />
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Faturamento Bruto" value={formatBRL(funnelCalc.totalGrossRevenue)} compact />
                  <MetricCard label="Faturamento Líquido" value={formatBRL(funnelCalc.totalNetRevenue)} signal="safe" compact />
                  <MetricCard label="Margem" value={formatPercent(margin)} signal={margin > 30 ? 'safe' : margin > 15 ? 'warning' : 'danger'} compact />
                  <MetricCard label="Break-even" value={`${funnelCalc.breakEvenSales} vendas`} compact />
                </div>
              </div>
            </div>

            {/* Health zones */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🎯 Zonas de Saúde do CPA</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <HealthZone emoji="🟢" label="Saudável" range={`${formatBRL(zones.healthy[0])} – ${formatBRL(zones.healthy[1])}`} active={healthProduct === 'healthy'} desc="Margem confortável" />
                <HealthZone emoji="🟡" label="Moderado" range={`${formatBRL(zones.moderate[0])} – ${formatBRL(zones.moderate[1])}`} active={healthProduct === 'moderate'} desc="Margem apertada" />
                <HealthZone emoji="🟠" label="Agressivo" range={`${formatBRL(zones.aggressive[0])} – ${formatBRL(zones.aggressive[1])}`} active={healthProduct === 'aggressive'} desc="Risco ao escalar" />
                <HealthZone emoji="🔴" label="Risco" range={`Acima de ${formatBRL(zones.dangerAbove)}`} active={healthProduct === 'danger'} desc="Provável prejuízo" />
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Composição de Receita</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueData} barSize={20} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--chart-text))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--chart-text))' }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={chartStyle} formatter={(v: number) => formatBRL(v)} />
                    <Bar dataKey="bruto" name="Bruto" radius={[4, 4, 0, 0]} fill="hsl(217, 91%, 60%)" />
                    <Bar dataKey="liquido" name="Líquido" radius={[4, 4, 0, 0]} fill="hsl(152, 69%, 45%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Distribuição de Custos</h4>
                <div className="flex items-center gap-6">
                  <div className="w-36 h-36 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={costPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
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
            </div>

            {/* CPA Comparison */}
            <div className="glass-card p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">CPA Máximo vs Projetado</h4>
              <div className="flex items-end gap-8 h-36 justify-center max-w-xs mx-auto">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <motion.div className="w-full rounded-t-xl" style={{ background: 'var(--gradient-primary)' }}
                    initial={{ height: 0 }} animate={{ height: `${(funnelCalc.cpaMaxProduct / Math.max(funnelCalc.cpaMaxProduct, cpaProjection.projectedCPA)) * 100}%` }}
                    transition={{ duration: 0.7 }} />
                  <span className="text-sm font-mono number-glow-primary font-bold">{formatBRL(funnelCalc.cpaMaxProduct)}</span>
                  <span className="text-[10px] text-muted-foreground">CPA Máx.</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <motion.div className={`w-full rounded-t-xl ${isDanger ? 'bg-rose' : 'bg-emerald'}`}
                    initial={{ height: 0 }} animate={{ height: `${(cpaProjection.projectedCPA / Math.max(funnelCalc.cpaMaxProduct, cpaProjection.projectedCPA)) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.1 }} />
                  <span className={`text-sm font-mono font-bold ${isDanger ? 'number-glow-danger' : 'number-glow-safe'}`}>{formatBRL(cpaProjection.projectedCPA)}</span>
                  <span className="text-[10px] text-muted-foreground">CPA Proj.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ===== Sub-components =====

function SectionHeader({ icon, title, desc, expanded, onToggle, gradient, bg }: {
  icon: React.ReactNode; title: string; desc: string; expanded: boolean; onToggle: () => void; gradient?: boolean; bg?: string;
}) {
  return (
    <button onClick={onToggle} className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg || ''}`}
          style={gradient ? { background: 'var(--gradient-primary)' } : undefined}>
          {icon}
        </div>
        <div className="text-left">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

function FunnelStep({ label, value, cost, width, highlight }: { label: string; value: string; cost?: string; width: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-muted-foreground w-24 shrink-0 font-medium">{label}</span>
      <div className="flex-1">
        <motion.div
          className={`h-9 rounded-lg flex items-center px-3 ${highlight ? '' : 'bg-secondary'}`}
          style={highlight ? { background: 'var(--gradient-primary)' } : undefined}
          initial={{ width: 0 }} animate={{ width: `${Math.max(width, 3)}%` }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}>
          <span className={`text-[11px] font-mono font-bold ${highlight ? 'text-white' : 'text-foreground'}`}>{value}</span>
        </motion.div>
      </div>
      {cost && <span className="text-[11px] font-mono text-muted-foreground w-24 text-right">{cost}/un</span>}
    </div>
  );
}

function SentenceRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground leading-relaxed">{children}</div>;
}

function InlineInput({ value, onChange, prefix }: { value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="inline-flex items-center gap-1 relative">
      {prefix && <span className="text-xs font-mono font-semibold text-primary">{prefix}</span>}
      <input type="number" value={value}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
        className="user-input w-28 text-center text-sm font-mono font-bold py-1.5" />
    </div>
  );
}

function CalcDisplay({ value, positive }: { value: string; positive: boolean }) {
  return (
    <span className={`inline-block rounded-lg px-3 py-1.5 text-sm font-mono font-bold border ${
      positive ? 'bg-emerald/10 border-emerald/20 text-emerald' : 'bg-rose/10 border-rose/20 text-rose'
    }`}>{value}</span>
  );
}

function HealthZone({ emoji, label, range, active, desc }: { emoji: string; label: string; range: string; active: boolean; desc: string }) {
  return (
    <div className={`p-4 rounded-xl text-center transition-all ${active ? 'glass-card ring-2 ring-primary scale-[1.02]' : 'bg-secondary/50'}`}>
      <span className="text-xl">{emoji}</span>
      <p className={`text-xs font-bold mt-1.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{range}</p>
      <p className="text-[9px] text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}
