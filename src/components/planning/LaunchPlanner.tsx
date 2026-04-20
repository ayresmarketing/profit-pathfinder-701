import { useState, useMemo } from 'react';
import { useOperation } from '@/contexts/OperationContext';
import { motion, AnimatePresence } from 'framer-motion';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import { formatBRL, formatNumber } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Rocket, Layers, Zap, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, PieChart, Pie, Cell } from 'recharts';

const fadeIn = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

const chartTooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  color: 'hsl(var(--foreground))',
  fontSize: 12,
};

interface Lot {
  id: string;
  name: string;
  price: number;
  expectedSales: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

interface LaunchFunnelOffer {
  productId: string;
  role: 'orderbump' | 'upsell' | 'downsell';
  conversionRate: number;
}

interface LaunchFunnel {
  mainProductId: string;
  conversionRate: number;
  offers: LaunchFunnelOffer[];
}

export default function LaunchPlanner() {
  const { state } = useOperation();
  const allProducts = [
    { id: 'main', name: state.product.name, price: state.product.price, ...state.product },
    ...state.offers.map(o => ({ id: o.id, name: o.name, price: o.price, ...o })),
  ];

  const [funnelDialogOpen, setFunnelDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<'before' | 'after'>('before');
  const [funnelCreated, setFunnelCreated] = useState(false);

  const [beforePitch, setBeforePitch] = useState<LaunchFunnel>({ mainProductId: 'main', conversionRate: 100, offers: [] });
  const [afterPitch, setAfterPitch] = useState<LaunchFunnel>({ mainProductId: '', conversionRate: 5, offers: [] });

  const [lots, setLots] = useState<Lot[]>([]);
  const [lotsEnabled, setLotsEnabled] = useState(false);

  const [traffic, setTraffic] = useState({
    investment: 10000, cpm: 45, ctr: 2.3, connectRate: 70, pageToCheckout: 25, checkoutToPurchase: 33,
  });

  const [showDetail, setShowDetail] = useState({ before: false, after: false, lots: false });

  const handleTrafficChange = (key: string, value: number) => setTraffic(prev => ({ ...prev, [key]: value }));

  const getProduct = (id: string) => {
    if (id === 'main') return state.product;
    return state.offers.find(o => o.id === id);
  };

  const calcNet = (price: number, prod: any) => {
    if (!prod) return price * 0.8;
    return price * (1 - (prod.taxRate + prod.platformRate + prod.commissionRate) / 100) - prod.platformFixedFee - prod.otherFixedCosts;
  };

  // Calculations
  const calc = useMemo(() => {
    if (!funnelCreated) return null;

    // Traffic projection
    const impressions = (traffic.investment / traffic.cpm) * 1000;
    const clicks = impressions * (traffic.ctr / 100);
    const pageViews = clicks * (traffic.connectRate / 100);
    const checkouts = pageViews * (traffic.pageToCheckout / 100);
    const purchases = Math.floor(checkouts * (traffic.checkoutToPurchase / 100));

    // Before pitch: ticket sales
    const mainProd = getProduct(beforePitch.mainProductId);
    const ticketPrice = lots.length > 0 && lotsEnabled
      ? lots.reduce((s, l) => s + l.price * l.expectedSales, 0) / Math.max(lots.reduce((s, l) => s + l.expectedSales, 0), 1)
      : (mainProd?.price || state.product.price);
    const ticketSales = lots.length > 0 && lotsEnabled
      ? lots.reduce((s, l) => s + l.expectedSales, 0)
      : purchases;

    const ticketNetPerSale = calcNet(ticketPrice, mainProd);
    const ticketGrossTotal = lots.length > 0 && lotsEnabled
      ? lots.reduce((s, l) => s + l.price * l.expectedSales, 0)
      : ticketPrice * ticketSales;
    const ticketNetTotal = ticketNetPerSale * ticketSales;

    const beforeOfferCalcs = beforePitch.offers.map(fo => {
      const prod = getProduct(fo.productId);
      if (!prod) return null;
      const sales = Math.floor(ticketSales * (fo.conversionRate / 100));
      return {
        ...fo, prod, sales,
        grossTotal: prod.price * sales,
        netTotal: calcNet(prod.price, prod) * sales,
      };
    }).filter(Boolean) as any[];

    const beforeGross = ticketGrossTotal + beforeOfferCalcs.reduce((s: number, o: any) => s + o.grossTotal, 0);
    const beforeNet = ticketNetTotal + beforeOfferCalcs.reduce((s: number, o: any) => s + o.netTotal, 0);
    const beforeTotalSales = ticketSales + beforeOfferCalcs.reduce((s: number, o: any) => s + o.sales, 0);

    // After pitch
    const afterProduct = getProduct(afterPitch.mainProductId);
    const afterMainSales = Math.floor(ticketSales * (afterPitch.conversionRate / 100));
    const afterGrossMain = afterProduct ? afterProduct.price * afterMainSales : 0;
    const afterNetMain = afterProduct ? calcNet(afterProduct.price, afterProduct) * afterMainSales : 0;

    const afterOfferCalcs = afterPitch.offers.map(fo => {
      const prod = getProduct(fo.productId);
      if (!prod) return null;
      const sales = Math.floor(afterMainSales * (fo.conversionRate / 100));
      return {
        ...fo, prod, sales,
        grossTotal: prod.price * sales,
        netTotal: calcNet(prod.price, prod) * sales,
      };
    }).filter(Boolean) as any[];

    const afterGross = afterGrossMain + afterOfferCalcs.reduce((s: number, o: any) => s + o.grossTotal, 0);
    const afterNet = afterNetMain + afterOfferCalcs.reduce((s: number, o: any) => s + o.netTotal, 0);
    const afterTotalSales = afterMainSales + afterOfferCalcs.reduce((s: number, o: any) => s + o.sales, 0);

    const totalGross = beforeGross + afterGross;
    const totalNet = beforeNet + afterNet;
    const totalLiquid = totalNet - traffic.investment;
    const totalAllSales = beforeTotalSales + afterTotalSales;
    const cpaMax = ticketSales > 0 ? totalNet / ticketSales : 0;

    const lotBreakdowns = lots.map(l => ({
      ...l,
      gross: l.price * l.expectedSales,
      net: calcNet(l.price, mainProd) * l.expectedSales,
    }));

    // Chart data
    const revenueChart = [
      { name: 'Antes Pitch', bruto: beforeGross, liquido: beforeNet },
      { name: 'Depois Pitch', bruto: afterGross, liquido: afterNet },
    ];

    return {
      purchases, ticketSales, ticketPrice, ticketGrossTotal, ticketNetTotal,
      beforeGross, beforeNet, beforeTotalSales, beforeOfferCalcs,
      afterMainSales, afterGrossMain, afterNetMain, afterGross, afterNet, afterTotalSales, afterOfferCalcs, afterProduct,
      totalGross, totalNet, totalLiquid, totalAllSales, cpaMax,
      lotBreakdowns, revenueChart,
    };
  }, [funnelCreated, beforePitch, afterPitch, lots, lotsEnabled, traffic, state.product, state.offers]);

  // Dialog helpers
  const currentFunnel = editingPhase === 'before' ? beforePitch : afterPitch;
  const setCurrentFunnel = editingPhase === 'before' ? setBeforePitch : setAfterPitch;
  const roleLabels = { orderbump: 'Order Bump', upsell: 'Upsell', downsell: 'Downsell' };

  const addFunnelOffer = (role: LaunchFunnelOffer['role']) => {
    setCurrentFunnel(prev => ({ ...prev, offers: [...prev.offers, { productId: '', role, conversionRate: role === 'orderbump' ? 15 : 10 }] }));
  };
  const updateFunnelOffer = (index: number, partial: Partial<LaunchFunnelOffer>) => {
    setCurrentFunnel(prev => ({ ...prev, offers: prev.offers.map((o, i) => i === index ? { ...o, ...partial } : o) }));
  };
  const removeFunnelOffer = (index: number) => {
    setCurrentFunnel(prev => ({ ...prev, offers: prev.offers.filter((_, i) => i !== index) }));
  };
  const openFunnelDialog = (phase: 'before' | 'after') => { setEditingPhase(phase); setFunnelDialogOpen(true); };
  const confirmFunnel = () => { setFunnelCreated(true); setFunnelDialogOpen(false); };

  const addLot = () => {
    const num = lots.length + 1;
    setLots(prev => [...prev, { id: crypto.randomUUID(), name: `Lote ${num}`, price: 297 + (num - 1) * 100, expectedSales: 50, startDate: '', endDate: '', startTime: '', endTime: '' }]);
    setLotsEnabled(true);
  };
  const updateLot = (id: string, partial: Partial<Lot>) => setLots(prev => prev.map(l => l.id === id ? { ...l, ...partial } : l));
  const removeLot = (id: string) => setLots(prev => prev.filter(l => l.id !== id));

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div variants={fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Lançamento Pago</h1>
          <p className="text-sm text-muted-foreground mt-1">Planeje seu lançamento: Antes do Pitch (ingresso) e Depois do Pitch (produto).</p>
        </div>
        {funnelCreated && (
          <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
        )}
      </motion.div>

      {/* ===== FUNNEL SETUP ===== */}
      <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before Pitch */}
        <div className="section-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">🎟️</div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Antes do Pitch</h3>
              <p className="text-[10px] text-muted-foreground">Ingresso + ofertas pré-evento</p>
            </div>
          </div>
          {funnelCreated ? (
            <div className="space-y-2">
              <FunnelSummary mainName={getProduct(beforePitch.mainProductId)?.name || state.product.name}
                mainPrice={getProduct(beforePitch.mainProductId)?.price || state.product.price}
                offers={beforePitch.offers} getProduct={getProduct} />
              <Button variant="outline" size="sm" onClick={() => openFunnelDialog('before')} className="w-full text-xs border-dashed mt-2">Editar</Button>
            </div>
          ) : (
            <Button onClick={() => openFunnelDialog('before')} className="w-full font-semibold text-primary-foreground" style={{ background: 'var(--gradient-primary)' }}>
              <Zap className="h-4 w-4 mr-2" /> Criar Funil
            </Button>
          )}
        </div>

        {/* After Pitch */}
        <div className="section-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center text-lg">🎯</div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Depois do Pitch</h3>
              <p className="text-[10px] text-muted-foreground">Produto do pitch + ofertas pós-venda</p>
            </div>
          </div>
          {afterPitch.mainProductId ? (
            <div className="space-y-2">
              <FunnelSummary mainName={getProduct(afterPitch.mainProductId)?.name || '—'}
                mainPrice={getProduct(afterPitch.mainProductId)?.price || 0}
                offers={afterPitch.offers} getProduct={getProduct} />
              <Button variant="outline" size="sm" onClick={() => openFunnelDialog('after')} className="w-full text-xs border-dashed mt-2">Editar</Button>
            </div>
          ) : (
            <Button onClick={() => openFunnelDialog('after')} variant="outline" className="w-full font-semibold border-dashed">
              <Zap className="h-4 w-4 mr-2" /> Criar Funil
            </Button>
          )}
        </div>
      </motion.div>

      {/* ===== LOTS ===== */}
      <motion.div variants={fadeIn} className="section-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center text-lg">📦</div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Lotes de Venda (Opcional)</h3>
              <p className="text-[10px] text-muted-foreground">Crie lotes com preços e quantidades diferentes</p>
            </div>
          </div>
          <Button onClick={addLot} variant="outline" size="sm" className="gap-1.5 text-xs border-dashed">
            <Plus className="h-3.5 w-3.5" /> Adicionar Lote
          </Button>
        </div>

        {lots.length > 0 && (
          <div className="space-y-3">
            {lots.map((lot) => (
              <div key={lot.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">{lot.name}</span>
                  <button onClick={() => removeLot(lot.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome</label>
                    <input type="text" value={lot.name} onChange={(e) => updateLot(lot.id, { name: e.target.value })} className="user-input w-full text-sm" />
                  </div>
                  <InputField label="Preço" value={lot.price} prefix="R$" onChange={(v) => updateLot(lot.id, { price: v })} highlight step={1} />
                  <InputField label="Vendas esperadas" value={lot.expectedSales} onChange={(v) => updateLot(lot.id, { expectedSales: v })} highlight step={1} />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Data início</label>
                    <input type="date" value={lot.startDate} onChange={(e) => updateLot(lot.id, { startDate: e.target.value })} className="user-input w-full text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Data término</label>
                    <input type="date" value={lot.endDate} onChange={(e) => updateLot(lot.id, { endDate: e.target.value })} className="user-input w-full text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Horário</label>
                    <div className="flex gap-1">
                      <input type="time" value={lot.startTime} onChange={(e) => updateLot(lot.id, { startTime: e.target.value })} className="user-input w-full text-xs" placeholder="Início" />
                      <input type="time" value={lot.endTime} onChange={(e) => updateLot(lot.id, { endTime: e.target.value })} className="user-input w-full text-xs" placeholder="Fim" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ===== TRAFFIC ===== */}
      <motion.div variants={fadeIn} className="section-card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Métricas de Tráfego</h3>
            <p className="text-xs text-muted-foreground">Ajuste rapidamente para simular cenários</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <InputField label="Investimento" value={traffic.investment} prefix="R$" step={100} onChange={(v) => handleTrafficChange('investment', v)} highlight />
          <InputField label="CPM" value={traffic.cpm} prefix="R$" step={0.5} onChange={(v) => handleTrafficChange('cpm', v)} highlight />
          <InputField label="CTR" value={traffic.ctr} suffix="%" step={0.1} onChange={(v) => handleTrafficChange('ctr', v)} highlight />
          <InputField label="Connect Rate" value={traffic.connectRate} suffix="%" step={1} onChange={(v) => handleTrafficChange('connectRate', v)} highlight />
          <InputField label="Pág → Checkout" value={traffic.pageToCheckout} suffix="%" step={0.5} onChange={(v) => handleTrafficChange('pageToCheckout', v)} highlight />
          <InputField label="Checkout → Compra" value={traffic.checkoutToPurchase} suffix="%" step={0.5} onChange={(v) => handleTrafficChange('checkoutToPurchase', v)} highlight />
        </div>
      </motion.div>

      {/* ===== REPORT ===== */}
      {funnelCreated && calc && (
        <>
          {/* GERAL */}
          <motion.div variants={fadeIn} className="section-card">
            <h2 className="text-base font-bold text-foreground mb-5">📊 Relatório Geral do Lançamento</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard label="CPA Máx. Operação" value={formatBRL(calc.cpaMax)} signal="primary" />
              <MetricCard label="Fat. Bruto" value={formatBRL(calc.totalGross)} />
              <MetricCard label="Lucro Líquido" value={formatBRL(calc.totalLiquid)} signal={calc.totalLiquid > 0 ? 'safe' : 'danger'}
                subtitle={`Investimento: ${formatBRL(traffic.investment)}`} />
              <MetricCard label="Vendas Totais" value={formatNumber(calc.totalAllSales, 0)} />
            </div>

            {/* Revenue chart */}
            <div className="rounded-xl border border-border p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Receita: Antes vs Depois do Pitch</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={calc.revenueChart} barSize={32} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--chart-text))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--chart-text))' }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="bruto" name="Bruto" radius={[6, 6, 0, 0]} fill="hsl(217, 91%, 60%)" />
                  <Bar dataKey="liquido" name="Líquido" radius={[6, 6, 0, 0]} fill="hsl(152, 69%, 45%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* BEFORE PITCH */}
          <motion.div variants={fadeIn} className="section-card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">🎟️ Antes do Pitch</h3>
              <button onClick={() => setShowDetail(p => ({ ...p, before: !p.before }))} className="text-xs text-primary font-semibold flex items-center gap-1">
                {showDetail.before ? 'Ocultar detalhes' : 'Ver detalhes'}
                {showDetail.before ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Vendas Ingressos" value={formatNumber(calc.ticketSales, 0)} compact />
              <MetricCard label="Fat. Bruto" value={formatBRL(calc.beforeGross)} compact />
              <MetricCard label="Fat. Líquido" value={formatBRL(calc.beforeNet)} signal={calc.beforeNet > 0 ? 'safe' : 'danger'} compact />
              <MetricCard label="Total Vendas" value={formatNumber(calc.beforeTotalSales, 0)} compact />
            </div>

            <AnimatePresence>
              {showDetail.before && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 space-y-3">
                  {lotsEnabled && calc.lotBreakdowns.length > 0 && calc.lotBreakdowns.map(l => (
                    <div key={l.id} className="grid grid-cols-4 gap-3 rounded-lg bg-secondary/50 p-3 text-center text-xs">
                      <div><p className="text-[9px] text-muted-foreground">Lote</p><p className="font-bold text-foreground">{l.name}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Vendas</p><p className="font-mono font-bold">{l.expectedSales}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Bruto</p><p className="font-mono font-bold">{formatBRL(l.gross)}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Líquido</p><p className="font-mono font-bold">{formatBRL(l.net)}</p></div>
                    </div>
                  ))}
                  {calc.beforeOfferCalcs.map((oc: any, i: number) => (
                    <div key={i} className="grid grid-cols-4 gap-3 rounded-lg bg-secondary/50 p-3 text-center text-xs">
                      <div><p className="text-[9px] text-muted-foreground">{oc.role?.toUpperCase()}</p><p className="font-bold text-foreground">{oc.prod?.name}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Vendas</p><p className="font-mono font-bold">{oc.sales}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Bruto</p><p className="font-mono font-bold">{formatBRL(oc.grossTotal)}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Líquido</p><p className="font-mono font-bold">{formatBRL(oc.netTotal)}</p></div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* AFTER PITCH */}
          <motion.div variants={fadeIn} className="section-card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">🎯 Depois do Pitch</h3>
              <button onClick={() => setShowDetail(p => ({ ...p, after: !p.after }))} className="text-xs text-primary font-semibold flex items-center gap-1">
                {showDetail.after ? 'Ocultar detalhes' : 'Ver detalhes'}
                {showDetail.after ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Vendas Produto" value={formatNumber(calc.afterMainSales, 0)} compact />
              <MetricCard label="Fat. Bruto" value={formatBRL(calc.afterGross)} compact />
              <MetricCard label="Fat. Líquido" value={formatBRL(calc.afterNet)} signal={calc.afterNet > 0 ? 'safe' : 'danger'} compact />
              <MetricCard label="Total Vendas" value={formatNumber(calc.afterTotalSales, 0)} compact />
            </div>

            <AnimatePresence>
              {showDetail.after && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 space-y-3">
                  {calc.afterProduct && (
                    <div className="grid grid-cols-3 gap-3 rounded-lg bg-secondary/50 p-3 text-center text-xs">
                      <div><p className="text-[9px] text-muted-foreground">Produto</p><p className="font-bold text-foreground">{calc.afterProduct.name}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Bruto</p><p className="font-mono font-bold">{formatBRL(calc.afterGrossMain)}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Líquido</p><p className="font-mono font-bold">{formatBRL(calc.afterNetMain)}</p></div>
                    </div>
                  )}
                  {calc.afterOfferCalcs.map((oc: any, i: number) => (
                    <div key={i} className="grid grid-cols-4 gap-3 rounded-lg bg-secondary/50 p-3 text-center text-xs">
                      <div><p className="text-[9px] text-muted-foreground">{oc.role?.toUpperCase()}</p><p className="font-bold text-foreground">{oc.prod?.name}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Vendas</p><p className="font-mono font-bold">{oc.sales}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Bruto</p><p className="font-mono font-bold">{formatBRL(oc.grossTotal)}</p></div>
                      <div><p className="text-[9px] text-muted-foreground">Líquido</p><p className="font-mono font-bold">{formatBRL(oc.netTotal)}</p></div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      {/* ===== FUNNEL DIALOG ===== */}
      <Dialog open={funnelDialogOpen} onOpenChange={setFunnelDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingPhase === 'before' ? '🎟️ Funil — Antes do Pitch' : '🎯 Funil — Depois do Pitch'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Main product selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {editingPhase === 'before' ? 'Produto Principal (Ingresso)' : 'Produto do Pitch'}
              </label>
              <Select value={currentFunnel.mainProductId} onValueChange={(val) => setCurrentFunnel(prev => ({ ...prev, mainProductId: val }))}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecione o produto..." />
                </SelectTrigger>
                <SelectContent>
                  {allProducts.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">{p.name} — {formatBRL(p.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingPhase === 'after' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa de Conversão do Pitch</label>
                <InputField
                  label=""
                  value={currentFunnel.conversionRate}
                  suffix="%"
                  step={0.5}
                  onChange={(v) => setCurrentFunnel(prev => ({ ...prev, conversionRate: v }))}
                  highlight
                />
                <p className="text-[10px] text-muted-foreground">% dos compradores do ingresso que compram o produto do pitch.</p>
              </div>
            )}

            {/* Offers */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ofertas Complementares</label>
              {currentFunnel.offers.map((fo, i) => (
                <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase">{roleLabels[fo.role]}</span>
                    <button onClick={() => removeFunnelOffer(i)} className="text-muted-foreground hover:text-destructive text-sm p-1">✕</button>
                  </div>
                  <Select value={fo.productId} onValueChange={(val) => updateFunnelOffer(i, { productId: val })}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.name} — {formatBRL(p.price)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <InputField label="Taxa de conversão" value={fo.conversionRate} suffix="%" step={1}
                    onChange={(v) => updateFunnelOffer(i, { conversionRate: v })} highlight />
                </div>
              ))}

              {allProducts.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {(['orderbump', 'upsell', 'downsell'] as const).map(role => (
                    <Button key={role} variant="outline" size="sm" onClick={() => addFunnelOffer(role)} className="text-[10px] border-dashed h-9">
                      + {roleLabels[role]}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={confirmFunnel} className="w-full font-semibold text-primary-foreground" style={{ background: 'var(--gradient-primary)' }}>
              <Zap className="h-4 w-4 mr-2" /> Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Sub-component for funnel summary display
function FunnelSummary({ mainName, mainPrice, offers, getProduct }: {
  mainName: string; mainPrice: number; offers: LaunchFunnelOffer[]; getProduct: (id: string) => any;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
        <span className="text-[10px] font-bold text-primary uppercase">Principal</span>
        <span className="text-xs font-semibold text-foreground flex-1">{mainName}</span>
        <span className="text-xs font-mono text-muted-foreground">{formatBRL(mainPrice)}</span>
      </div>
      {offers.map((fo, i) => {
        const prod = getProduct(fo.productId);
        if (!prod) return null;
        return (
          <div key={i} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{fo.role}</span>
            <span className="text-xs text-foreground flex-1">{prod.name}</span>
            <span className="text-[10px] text-muted-foreground">{fo.conversionRate}%</span>
          </div>
        );
      })}
    </div>
  );
}
