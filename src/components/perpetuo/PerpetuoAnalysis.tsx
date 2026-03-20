import { useState, useRef, useMemo } from 'react';
import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatPercent, formatNumber, getHealthStatus, calcScenario2, calcCPAProjection, calcMainProduct, calcOffer } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import ProfitabilityGauge from '@/components/dashboard/ProfitabilityGauge';
import { motion } from 'framer-motion';
import {
  Activity, Megaphone, MousePointerClick, FlaskConical, AlertTriangle,
  TrendingUp, FileDown, ChevronDown, ChevronUp, Target, BarChart3, Layers, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface FunnelConfig {
  mainProductId: string;
  offers: { productId: string; role: 'orderbump' | 'upsell' | 'downsell'; conversionRate: number }[];
}

export default function PerpetuoAnalysis() {
  const { state, productCalc, funnelCalc, cpaProjection, updateTraffic } = useOperation();
  const t = state.traffic;
  const printRef = useRef<HTMLDivElement>(null);

  // Funnel builder state
  const [funnelCreated, setFunnelCreated] = useState(false);
  const [funnelDialogOpen, setFunnelDialogOpen] = useState(false);
  const [funnelConfig, setFunnelConfig] = useState<FunnelConfig>({
    mainProductId: 'main',
    offers: [],
  });

  // Traffic metrics (local, editable inline)
  const [trafficMetrics, setTrafficMetrics] = useState({
    investment: t.investment,
    cpm: t.cpm,
    ctr: t.ctr,
    connectRate: t.connectRate,
    pageToCheckout: t.pageToCheckout,
    checkoutToPurchase: t.checkoutToPurchase,
  });

  // Sync traffic to context
  const handleTrafficChange = (key: string, value: number) => {
    setTrafficMetrics(prev => ({ ...prev, [key]: value }));
    updateTraffic({ [key]: value });
  };

  // Section toggles
  const [sections, setSections] = useState({
    funnel: true, traffic: true, analysis: true, scenarios: true, health: true,
  });
  const toggle = (s: keyof typeof sections) => setSections(prev => ({ ...prev, [s]: !prev[s] }));

  // Scenario states
  const [targetProfitPerSale, setTargetProfitPerSale] = useState(50);
  const [assumedCpa, setAssumedCpa] = useState(25);
  const [monthlyTarget2, setMonthlyTarget2] = useState(20000);
  const [salesGoal, setSalesGoal] = useState(state.product.salesGoal);

  // All available products (main + offers)
  const allProducts = [
    { id: 'main', name: state.product.name, price: state.product.price },
    ...state.offers.map(o => ({ id: o.id, name: o.name, price: o.price })),
  ];

  // Funnel calculations
  const funnelAnalysis = useMemo(() => {
    if (!funnelCreated) return null;

    const mainProduct = state.product;
    const mainCalc = calcMainProduct(mainProduct);

    // Calculate CPA projection based on traffic
    const cpaProj = calcCPAProjection(trafficMetrics as any, mainCalc.netValuePerSale, mainCalc.netValuePerSale);

    // Per-offer analysis
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

    return {
      mainCalc,
      cpaProj,
      offerAnalysis,
      totalMainSales,
      totalSalesAll,
      cpaMaxProduct,
      cpaMaxFunnel,
      profitPerSaleMain,
      profitPerSaleFunnel,
      funnelContribution,
    };
  }, [funnelCreated, funnelConfig, state.product, state.offers, trafficMetrics, salesGoal]);

  // Use context values when funnel not created, otherwise local
  const activeCpaMax = funnelAnalysis?.cpaMaxProduct ?? funnelCalc.cpaMaxProduct;
  const activeCpaMaxFunnel = funnelAnalysis?.cpaMaxFunnel ?? funnelCalc.cpaMaxFunnel;
  const activeCpaProjected = funnelAnalysis?.cpaProj.projectedCPA ?? cpaProjection.projectedCPA;
  const activeNetPerSale = funnelAnalysis?.mainCalc.netValuePerSale ?? productCalc.netValuePerSale;

  const healthProduct = getHealthStatus(activeCpaProjected, funnelCalc.healthZonesProduct);
  const signalMap = { healthy: 'safe' as const, moderate: 'warning' as const, aggressive: 'warning' as const, danger: 'danger' as const };
  const statusLabels = { healthy: '✅ Pode Escalar', moderate: '⚠️ Risco Moderado', aggressive: '🟠 Risco de Escala', danger: '🚨 Margem Crítica' };

  const delta = activeCpaMax - activeCpaProjected;
  const isDanger = delta < 0;
  const margin = funnelCalc.totalGrossRevenue > 0 ? (funnelCalc.totalNetRevenue / funnelCalc.totalGrossRevenue) * 100 : 0;
  const zones = funnelCalc.healthZonesProduct;

  // Scenario calcs
  const requiredCPA = activeNetPerSale - targetProfitPerSale;
  const monthlyProfit = targetProfitPerSale * salesGoal;
  const requiredInvestment = requiredCPA * salesGoal;
  const scenario2 = calcScenario2(assumedCpa, activeNetPerSale, monthlyTarget2);

  const profitMainOnly = (activeNetPerSale - activeCpaProjected) * salesGoal;
  const profitFullFunnel = (activeCpaMaxFunnel - activeCpaProjected) * salesGoal;

  // Revenue chart data
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

  const handleExportPDF = () => window.print();

  // Funnel dialog handlers
  const addFunnelOffer = (role: 'orderbump' | 'upsell' | 'downsell') => {
    setFunnelConfig(prev => ({
      ...prev,
      offers: [...prev.offers, { productId: '', role, conversionRate: role === 'orderbump' ? 15 : 10 }],
    }));
  };

  const updateFunnelOffer = (index: number, partial: Partial<FunnelConfig['offers'][0]>) => {
    setFunnelConfig(prev => ({
      ...prev,
      offers: prev.offers.map((o, i) => i === index ? { ...o, ...partial } : o),
    }));
  };

  const removeFunnelOffer = (index: number) => {
    setFunnelConfig(prev => ({ ...prev, offers: prev.offers.filter((_, i) => i !== index) }));
  };

  const confirmFunnel = () => {
    setFunnelCreated(true);
    setFunnelDialogOpen(false);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6" ref={printRef}>
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground tracking-tight">Análise Perpétuo</h2>
            <span className="tag-auto">⚡ Tempo real</span>
          </div>
          <p className="text-xs text-muted-foreground">Crie seu funil, configure métricas de tráfego e veja a projeção completa da operação.</p>
        </div>
        <Button variant="outline" onClick={handleExportPDF} className="gap-2 print:hidden">
          <FileDown className="h-4 w-4" /> Exportar PDF
        </Button>
      </motion.div>

      {/* ===== 1. FUNNEL BUILDER ===== */}
      <motion.div variants={item} className="premium-card space-y-4">
        <SectionHeader icon={<Layers className="h-4 w-4 text-white" />} title="Configuração do Funil" desc="Selecione os produtos que compõem o funil perpétuo"
          expanded={sections.funnel} onToggle={() => toggle('funnel')} gradient />
        {sections.funnel && (
          <div className="space-y-4">
            {!funnelCreated ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Layers className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">Monte seu funil selecionando produto principal e ofertas complementares.</p>
                <Button onClick={() => setFunnelDialogOpen(true)} className="font-semibold text-white" style={{ background: 'var(--gradient-primary)' }}>
                  <Zap className="h-4 w-4 mr-2" /> Criar Funil
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show funnel summary */}
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">Funil Ativo</p>
                    <Button variant="outline" size="sm" onClick={() => setFunnelDialogOpen(true)} className="text-xs h-7">
                      Editar Funil
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">PRINCIPAL</span>
                      <span className="text-sm text-foreground">{state.product.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{formatBRL(state.product.price)}</span>
                    </div>
                    {funnelConfig.offers.map((fo, i) => {
                      const prod = state.offers.find(o => o.id === fo.productId);
                      if (!prod) return null;
                      const roleColors = { orderbump: 'bg-primary/10 text-primary', upsell: 'bg-emerald/10 text-emerald', downsell: 'bg-amber/10 text-amber' };
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${roleColors[fo.role]}`}>
                            {fo.role.toUpperCase()}
                          </span>
                          <span className="text-sm text-foreground">{prod.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{formatBRL(prod.price)}</span>
                          <span className="text-[10px] text-muted-foreground">({fo.conversionRate}% conv.)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ===== 2. TRAFFIC METRICS (always visible, editable inline) ===== */}
      {funnelCreated && (
        <motion.div variants={item} className="premium-card space-y-4">
          <SectionHeader icon={<Megaphone className="h-4 w-4 text-white" />} title="Métricas de Tráfego" desc="Ajuste rapidamente para simular diferentes cenários"
            expanded={sections.traffic} onToggle={() => toggle('traffic')} gradient />
          {sections.traffic && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <InputField label="Investimento" value={trafficMetrics.investment} prefix="R$" step={100}
                  onChange={(v) => handleTrafficChange('investment', v)} highlight />
                <InputField label="CPM" value={trafficMetrics.cpm} prefix="R$" step={0.5}
                  onChange={(v) => handleTrafficChange('cpm', v)} highlight tooltip="Custo por mil impressões" />
                <InputField label="CTR" value={trafficMetrics.ctr} suffix="%" step={0.1}
                  onChange={(v) => handleTrafficChange('ctr', v)} highlight tooltip="Taxa de clique nos anúncios" />
                <InputField label="Connect Rate" value={trafficMetrics.connectRate} suffix="%" step={1}
                  onChange={(v) => handleTrafficChange('connectRate', v)} highlight tooltip="% de cliques que chegam na página" />
                <InputField label="Página → Checkout" value={trafficMetrics.pageToCheckout} suffix="%" step={0.5}
                  onChange={(v) => handleTrafficChange('pageToCheckout', v)} highlight tooltip="% que iniciam checkout" />
                <InputField label="Checkout → Compra" value={trafficMetrics.checkoutToPurchase} suffix="%" step={0.5}
                  onChange={(v) => handleTrafficChange('checkoutToPurchase', v)} highlight tooltip="% que finalizam compra" />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ===== 3. FULL ANALYSIS (after funnel created) ===== */}
      {funnelCreated && funnelAnalysis && (
        <>
          {/* KPIs */}
          <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <MetricCard label="CPA Máx. (Produto)" value={formatBRL(funnelAnalysis.cpaMaxProduct)} signal="primary"
              tooltip="CPA máximo considerando apenas o produto principal" />
            <MetricCard label="CPA Máx. (Funil)" value={formatBRL(funnelAnalysis.cpaMaxFunnel)} signal="safe"
              tooltip="CPA máximo considerando o funil completo" />
            <MetricCard label="Vendas Totais" value={formatNumber(funnelAnalysis.totalSalesAll, 0)}
              tooltip="Total de vendas incluindo todos os produtos" />
            <MetricCard label="Vendas Principal" value={formatNumber(funnelAnalysis.totalMainSales, 0)}
              tooltip="Vendas do produto principal" />
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <MetricCard label="Lucro/venda (Produto)" value={formatBRL(funnelAnalysis.profitPerSaleMain)}
              signal={funnelAnalysis.profitPerSaleMain > 0 ? 'safe' : 'danger'}
              tooltip="Lucro por venda considerando apenas o produto principal" />
            <MetricCard label="Lucro/venda (Funil)" value={formatBRL(funnelAnalysis.profitPerSaleFunnel)}
              signal={funnelAnalysis.profitPerSaleFunnel > 0 ? 'safe' : 'danger'}
              tooltip="Lucro por venda considerando todos os produtos" />
            <MetricCard label="CPA Projetado" value={formatBRL(funnelAnalysis.cpaProj.projectedCPA)}
              signal={signalMap[healthProduct]} tooltip="Custo por aquisição projetado" />
            <MetricCard label="LTV por Cliente" value={formatBRL(funnelAnalysis.cpaMaxFunnel)} signal="safe"
              tooltip="Receita líquida total por cliente" />
          </motion.div>

          {/* Individual offer sales */}
          {funnelAnalysis.offerAnalysis.length > 0 && (
            <motion.div variants={item} className="premium-card">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Vendas por Produto</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="glass-card p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{state.product.name}</p>
                  <p className="text-lg font-mono font-bold text-foreground">{formatNumber(funnelAnalysis.totalMainSales, 0)}</p>
                  <p className="text-[10px] text-muted-foreground">vendas</p>
                </div>
                {funnelAnalysis.offerAnalysis.map((oa: any, i: number) => (
                  <div key={i} className="glass-card p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{oa.product.name}</p>
                    <p className="text-lg font-mono font-bold text-foreground">{formatNumber(oa.sales, 0)}</p>
                    <p className="text-[10px] text-muted-foreground">vendas ({oa.conversionRate}% conv.)</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scalability Banner */}
          <motion.div variants={item} className={`premium-card ${isDanger ? 'bg-signal-danger' : 'bg-signal-safe'}`}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 text-center md:text-left">
                <p className={`text-xl font-bold tracking-tight ${isDanger ? 'signal-danger' : 'signal-safe'}`}>
                  {statusLabels[healthProduct]}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {!isDanger
                    ? `CPA projetado está ${formatBRL(Math.abs(delta))} abaixo do limite. Margem para escalar!`
                    : `CPA projetado excede o máximo em ${formatBRL(Math.abs(delta))}. Ajuste as métricas.`
                  }
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono text-xl font-bold shrink-0">
                <span className={!isDanger ? 'number-glow-safe' : 'number-glow-danger'}>{formatBRL(activeCpaProjected)}</span>
                <span className="text-muted-foreground text-sm">vs</span>
                <span className="number-glow-primary">{formatBRL(activeCpaMax)}</span>
              </div>
            </div>
          </motion.div>

          {/* Funnel cost per stage */}
          <motion.div variants={item} className="premium-card space-y-4">
            <SectionHeader icon={<MousePointerClick className="h-4 w-4 text-emerald" />} title="Custo por Etapa do Funil" desc="Simulação de quanto você paga em cada etapa"
              expanded={sections.analysis} onToggle={() => toggle('analysis')} bg="bg-emerald/10" />
            {sections.analysis && (
              <div className="space-y-3">
                <FunnelStep label="Impressões" value={formatNumber(funnelAnalysis.cpaProj.impressions, 0)} width={100} />
                <FunnelStep label="Cliques" value={formatNumber(funnelAnalysis.cpaProj.clicks, 0)} cost={formatBRL(funnelAnalysis.cpaProj.cpc)} width={Math.min((funnelAnalysis.cpaProj.clicks / funnelAnalysis.cpaProj.impressions) * 100, 100)} />
                <FunnelStep label="Visualizações" value={formatNumber(funnelAnalysis.cpaProj.pageViews, 0)} cost={formatBRL(funnelAnalysis.cpaProj.costPerPageView)} width={Math.min((funnelAnalysis.cpaProj.pageViews / funnelAnalysis.cpaProj.impressions) * 100, 100)} />
                <FunnelStep label="Checkouts" value={formatNumber(funnelAnalysis.cpaProj.checkouts, 0)} cost={formatBRL(funnelAnalysis.cpaProj.costPerCheckout)} width={Math.max(Math.min((funnelAnalysis.cpaProj.checkouts / funnelAnalysis.cpaProj.impressions) * 100, 100), 3)} />
                <FunnelStep label="Compras" value={formatNumber(funnelAnalysis.cpaProj.purchases, 0)} cost={formatBRL(funnelAnalysis.cpaProj.projectedCPA)} width={Math.max(Math.min((funnelAnalysis.cpaProj.purchases / funnelAnalysis.cpaProj.impressions) * 100, 100), 2)} highlight />
              </div>
            )}
          </motion.div>

          {/* Sales Goal Simulator */}
          <motion.div variants={item} className="premium-card space-y-4">
            <SectionHeader icon={<Target className="h-4 w-4 text-white" />} title="Simulador de Meta" desc="Defina meta de vendas e veja o lucro projetado"
              expanded gradient />
            <div className="space-y-4">
              <div className="max-w-xs">
                <InputField label="Meta de vendas (30 dias)" value={salesGoal} onChange={setSalesGoal} step={1} highlight />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-5 space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Apenas Produto Principal</p>
                  <p className={`text-2xl font-mono font-bold ${profitMainOnly > 0 ? 'number-glow-safe' : 'number-glow-danger'}`}>
                    {formatBRL(profitMainOnly)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {salesGoal} vendas × {formatBRL(activeNetPerSale - activeCpaProjected)} lucro/venda
                  </p>
                </div>
                <div className="glass-card p-5 space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Funil Completo</p>
                  <p className={`text-2xl font-mono font-bold ${profitFullFunnel > 0 ? 'number-glow-safe' : 'number-glow-danger'}`}>
                    {formatBRL(profitFullFunnel)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {salesGoal} vendas × {formatBRL(activeCpaMaxFunnel - activeCpaProjected)} lucro/venda (c/ funil)
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ===== SCENARIOS ===== */}
          <motion.div variants={item} className="premium-card space-y-4">
            <SectionHeader icon={<FlaskConical className="h-4 w-4 text-white" />} title="Cenários de Simulação" desc="Simule diferentes situações para a sua operação"
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
                      <span>Com {salesGoal} vendas/mês → Lucro mensal:</span>
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
                      <p className="text-sm text-foreground">Lucro desejado maior que o líquido por venda ({formatBRL(activeNetPerSale)}). Reduza o valor.</p>
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
                      <CalcDisplay value={formatBRL(activeCpaMax)} positive />
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
                  {assumedCpa > activeCpaMax && (
                    <div className="flex items-start gap-3 bg-signal-danger rounded-xl p-4 border border-rose/20">
                      <AlertTriangle className="h-4 w-4 text-rose shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">CPA de {formatBRL(assumedCpa)} acima do máximo de {formatBRL(activeCpaMax)}.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* ===== HEALTH DASHBOARD ===== */}
          <motion.div variants={item} className="premium-card space-y-4">
            <SectionHeader icon={<Activity className="h-4 w-4 text-white" />} title="Dashboard de Saúde Financeira" desc="Visão executiva da operação"
              expanded={sections.health} onToggle={() => toggle('health')} gradient />
            {sections.health && (
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-56 shrink-0">
                    <ProfitabilityGauge cpaMax={activeCpaMax} cpaProjected={activeCpaProjected} />
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

                {/* Charts */}
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
                        initial={{ height: 0 }} animate={{ height: `${(activeCpaMax / Math.max(activeCpaMax, activeCpaProjected)) * 100}%` }}
                        transition={{ duration: 0.7 }} />
                      <span className="text-sm font-mono number-glow-primary font-bold">{formatBRL(activeCpaMax)}</span>
                      <span className="text-[10px] text-muted-foreground">CPA Máx.</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-2">
                      <motion.div className={`w-full rounded-t-xl ${isDanger ? 'bg-rose' : 'bg-emerald'}`}
                        initial={{ height: 0 }} animate={{ height: `${(activeCpaProjected / Math.max(activeCpaMax, activeCpaProjected)) * 100}%` }}
                        transition={{ duration: 0.7, delay: 0.1 }} />
                      <span className={`text-sm font-mono font-bold ${isDanger ? 'number-glow-danger' : 'number-glow-safe'}`}>{formatBRL(activeCpaProjected)}</span>
                      <span className="text-[10px] text-muted-foreground">CPA Proj.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* ===== FUNNEL BUILDER DIALOG ===== */}
      <Dialog open={funnelDialogOpen} onOpenChange={setFunnelDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold tracking-tight">Configurar Funil Perpétuo</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Main product selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Produto Principal</label>
              <div className="glass-card p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">PRINCIPAL</span>
                  <span className="text-sm font-semibold text-foreground">{state.product.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{formatBRL(state.product.price)}</span>
                </div>
              </div>
            </div>

            {/* Funnel offers */}
            <div className="space-y-3">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ofertas do Funil</label>
              {funnelConfig.offers.map((fo, i) => {
                const roleColors = { orderbump: 'text-primary', upsell: 'text-emerald', downsell: 'text-amber' };
                return (
                  <div key={i} className="glass-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${roleColors[fo.role]} uppercase`}>{fo.role}</span>
                      <button onClick={() => removeFunnelOffer(i)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                    </div>
                    <Select value={fo.productId} onValueChange={(val) => updateFunnelOffer(i, { productId: val })}>
                      <SelectTrigger className="h-8 text-xs">
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
                  Cadastre produtos secundários na aba "Cadastro" antes de montar o funil.
                </p>
              )}

              {state.offers.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {(['orderbump', 'upsell', 'downsell'] as const).map(role => (
                    <Button key={role} variant="outline" size="sm" onClick={() => addFunnelOffer(role)} className="text-[10px] border-dashed h-8">
                      + {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={confirmFunnel} className="w-full font-semibold text-white" style={{ background: 'var(--gradient-primary)' }}
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

function SectionHeader({ icon, title, desc, expanded, onToggle, gradient, bg }: {
  icon: React.ReactNode; title: string; desc: string; expanded: boolean; onToggle?: () => void; gradient?: boolean; bg?: string;
}) {
  const Wrapper = onToggle ? 'button' : 'div';
  return (
    <Wrapper onClick={onToggle} className={`flex items-center justify-between w-full ${onToggle ? 'cursor-pointer' : ''}`}>
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
      {onToggle && (expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
    </Wrapper>
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
