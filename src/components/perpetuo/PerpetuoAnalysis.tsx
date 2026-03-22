import { useState, useRef, useMemo } from 'react';
import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatPercent, formatNumber, getHealthStatus, calcScenario2, calcCPAProjection, calcMainProduct, calcOffer } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import ProfitabilityGauge from '@/components/dashboard/ProfitabilityGauge';
import { motion } from 'framer-motion';
import {
  Activity, Megaphone, MousePointerClick, FlaskConical, AlertTriangle,
  TrendingUp, FileDown, Target, BarChart3, Layers, Zap, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Cell, Tooltip as RTooltip, PieChart, Pie, LineChart, Line, Area, AreaChart
} from 'recharts';

const fadeIn = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };

const chartTooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  color: 'hsl(var(--foreground))',
  fontSize: 12,
};

interface FunnelConfig {
  mainProductId: string;
  offers: { productId: string; role: 'orderbump' | 'upsell' | 'downsell'; conversionRate: number }[];
}

export default function PerpetuoAnalysis() {
  const { state, productCalc, funnelCalc, cpaProjection, updateTraffic } = useOperation();
  const t = state.traffic;
  const printRef = useRef<HTMLDivElement>(null);

  const [funnelCreated, setFunnelCreated] = useState(false);
  const [funnelDialogOpen, setFunnelDialogOpen] = useState(false);
  const [funnelConfig, setFunnelConfig] = useState<FunnelConfig>({ mainProductId: 'main', offers: [] });

  const [trafficMetrics, setTrafficMetrics] = useState({
    investment: t.investment, cpm: t.cpm, ctr: t.ctr,
    connectRate: t.connectRate, pageToCheckout: t.pageToCheckout, checkoutToPurchase: t.checkoutToPurchase,
  });

  const handleTrafficChange = (key: string, value: number) => {
    setTrafficMetrics(prev => ({ ...prev, [key]: value }));
    updateTraffic({ [key]: value });
  };

  const [targetProfitPerSale, setTargetProfitPerSale] = useState(50);
  const [assumedCpa, setAssumedCpa] = useState(25);
  const [monthlyTarget2, setMonthlyTarget2] = useState(20000);
  const [salesGoal, setSalesGoal] = useState(state.product.salesGoal);

  const allProducts = [
    { id: 'main', name: state.product.name, price: state.product.price },
    ...state.offers.map(o => ({ id: o.id, name: o.name, price: o.price })),
  ];

  // Funnel calculations
  const funnelAnalysis = useMemo(() => {
    if (!funnelCreated) return null;

    const mainProduct = state.product;
    const mainCalc = calcMainProduct(mainProduct);
    const cpaProj = calcCPAProjection(trafficMetrics as any, mainCalc.netValuePerSale, mainCalc.netValuePerSale);

    const offerAnalysis = funnelConfig.offers.map(fo => {
      const product = state.offers.find(o => o.id === fo.productId);
      if (!product) return null;
      const offerCalc = calcOffer({ ...product, conversionRate: fo.conversionRate }, cpaProj.purchases || salesGoal);
      return {
        ...fo,
        product,
        calc: offerCalc,
        sales: Math.floor((cpaProj.purchases || salesGoal) * (fo.conversionRate / 100)),
      };
    }).filter(Boolean) as any[];

    const totalMainSales = cpaProj.purchases || salesGoal;
    const funnelContribution = offerAnalysis.reduce((s: number, o: any) => s + o.calc.contributionPerMainSale, 0);
    const cpaMaxProduct = mainCalc.netValuePerSale;
    const cpaMaxFunnel = cpaMaxProduct + funnelContribution;
    const totalSalesAll = totalMainSales + offerAnalysis.reduce((s: number, o: any) => s + o.sales, 0);
    const profitPerSaleMain = mainCalc.netValuePerSale - cpaProj.projectedCPA;
    const profitPerSaleFunnel = cpaMaxFunnel - cpaProj.projectedCPA;

    // Revenue breakdown for chart
    const revenueBreakdown = [
      { name: mainProduct.name.slice(0, 15), bruto: mainProduct.price * totalMainSales, liquido: mainCalc.netValuePerSale * totalMainSales },
      ...offerAnalysis.map((oa: any) => ({
        name: oa.product.name.slice(0, 15),
        bruto: oa.product.price * oa.sales,
        liquido: oa.calc.netValuePerSale * oa.sales,
      })),
    ];

    // Cost composition
    const costComposition = [
      { name: 'Impostos', value: mainCalc.taxPerSale, color: 'hsl(38, 92%, 50%)' },
      { name: 'Plataforma', value: mainCalc.platformFeePerSale, color: 'hsl(217, 91%, 60%)' },
      { name: 'Comissão', value: mainCalc.commissionPerSale + mainProduct.otherFixedCosts, color: 'hsl(263, 70%, 58%)' },
      { name: 'Líquido', value: Math.max(mainCalc.netValuePerSale, 0), color: 'hsl(152, 69%, 45%)' },
    ].filter(d => d.value > 0);

    return {
      mainCalc, cpaProj, offerAnalysis, totalMainSales, totalSalesAll,
      cpaMaxProduct, cpaMaxFunnel, profitPerSaleMain, profitPerSaleFunnel,
      funnelContribution, revenueBreakdown, costComposition,
    };
  }, [funnelCreated, funnelConfig, state.product, state.offers, trafficMetrics, salesGoal]);

  const activeCpaMax = funnelAnalysis?.cpaMaxProduct ?? funnelCalc.cpaMaxProduct;
  const activeCpaMaxFunnel = funnelAnalysis?.cpaMaxFunnel ?? funnelCalc.cpaMaxFunnel;
  const activeCpaProjected = funnelAnalysis?.cpaProj.projectedCPA ?? cpaProjection.projectedCPA;
  const activeNetPerSale = funnelAnalysis?.mainCalc.netValuePerSale ?? productCalc.netValuePerSale;

  const healthProduct = getHealthStatus(activeCpaProjected, funnelCalc.healthZonesProduct);
  const signalMap = { healthy: 'safe' as const, moderate: 'warning' as const, aggressive: 'warning' as const, danger: 'danger' as const };
  const statusLabels = { healthy: '✅ Pode Escalar', moderate: '⚠️ Risco Moderado', aggressive: '🟠 Risco de Escala', danger: '🚨 Margem Crítica' };

  const delta = activeCpaMax - activeCpaProjected;
  const isDanger = delta < 0;
  const zones = funnelCalc.healthZonesProduct;

  // Scenario calcs
  const requiredCPA = activeNetPerSale - targetProfitPerSale;
  const monthlyProfit = targetProfitPerSale * salesGoal;
  const requiredInvestment = requiredCPA * salesGoal;
  const scenario2 = calcScenario2(assumedCpa, activeNetPerSale, monthlyTarget2);

  const profitMainOnly = (activeNetPerSale - activeCpaProjected) * salesGoal;
  const profitFullFunnel = (activeCpaMaxFunnel - activeCpaProjected) * salesGoal;
  const investmentNeeded = activeCpaProjected * salesGoal;

  // Funnel dialog helpers
  const addFunnelOffer = (role: 'orderbump' | 'upsell' | 'downsell') => {
    setFunnelConfig(prev => ({ ...prev, offers: [...prev.offers, { productId: '', role, conversionRate: role === 'orderbump' ? 15 : 10 }] }));
  };
  const updateFunnelOffer = (index: number, partial: Partial<FunnelConfig['offers'][0]>) => {
    setFunnelConfig(prev => ({ ...prev, offers: prev.offers.map((o, i) => i === index ? { ...o, ...partial } : o) }));
  };
  const removeFunnelOffer = (index: number) => {
    setFunnelConfig(prev => ({ ...prev, offers: prev.offers.filter((_, i) => i !== index) }));
  };
  const confirmFunnel = () => { setFunnelCreated(true); setFunnelDialogOpen(false); };

  const handleExportPDF = () => window.print();

  // Funnel stage data for visual
  const funnelStages = funnelAnalysis ? [
    { label: 'Impressões', value: funnelAnalysis.cpaProj.impressions, cost: trafficMetrics.cpm / 1000, pct: 100 },
    { label: 'Cliques', value: funnelAnalysis.cpaProj.clicks, cost: funnelAnalysis.cpaProj.cpc, pct: (funnelAnalysis.cpaProj.clicks / funnelAnalysis.cpaProj.impressions) * 100 },
    { label: 'Visualizações', value: funnelAnalysis.cpaProj.pageViews, cost: funnelAnalysis.cpaProj.costPerPageView, pct: (funnelAnalysis.cpaProj.pageViews / funnelAnalysis.cpaProj.impressions) * 100 },
    { label: 'Checkouts', value: funnelAnalysis.cpaProj.checkouts, cost: funnelAnalysis.cpaProj.costPerCheckout, pct: (funnelAnalysis.cpaProj.checkouts / funnelAnalysis.cpaProj.impressions) * 100 },
    { label: 'Compras', value: funnelAnalysis.cpaProj.purchases, cost: funnelAnalysis.cpaProj.projectedCPA, pct: (funnelAnalysis.cpaProj.purchases / funnelAnalysis.cpaProj.impressions) * 100 },
  ] : [];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-8" ref={printRef}>
      {/* Header */}
      <motion.div variants={fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Análise Perpétuo</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie seu funil, simule tráfego e visualize a projeção completa da operação.</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {funnelCreated && (
            <Button variant="outline" onClick={handleExportPDF} className="gap-2">
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
          )}
        </div>
      </motion.div>

      {/* ===== STEP 1: FUNNEL BUILDER ===== */}
      <motion.div variants={fadeIn} className="section-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Configuração do Funil</h2>
              <p className="text-xs text-muted-foreground">Selecione os produtos que compõem seu funil perpétuo.</p>
            </div>
          </div>
          <Button onClick={() => setFunnelDialogOpen(true)} className="font-semibold text-sm text-primary-foreground gap-2" style={{ background: 'var(--gradient-primary)' }}>
            <Zap className="h-4 w-4" /> {funnelCreated ? 'Editar Funil' : 'Criar Funil'}
          </Button>
        </div>

        {funnelCreated ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-center">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Principal</span>
              <p className="text-sm font-semibold text-foreground mt-1">{state.product.name}</p>
              <p className="text-xs font-mono text-muted-foreground">{formatBRL(state.product.price)}</p>
            </div>
            {funnelConfig.offers.map((fo, i) => {
              const prod = state.offers.find(o => o.id === fo.productId);
              if (!prod) return null;
              const roleColors = { orderbump: 'border-primary/20 bg-primary/5', upsell: 'border-emerald/20 bg-emerald/5', downsell: 'border-amber/20 bg-amber/5' };
              const roleText = { orderbump: 'text-primary', upsell: 'text-emerald', downsell: 'text-amber' };
              return (
                <div key={i} className={`rounded-xl border p-4 text-center ${roleColors[fo.role]}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${roleText[fo.role]}`}>{fo.role}</span>
                  <p className="text-sm font-semibold text-foreground mt-1">{prod.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{formatBRL(prod.price)} · {fo.conversionRate}%</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Monte seu funil para visualizar a projeção completa.</p>
          </div>
        )}
      </motion.div>

      {/* ===== STEP 2: TRAFFIC METRICS ===== */}
      {funnelCreated && (
        <motion.div variants={fadeIn} className="section-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-amber" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Métricas de Tráfego</h2>
              <p className="text-xs text-muted-foreground">Ajuste os valores para simular diferentes cenários em tempo real.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <InputField label="Investimento" value={trafficMetrics.investment} prefix="R$" step={100} onChange={(v) => handleTrafficChange('investment', v)} highlight />
            <InputField label="CPM" value={trafficMetrics.cpm} prefix="R$" step={0.5} onChange={(v) => handleTrafficChange('cpm', v)} highlight tooltip="Custo por mil impressões" />
            <InputField label="CTR" value={trafficMetrics.ctr} suffix="%" step={0.1} onChange={(v) => handleTrafficChange('ctr', v)} highlight tooltip="Taxa de clique nos anúncios" />
            <InputField label="Connect Rate" value={trafficMetrics.connectRate} suffix="%" step={1} onChange={(v) => handleTrafficChange('connectRate', v)} highlight tooltip="% dos cliques que carregam a página" />
            <InputField label="Pág → Checkout" value={trafficMetrics.pageToCheckout} suffix="%" step={0.5} onChange={(v) => handleTrafficChange('pageToCheckout', v)} highlight tooltip="% que iniciam o checkout" />
            <InputField label="Checkout → Compra" value={trafficMetrics.checkoutToPurchase} suffix="%" step={0.5} onChange={(v) => handleTrafficChange('checkoutToPurchase', v)} highlight tooltip="% que finalizam a compra" />
          </div>
        </motion.div>
      )}

      {/* ===== STEP 3: ANALYSIS DASHBOARD ===== */}
      {funnelCreated && funnelAnalysis && (
        <>
          {/* Hero KPIs */}
          <motion.div variants={fadeIn}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="CPA Máx. Produto" value={formatBRL(funnelAnalysis.cpaMaxProduct)} signal="primary"
                tooltip="Máximo que você pode pagar por aquisição (só produto)" icon={<Target className="h-4 w-4" />} />
              <MetricCard label="CPA Máx. Funil" value={formatBRL(funnelAnalysis.cpaMaxFunnel)} signal="safe"
                tooltip="Máximo considerando todo o funil" icon={<Layers className="h-4 w-4" />} />
              <MetricCard label="CPA Projetado" value={formatBRL(activeCpaProjected)} signal={signalMap[healthProduct]}
                tooltip="Custo por aquisição projetado com as métricas atuais" icon={<Megaphone className="h-4 w-4" />} />
              <MetricCard label="Vendas Projetadas" value={formatNumber(funnelAnalysis.totalMainSales, 0)}
                tooltip="Volume de vendas do produto principal" icon={<TrendingUp className="h-4 w-4" />} />
            </div>
          </motion.div>

          {/* Scalability Banner */}
          <motion.div variants={fadeIn} className={`section-card ${isDanger ? 'bg-signal-danger border-rose/20' : 'bg-signal-safe border-emerald/20'}`}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 text-center md:text-left">
                <p className={`text-xl font-bold tracking-tight ${isDanger ? 'signal-danger' : 'signal-safe'}`}>
                  {statusLabels[healthProduct]}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {!isDanger
                    ? `CPA projetado está ${formatBRL(Math.abs(delta))} abaixo do limite.`
                    : `CPA projetado excede o máximo em ${formatBRL(Math.abs(delta))}.`}
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-lg font-bold shrink-0">
                <div className="text-center">
                  <p className={!isDanger ? 'number-glow-safe' : 'number-glow-danger'}>{formatBRL(activeCpaProjected)}</p>
                  <p className="text-[10px] text-muted-foreground font-sans font-normal">Projetado</p>
                </div>
                <span className="text-muted-foreground text-sm">vs</span>
                <div className="text-center">
                  <p className="number-glow-primary">{formatBRL(activeCpaMax)}</p>
                  <p className="text-[10px] text-muted-foreground font-sans font-normal">Máximo</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Profit & Revenue Grid */}
          <motion.div variants={fadeIn} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Profit Cards */}
            <div className="section-card">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">📊 Lucro por Venda</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-secondary/60 p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Apenas Produto</p>
                  <p className={`text-2xl font-mono font-bold ${funnelAnalysis.profitPerSaleMain > 0 ? 'number-glow-safe' : 'number-glow-danger'}`}>
                    {formatBRL(funnelAnalysis.profitPerSaleMain)}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Funil Completo</p>
                  <p className={`text-2xl font-mono font-bold ${funnelAnalysis.profitPerSaleFunnel > 0 ? 'number-glow-safe' : 'number-glow-danger'}`}>
                    {formatBRL(funnelAnalysis.profitPerSaleFunnel)}
                  </p>
                </div>
              </div>
            </div>

            {/* Sales breakdown */}
            <div className="section-card">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">🛒 Vendas por Produto</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{state.product.name}</span>
                  <span className="text-sm font-mono font-bold text-foreground">{formatNumber(funnelAnalysis.totalMainSales, 0)} un</span>
                </div>
                {funnelAnalysis.offerAnalysis.map((oa: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{oa.product.name}</span>
                      <span className="text-[10px] text-muted-foreground">({oa.conversionRate}%)</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-foreground">{formatNumber(oa.sales, 0)} un</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Sales Goal Simulator */}
          <motion.div variants={fadeIn} className="section-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Simulador de Meta</h2>
                <p className="text-xs text-muted-foreground">Defina uma meta de vendas e veja o lucro projetado.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div>
                <InputField label="Meta de vendas (30 dias)" value={salesGoal} onChange={setSalesGoal} step={1} highlight />
              </div>
              <div className="rounded-xl bg-secondary/60 p-5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Lucro (Produto)</p>
                <p className={`text-2xl font-mono font-bold ${profitMainOnly > 0 ? 'number-glow-safe' : 'number-glow-danger'}`}>
                  {formatBRL(profitMainOnly)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Investimento: {formatBRL(investmentNeeded)}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Lucro (Funil)</p>
                <p className={`text-2xl font-mono font-bold ${profitFullFunnel > 0 ? 'number-glow-safe' : 'number-glow-danger'}`}>
                  {formatBRL(profitFullFunnel)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Investimento: {formatBRL(investmentNeeded)}</p>
              </div>
            </div>
          </motion.div>

          {/* Funnel Stages Visual */}
          <motion.div variants={fadeIn} className="section-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center">
                <MousePointerClick className="h-5 w-5 text-emerald" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Custo por Etapa do Funil</h2>
                <p className="text-xs text-muted-foreground">Simulação de quanto você paga em cada etapa.</p>
              </div>
            </div>
            <div className="space-y-3">
              {funnelStages.map((stage, i) => {
                const isLast = i === funnelStages.length - 1;
                const barWidth = Math.max(stage.pct, 2);
                return (
                  <div key={stage.label} className="grid grid-cols-[120px_1fr_100px] md:grid-cols-[140px_1fr_120px] items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground text-right">{stage.label}</span>
                    <div className="relative h-10 bg-secondary/60 rounded-lg overflow-hidden">
                      <motion.div
                        className={`h-full rounded-lg flex items-center px-3 ${isLast ? '' : 'bg-primary/20'}`}
                        style={isLast ? { background: 'var(--gradient-primary)' } : undefined}
                        initial={{ width: 0 }} animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                      >
                        <span className={`text-xs font-mono font-bold whitespace-nowrap ${isLast ? 'text-white' : 'text-foreground'}`}>
                          {formatNumber(stage.value, 0)}
                        </span>
                      </motion.div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{formatBRL(stage.cost)}/un</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Charts Row */}
          <motion.div variants={fadeIn} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="section-card">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Composição de Receita</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnelAnalysis.revenueBreakdown} barSize={24} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--chart-text))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--chart-text))' }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="bruto" name="Bruto" radius={[6, 6, 0, 0]} fill="hsl(217, 91%, 60%)" />
                  <Bar dataKey="liquido" name="Líquido" radius={[6, 6, 0, 0]} fill="hsl(152, 69%, 45%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="section-card">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Distribuição de Custos</h3>
              <div className="flex items-center gap-6">
                <div className="w-40 h-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={funnelAnalysis.costComposition} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                        {funnelAnalysis.costComposition.map((d: any, i: number) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <RTooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatBRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {funnelAnalysis.costComposition.map((d: any) => (
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

          {/* CPA Comparison Visual */}
          <motion.div variants={fadeIn} className="section-card">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">CPA Máximo vs Projetado</h3>
            <div className="flex items-end gap-10 h-40 justify-center max-w-sm mx-auto">
              <div className="flex-1 flex flex-col items-center gap-2">
                <motion.div className="w-full rounded-t-xl" style={{ background: 'var(--gradient-primary)' }}
                  initial={{ height: 0 }} animate={{ height: `${(activeCpaMax / Math.max(activeCpaMax, activeCpaProjected)) * 100}%` }}
                  transition={{ duration: 0.7 }} />
                <span className="text-base font-mono number-glow-primary font-bold">{formatBRL(activeCpaMax)}</span>
                <span className="text-[10px] text-muted-foreground">CPA Máximo</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-2">
                <motion.div className={`w-full rounded-t-xl ${isDanger ? 'bg-rose' : 'bg-emerald'}`}
                  initial={{ height: 0 }} animate={{ height: `${(activeCpaProjected / Math.max(activeCpaMax, activeCpaProjected)) * 100}%` }}
                  transition={{ duration: 0.7, delay: 0.1 }} />
                <span className={`text-base font-mono font-bold ${isDanger ? 'number-glow-danger' : 'number-glow-safe'}`}>{formatBRL(activeCpaProjected)}</span>
                <span className="text-[10px] text-muted-foreground">CPA Projetado</span>
              </div>
            </div>
          </motion.div>

          {/* Scenarios */}
          <motion.div variants={fadeIn} className="section-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet/10 flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-violet" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Cenários de Simulação</h2>
                <p className="text-xs text-muted-foreground">Simule diferentes situações para a sua operação.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cenário 1 */}
              <div className="rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">01</span>
                  <span className="text-sm font-bold text-foreground">Meta de Lucro por Venda</span>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                    <span>Se eu quiser lucrar</span>
                    <InlineInput value={targetProfitPerSale} onChange={setTargetProfitPerSale} prefix="R$" />
                    <span>por venda:</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <ResultBox label="CPA necessário" value={formatBRL(requiredCPA)} positive={requiredCPA > 0} />
                    <ResultBox label="Lucro mensal" value={formatBRL(monthlyProfit)} positive={monthlyProfit > 0} />
                    <ResultBox label="Investimento" value={formatBRL(requiredInvestment)} positive={requiredInvestment > 0} />
                  </div>
                  {requiredCPA <= 0 && (
                    <div className="flex items-start gap-2 bg-signal-danger rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 text-rose shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">Lucro desejado maior que o líquido por venda ({formatBRL(activeNetPerSale)}).</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cenário 2 */}
              <div className="rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald/10 flex items-center justify-center text-xs font-bold text-emerald">02</span>
                  <span className="text-sm font-bold text-foreground">CPA Fixo + Meta Mensal</span>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                    <span>Com CPA de</span>
                    <InlineInput value={assumedCpa} onChange={setAssumedCpa} prefix="R$" />
                    <span>e meta de</span>
                    <InlineInput value={monthlyTarget2} onChange={setMonthlyTarget2} prefix="R$" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <ResultBox label="Vendas necessárias" value={`${formatNumber(scenario2.requiredSales, 0)}`} positive />
                    <ResultBox label="Investimento" value={formatBRL(scenario2.requiredInvestment)} positive={isFinite(scenario2.requiredInvestment)} />
                    <ResultBox label="Lucro/venda" value={formatBRL(scenario2.profitPerSale)} positive={scenario2.profitPerSale > 0} />
                  </div>
                  {assumedCpa > activeCpaMax && (
                    <div className="flex items-start gap-2 bg-signal-danger rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 text-rose shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">CPA acima do máximo de {formatBRL(activeCpaMax)}.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Health Dashboard */}
          <motion.div variants={fadeIn} className="section-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Dashboard de Saúde Financeira</h2>
                <p className="text-xs text-muted-foreground">Visão executiva da operação.</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-8 mb-6">
              <div className="w-56 shrink-0">
                <ProfitabilityGauge cpaMax={activeCpaMax} cpaProjected={activeCpaProjected} />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                <MetricCard label="Fat. Bruto" value={formatBRL(funnelCalc.totalGrossRevenue)} compact />
                <MetricCard label="Fat. Líquido" value={formatBRL(funnelCalc.totalNetRevenue)} signal="safe" compact
                  subtitle={`Investimento: ${formatBRL(investmentNeeded)}`} />
                <MetricCard label="Margem" value={formatPercent(funnelCalc.totalGrossRevenue > 0 ? (funnelCalc.totalNetRevenue / funnelCalc.totalGrossRevenue) * 100 : 0)}
                  signal={funnelCalc.totalGrossRevenue > 0 && (funnelCalc.totalNetRevenue / funnelCalc.totalGrossRevenue) * 100 > 30 ? 'safe' : 'warning'} compact />
                <MetricCard label="Break-even" value={`${funnelCalc.breakEvenSales} vendas`} compact />
              </div>
            </div>

            {/* Health zones */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <HealthZone emoji="🟢" label="Saudável" range={`${formatBRL(zones.healthy[0])} – ${formatBRL(zones.healthy[1])}`} active={healthProduct === 'healthy'} />
              <HealthZone emoji="🟡" label="Moderado" range={`${formatBRL(zones.moderate[0])} – ${formatBRL(zones.moderate[1])}`} active={healthProduct === 'moderate'} />
              <HealthZone emoji="🟠" label="Agressivo" range={`${formatBRL(zones.aggressive[0])} – ${formatBRL(zones.aggressive[1])}`} active={healthProduct === 'aggressive'} />
              <HealthZone emoji="🔴" label="Risco" range={`Acima de ${formatBRL(zones.dangerAbove)}`} active={healthProduct === 'danger'} />
            </div>
          </motion.div>
        </>
      )}

      {/* ===== FUNNEL BUILDER DIALOG ===== */}
      <Dialog open={funnelDialogOpen} onOpenChange={setFunnelDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Configurar Funil Perpétuo</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Main product */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Produto Principal</label>
              <Select value={funnelConfig.mainProductId} onValueChange={(val) => setFunnelConfig(prev => ({ ...prev, mainProductId: val }))}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecione o produto principal..." />
                </SelectTrigger>
                <SelectContent>
                  {allProducts.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">{p.name} — {formatBRL(p.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Funnel offers */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ofertas do Funil</label>
              {funnelConfig.offers.map((fo, i) => {
                const roleColors = { orderbump: 'text-primary', upsell: 'text-emerald', downsell: 'text-amber' };
                return (
                  <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${roleColors[fo.role]} uppercase`}>{fo.role}</span>
                      <button onClick={() => removeFunnelOffer(i)} className="text-muted-foreground hover:text-destructive text-sm p-1">✕</button>
                    </div>
                    <Select value={fo.productId} onValueChange={(val) => updateFunnelOffer(i, { productId: val })}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione um produto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {state.offers.map(o => (
                          <SelectItem key={o.id} value={o.id} className="text-xs">{o.name} — {formatBRL(o.price)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <InputField label="Taxa de conversão esperada" value={fo.conversionRate} suffix="%" step={1}
                      onChange={(v) => updateFunnelOffer(i, { conversionRate: v })} highlight
                      tooltip="De cada 100 compradores do principal, quantos compram este produto?" />
                  </div>
                );
              })}

              {state.offers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Cadastre produtos secundários na aba "Cadastro" primeiro.
                </p>
              )}

              {state.offers.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {(['orderbump', 'upsell', 'downsell'] as const).map(role => (
                    <Button key={role} variant="outline" size="sm" onClick={() => addFunnelOffer(role)} className="text-[10px] border-dashed h-9">
                      + {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={confirmFunnel} className="w-full font-semibold text-primary-foreground" style={{ background: 'var(--gradient-primary)' }}
              disabled={funnelConfig.offers.some(o => !o.productId)}>
              <Zap className="h-4 w-4 mr-2" /> {funnelCreated ? 'Atualizar Funil' : 'Criar Funil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ===== Sub-components =====

function InlineInput({ value, onChange, prefix }: { value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="inline-flex items-center gap-1">
      {prefix && <span className="text-xs font-mono font-semibold text-primary">{prefix}</span>}
      <input type="number" value={value}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
        className="user-input w-24 text-center text-sm font-mono font-bold py-1.5" />
    </div>
  );
}

function ResultBox({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center border ${positive ? 'bg-emerald/5 border-emerald/20' : 'bg-rose/5 border-rose/20'}`}>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-mono font-bold ${positive ? 'text-emerald' : 'text-rose'}`}>{value}</p>
    </div>
  );
}

function HealthZone({ emoji, label, range, active }: { emoji: string; label: string; range: string; active: boolean }) {
  return (
    <div className={`p-4 rounded-xl text-center transition-all ${active ? 'bg-card border-2 border-primary shadow-md scale-[1.02]' : 'bg-secondary/50 border border-transparent'}`}>
      <span className="text-xl">{emoji}</span>
      <p className={`text-xs font-bold mt-1.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{range}</p>
    </div>
  );
}
