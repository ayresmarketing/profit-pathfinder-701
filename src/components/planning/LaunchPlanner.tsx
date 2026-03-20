import { useState, useMemo } from 'react';
import { useOperation } from '@/contexts/OperationContext';
import { motion, AnimatePresence } from 'framer-motion';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import { formatBRL, formatNumber, calcMainProduct, calcCPAProjection } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Rocket, Layers, Zap, ChevronDown, ChevronUp, FileDown } from 'lucide-react';

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

interface Lot {
  id: string;
  name: string;
  price: number;
  expectedSales: number;
  startDate: string;
  endDate: string;
}

interface LaunchFunnelOffer {
  productId: string;
  role: 'orderbump' | 'upsell' | 'downsell';
  conversionRate: number;
}

interface LaunchFunnel {
  mainProductId: string;
  offers: LaunchFunnelOffer[];
}

export default function LaunchPlanner() {
  const { state } = useOperation();
  const mainProduct = state.product;

  // Funnel states: before pitch & after pitch
  const [funnelDialogOpen, setFunnelDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<'before' | 'after'>('before');
  const [funnelCreated, setFunnelCreated] = useState(false);

  const [beforePitch, setBeforePitch] = useState<LaunchFunnel>({ mainProductId: 'main', offers: [] });
  const [afterPitch, setAfterPitch] = useState<LaunchFunnel>({ mainProductId: '', offers: [] });

  // Lots (for the ticket/main product before pitch)
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotsEnabled, setLotsEnabled] = useState(false);

  // Traffic
  const [traffic, setTraffic] = useState({
    investment: 10000, cpm: 45, ctr: 2.3, connectRate: 70, pageToCheckout: 25, checkoutToPurchase: 33,
  });

  // Sections
  const [sections, setSections] = useState({
    beforePitch: true, afterPitch: true, traffic: true, report: true, lots: false, detailBefore: false, detailAfter: false,
  });
  const toggle = (s: keyof typeof sections) => setSections(prev => ({ ...prev, [s]: !prev[s] }));

  const handleTrafficChange = (key: string, value: number) => {
    setTraffic(prev => ({ ...prev, [key]: value }));
  };

  // Calculations
  const calc = useMemo(() => {
    if (!funnelCreated) return null;

    const cpaProj = calcCPAProjection(traffic as any, mainProduct.price, mainProduct.price);
    const totalMainSales = cpaProj.purchases;

    // Before pitch: ticket sales (with lots or single price)
    const ticketPrice = lots.length > 0 && lotsEnabled
      ? lots.reduce((s, l) => s + l.price * l.expectedSales, 0) / Math.max(lots.reduce((s, l) => s + l.expectedSales, 0), 1)
      : mainProduct.price;
    const ticketSales = lots.length > 0 && lotsEnabled
      ? lots.reduce((s, l) => s + l.expectedSales, 0)
      : totalMainSales;

    const beforeOfferCalcs = beforePitch.offers.map(fo => {
      const prod = state.offers.find(o => o.id === fo.productId);
      if (!prod) return null;
      const sales = Math.floor(ticketSales * (fo.conversionRate / 100));
      const grossPerSale = prod.price;
      const netPerSale = prod.price * (1 - (prod.taxRate + prod.platformRate + prod.commissionRate) / 100) - prod.platformFixedFee - prod.otherFixedCosts;
      return { ...fo, prod, sales, grossTotal: grossPerSale * sales, netTotal: netPerSale * sales, grossPerSale, netPerSale };
    }).filter(Boolean) as any[];

    // After pitch
    const afterProduct = state.offers.find(o => o.id === afterPitch.mainProductId);
    const afterMainPrice = afterProduct?.price || 0;
    const afterConvRate = 5; // default pitch conversion
    const afterMainSales = Math.floor(ticketSales * (afterConvRate / 100));

    const afterOfferCalcs = afterPitch.offers.map(fo => {
      const prod = state.offers.find(o => o.id === fo.productId);
      if (!prod) return null;
      const sales = Math.floor(afterMainSales * (fo.conversionRate / 100));
      const grossPerSale = prod.price;
      const netPerSale = prod.price * (1 - (prod.taxRate + prod.platformRate + prod.commissionRate) / 100) - prod.platformFixedFee - prod.otherFixedCosts;
      return { ...fo, prod, sales, grossTotal: grossPerSale * sales, netTotal: netPerSale * sales };
    }).filter(Boolean) as any[];

    // Ticket calculations
    const ticketTaxRate = mainProduct.taxRate;
    const ticketPlatformRate = mainProduct.platformRate;
    const ticketFixedFee = mainProduct.platformFixedFee;
    const ticketCommission = mainProduct.commissionRate;
    const ticketOtherCosts = mainProduct.otherFixedCosts;

    const ticketGrossTotal = lots.length > 0 && lotsEnabled
      ? lots.reduce((s, l) => s + l.price * l.expectedSales, 0)
      : ticketPrice * ticketSales;

    const ticketNetPerSale = ticketPrice * (1 - (ticketTaxRate + ticketPlatformRate + ticketCommission) / 100) - ticketFixedFee - ticketOtherCosts;
    const ticketNetTotal = ticketNetPerSale * ticketSales;

    // Before pitch totals
    const beforeGross = ticketGrossTotal + beforeOfferCalcs.reduce((s: number, o: any) => s + o.grossTotal, 0);
    const beforeNet = ticketNetTotal + beforeOfferCalcs.reduce((s: number, o: any) => s + o.netTotal, 0);
    const beforeTotalSales = ticketSales + beforeOfferCalcs.reduce((s: number, o: any) => s + o.sales, 0);

    // After pitch totals
    const afterGrossMain = afterMainPrice * afterMainSales;
    const afterNetMainPerSale = afterProduct
      ? afterMainPrice * (1 - (afterProduct.taxRate + afterProduct.platformRate + afterProduct.commissionRate) / 100) - afterProduct.platformFixedFee - afterProduct.otherFixedCosts
      : afterMainPrice * 0.8;
    const afterNetMain = afterNetMainPerSale * afterMainSales;
    const afterGross = afterGrossMain + afterOfferCalcs.reduce((s: number, o: any) => s + o.grossTotal, 0);
    const afterNet = afterNetMain + afterOfferCalcs.reduce((s: number, o: any) => s + o.netTotal, 0);
    const afterTotalSales = afterMainSales + afterOfferCalcs.reduce((s: number, o: any) => s + o.sales, 0);

    // Combined
    const totalGross = beforeGross + afterGross;
    const totalNet = beforeNet + afterNet - traffic.investment;
    const totalAllSales = beforeTotalSales + afterTotalSales;
    const cpaMax = totalAllSales > 0 ? (totalGross * 0.8) / ticketSales : 0; // approximate

    // Lots breakdown
    const lotBreakdowns = lots.map(l => {
      const gross = l.price * l.expectedSales;
      const netPer = l.price * (1 - (ticketTaxRate + ticketPlatformRate + ticketCommission) / 100) - ticketFixedFee - ticketOtherCosts;
      return { ...l, gross, net: netPer * l.expectedSales, netPerSale: netPer };
    });

    return {
      cpaProj,
      ticketSales,
      ticketPrice,
      ticketGrossTotal,
      ticketNetTotal,
      beforeGross, beforeNet, beforeTotalSales,
      beforeOfferCalcs,
      afterMainSales, afterGrossMain, afterNetMain,
      afterGross, afterNet, afterTotalSales,
      afterOfferCalcs,
      afterProduct,
      totalGross, totalNet, totalAllSales,
      cpaMax,
      lotBreakdowns,
    };
  }, [funnelCreated, beforePitch, afterPitch, lots, lotsEnabled, traffic, state.product, state.offers, mainProduct]);

  // Funnel dialog helpers
  const currentFunnel = editingPhase === 'before' ? beforePitch : afterPitch;
  const setCurrentFunnel = editingPhase === 'before' ? setBeforePitch : setAfterPitch;

  const addFunnelOffer = (role: LaunchFunnelOffer['role']) => {
    setCurrentFunnel(prev => ({
      ...prev,
      offers: [...prev.offers, { productId: '', role, conversionRate: role === 'orderbump' ? 15 : 10 }],
    }));
  };

  const updateFunnelOffer = (index: number, partial: Partial<LaunchFunnelOffer>) => {
    setCurrentFunnel(prev => ({
      ...prev,
      offers: prev.offers.map((o, i) => i === index ? { ...o, ...partial } : o),
    }));
  };

  const removeFunnelOffer = (index: number) => {
    setCurrentFunnel(prev => ({ ...prev, offers: prev.offers.filter((_, i) => i !== index) }));
  };

  const openFunnelDialog = (phase: 'before' | 'after') => {
    setEditingPhase(phase);
    setFunnelDialogOpen(true);
  };

  const confirmFunnel = () => {
    setFunnelCreated(true);
    setFunnelDialogOpen(false);
  };

  // Lot helpers
  const addLot = () => {
    const num = lots.length + 1;
    setLots(prev => [...prev, {
      id: crypto.randomUUID(), name: `Lote ${num}`, price: 297 + (num - 1) * 100, expectedSales: 50, startDate: '', endDate: '',
    }]);
    setLotsEnabled(true);
  };

  const updateLot = (id: string, partial: Partial<Lot>) => setLots(prev => prev.map(l => l.id === id ? { ...l, ...partial } : l));
  const removeLot = (id: string) => setLots(prev => prev.filter(l => l.id !== id));

  const roleLabels = { orderbump: 'Order Bump', upsell: 'Upsell', downsell: 'Downsell' };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground tracking-tight">Lançamento Pago</h2>
            <span className="tag-auto">⚡ Tempo real</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Planeje seu lançamento dividindo em "Antes do Pitch" (ingresso) e "Depois do Pitch" (produto principal).
          </p>
        </div>
        {funnelCreated && (
          <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
        )}
      </motion.div>

      {/* ===== FUNNEL SETUP ===== */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before Pitch */}
        <div className="premium-card space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xs">🎟️</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Antes do Pitch</h3>
              <p className="text-[10px] text-muted-foreground">Ingresso + ofertas pré-evento</p>
            </div>
          </div>
          {beforePitch.offers.length > 0 || funnelCreated ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">INGRESSO</span>
                <span className="text-xs text-foreground">{mainProduct.name}</span>
              </div>
              {beforePitch.offers.map((fo, i) => {
                const prod = state.offers.find(o => o.id === fo.productId);
                return prod ? (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded">{fo.role.toUpperCase()}</span>
                    <span className="text-foreground">{prod.name}</span>
                    <span className="text-muted-foreground">({fo.conversionRate}%)</span>
                  </div>
                ) : null;
              })}
              <Button variant="outline" size="sm" onClick={() => openFunnelDialog('before')} className="text-xs w-full mt-2 border-dashed">
                Editar
              </Button>
            </div>
          ) : (
            <Button onClick={() => openFunnelDialog('before')} className="w-full text-sm font-semibold text-white" style={{ background: 'var(--gradient-primary)' }}>
              <Zap className="h-4 w-4 mr-2" /> Criar Funil
            </Button>
          )}
        </div>

        {/* After Pitch */}
        <div className="premium-card space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald/10 flex items-center justify-center">
              <span className="text-xs">🎯</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Depois do Pitch</h3>
              <p className="text-[10px] text-muted-foreground">Produto do pitch + ofertas pós-venda</p>
            </div>
          </div>
          {afterPitch.mainProductId || afterPitch.offers.length > 0 ? (
            <div className="space-y-2">
              {afterPitch.mainProductId && (() => {
                const prod = state.offers.find(o => o.id === afterPitch.mainProductId);
                return prod ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald bg-emerald/10 px-2 py-0.5 rounded">PRODUTO</span>
                    <span className="text-xs text-foreground">{prod.name}</span>
                  </div>
                ) : null;
              })()}
              {afterPitch.offers.map((fo, i) => {
                const prod = state.offers.find(o => o.id === fo.productId);
                return prod ? (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded">{fo.role.toUpperCase()}</span>
                    <span className="text-foreground">{prod.name}</span>
                    <span className="text-muted-foreground">({fo.conversionRate}%)</span>
                  </div>
                ) : null;
              })}
              <Button variant="outline" size="sm" onClick={() => openFunnelDialog('after')} className="text-xs w-full mt-2 border-dashed">
                Editar
              </Button>
            </div>
          ) : (
            <Button onClick={() => openFunnelDialog('after')} variant="outline" className="w-full text-sm font-semibold border-dashed">
              <Zap className="h-4 w-4 mr-2" /> Criar Funil
            </Button>
          )}
        </div>
      </motion.div>

      {/* ===== LOTS ===== */}
      <motion.div variants={item} className="premium-card space-y-4">
        <button onClick={() => toggle('lots')} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
              <span className="text-xs">📦</span>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground">Lotes de Venda (Opcional)</h3>
              <p className="text-[11px] text-muted-foreground">Crie lotes com preços e datas diferentes para o ingresso</p>
            </div>
          </div>
          {sections.lots ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {sections.lots && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
              {lots.map((lot) => (
                <div key={lot.id} className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">{lot.name}</span>
                    <button onClick={() => removeLot(lot.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  </div>
                </div>
              ))}

              <Button onClick={addLot} variant="outline" className="w-full border-dashed text-sm font-semibold">
                <Plus className="h-4 w-4 mr-1.5" /> Adicionar Lote
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ===== TRAFFIC ===== */}
      <motion.div variants={item} className="premium-card space-y-4">
        <button onClick={() => toggle('traffic')} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <span className="text-white text-xs">📡</span>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground">Métricas de Tráfego</h3>
              <p className="text-[11px] text-muted-foreground">Ajuste rapidamente para simular cenários</p>
            </div>
          </div>
          {sections.traffic ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {sections.traffic && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <InputField label="Investimento" value={traffic.investment} prefix="R$" step={100} onChange={(v) => handleTrafficChange('investment', v)} highlight />
            <InputField label="CPM" value={traffic.cpm} prefix="R$" step={0.5} onChange={(v) => handleTrafficChange('cpm', v)} highlight />
            <InputField label="CTR" value={traffic.ctr} suffix="%" step={0.1} onChange={(v) => handleTrafficChange('ctr', v)} highlight />
            <InputField label="Connect Rate" value={traffic.connectRate} suffix="%" step={1} onChange={(v) => handleTrafficChange('connectRate', v)} highlight />
            <InputField label="Página → Checkout" value={traffic.pageToCheckout} suffix="%" step={0.5} onChange={(v) => handleTrafficChange('pageToCheckout', v)} highlight />
            <InputField label="Checkout → Compra" value={traffic.checkoutToPurchase} suffix="%" step={0.5} onChange={(v) => handleTrafficChange('checkoutToPurchase', v)} highlight />
          </div>
        )}
      </motion.div>

      {/* ===== REPORT ===== */}
      {funnelCreated && calc && (
        <>
          {/* GERAL */}
          <motion.div variants={item} className="premium-card space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                <span className="text-white text-xs">📊</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Relatório Geral do Lançamento</h3>
                <p className="text-[10px] text-muted-foreground">Visão consolidada: Antes + Depois do Pitch</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard label="CPA Máx. Operação" value={formatBRL(calc.cpaMax)} signal="primary" />
              <MetricCard label="Faturamento Bruto" value={formatBRL(calc.totalGross)} />
              <MetricCard label="Lucro Líquido" value={formatBRL(calc.totalNet)} signal={calc.totalNet > 0 ? 'safe' : 'danger'} />
              <MetricCard label="Vendas Totais" value={formatNumber(calc.totalAllSales, 0)} />
            </div>
          </motion.div>

          {/* ANTES DO PITCH */}
          <motion.div variants={item} className="premium-card space-y-4">
            <button onClick={() => toggle('beforePitch')} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="text-xs">🎟️</span>
                <h3 className="text-sm font-bold text-foreground">Antes do Pitch</h3>
              </div>
              {sections.beforePitch ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {sections.beforePitch && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard label="CPA Máx. (Antes)" value={formatBRL(calc.ticketSales > 0 ? calc.beforeNet / calc.ticketSales : 0)} signal="primary" compact />
                  <MetricCard label="Vendas Totais" value={formatNumber(calc.beforeTotalSales, 0)} compact />
                  <MetricCard label="Fat. Bruto" value={formatBRL(calc.beforeGross)} compact />
                  <MetricCard label="Fat. Líquido" value={formatBRL(calc.beforeNet)} signal={calc.beforeNet > 0 ? 'safe' : 'danger'} compact />
                </div>

                {/* Ticket/ingresso sales */}
                <div className="glass-card p-4 space-y-2">
                  <p className="text-xs font-bold text-foreground">Ingressos</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Vendas</p>
                      <p className="text-sm font-mono font-bold text-foreground">{formatNumber(calc.ticketSales, 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Bruto</p>
                      <p className="text-sm font-mono font-bold text-foreground">{formatBRL(calc.ticketGrossTotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Líquido</p>
                      <p className="text-sm font-mono font-bold text-foreground">{formatBRL(calc.ticketNetTotal)}</p>
                    </div>
                  </div>
                </div>

                {/* Lot breakdown */}
                {lotsEnabled && calc.lotBreakdowns.length > 0 && (
                  <div className="space-y-2">
                    <button onClick={() => toggle('detailBefore')} className="text-xs text-primary font-semibold flex items-center gap-1">
                      {sections.detailBefore ? 'Ocultar' : 'Ver'} detalhes por lote
                      {sections.detailBefore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {sections.detailBefore && (
                      <div className="space-y-2">
                        {calc.lotBreakdowns.map(l => (
                          <div key={l.id} className="glass-card p-3 grid grid-cols-4 gap-2 text-center">
                            <div>
                              <p className="text-[9px] text-muted-foreground">Lote</p>
                              <p className="text-xs font-bold text-foreground">{l.name}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground">Vendas</p>
                              <p className="text-xs font-mono font-bold text-foreground">{l.expectedSales}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground">Bruto</p>
                              <p className="text-xs font-mono font-bold text-foreground">{formatBRL(l.gross)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground">Líquido</p>
                              <p className="text-xs font-mono font-bold text-foreground">{formatBRL(l.net)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Before pitch offers */}
                {calc.beforeOfferCalcs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ofertas (Antes do Pitch)</p>
                    {calc.beforeOfferCalcs.map((oc: any, i: number) => (
                      <div key={i} className="glass-card p-3 grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-[9px] text-muted-foreground">{oc.role.toUpperCase()}</p>
                          <p className="text-xs font-bold text-foreground">{oc.prod.name}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Vendas</p>
                          <p className="text-xs font-mono font-bold text-foreground">{oc.sales}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Bruto</p>
                          <p className="text-xs font-mono font-bold text-foreground">{formatBRL(oc.grossTotal)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Líquido</p>
                          <p className="text-xs font-mono font-bold text-foreground">{formatBRL(oc.netTotal)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* DEPOIS DO PITCH */}
          <motion.div variants={item} className="premium-card space-y-4">
            <button onClick={() => toggle('afterPitch')} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="text-xs">🎯</span>
                <h3 className="text-sm font-bold text-foreground">Depois do Pitch</h3>
              </div>
              {sections.afterPitch ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {sections.afterPitch && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard label="Vendas Produto" value={formatNumber(calc.afterMainSales, 0)} compact />
                  <MetricCard label="Fat. Bruto" value={formatBRL(calc.afterGross)} compact />
                  <MetricCard label="Fat. Líquido" value={formatBRL(calc.afterNet)} signal={calc.afterNet > 0 ? 'safe' : 'danger'} compact />
                  <MetricCard label="Total Vendas" value={formatNumber(calc.afterTotalSales, 0)} compact />
                </div>

                {calc.afterProduct && (
                  <div className="glass-card p-4 space-y-2">
                    <p className="text-xs font-bold text-foreground">{calc.afterProduct.name}</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Vendas</p>
                        <p className="text-sm font-mono font-bold text-foreground">{formatNumber(calc.afterMainSales, 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Bruto</p>
                        <p className="text-sm font-mono font-bold text-foreground">{formatBRL(calc.afterGrossMain)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Líquido</p>
                        <p className="text-sm font-mono font-bold text-foreground">{formatBRL(calc.afterNetMain)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* After pitch offers */}
                {calc.afterOfferCalcs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ofertas (Depois do Pitch)</p>
                    {calc.afterOfferCalcs.map((oc: any, i: number) => (
                      <div key={i} className="glass-card p-3 grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-[9px] text-muted-foreground">{oc.role.toUpperCase()}</p>
                          <p className="text-xs font-bold text-foreground">{oc.prod.name}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Vendas</p>
                          <p className="text-xs font-mono font-bold text-foreground">{oc.sales}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Bruto</p>
                          <p className="text-xs font-mono font-bold text-foreground">{formatBRL(oc.grossTotal)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Líquido</p>
                          <p className="text-xs font-mono font-bold text-foreground">{formatBRL(oc.netTotal)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* ===== FUNNEL DIALOG ===== */}
      <Dialog open={funnelDialogOpen} onOpenChange={setFunnelDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold tracking-tight">
              {editingPhase === 'before' ? '🎟️ Funil — Antes do Pitch' : '🎯 Funil — Depois do Pitch'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Main product for this phase */}
            {editingPhase === 'before' ? (
              <div className="glass-card p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Produto Principal (Ingresso)</p>
                <p className="text-sm font-semibold text-foreground">{mainProduct.name} — {formatBRL(mainProduct.price)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Produto do Pitch</label>
                <Select value={afterPitch.mainProductId} onValueChange={(val) => setAfterPitch(prev => ({ ...prev, mainProductId: val }))}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {state.offers.map(o => (
                      <SelectItem key={o.id} value={o.id} className="text-xs">{o.name} — {formatBRL(o.price)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Offers */}
            <div className="space-y-3">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ofertas Complementares</label>
              {currentFunnel.offers.map((fo, i) => (
                <div key={i} className="glass-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase">{roleLabels[fo.role]}</span>
                    <button onClick={() => removeFunnelOffer(i)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                  </div>
                  <Select value={fo.productId} onValueChange={(val) => updateFunnelOffer(i, { productId: val })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {state.offers.map(o => (
                        <SelectItem key={o.id} value={o.id} className="text-xs">{o.name} — {formatBRL(o.price)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <InputField label="Taxa de conversão" value={fo.conversionRate} suffix="%" step={1}
                    onChange={(v) => updateFunnelOffer(i, { conversionRate: v })} highlight />
                </div>
              ))}

              {state.offers.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {(['orderbump', 'upsell', 'downsell'] as const).map(role => (
                    <Button key={role} variant="outline" size="sm" onClick={() => addFunnelOffer(role)} className="text-[10px] border-dashed h-8">
                      + {roleLabels[role]}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={confirmFunnel} className="w-full font-semibold text-white" style={{ background: 'var(--gradient-primary)' }}>
              <Zap className="h-4 w-4 mr-2" /> Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
