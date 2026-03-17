import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import { formatBRL, formatNumber } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Rocket, Package, ShoppingBag, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp } from 'lucide-react';

// Types
interface Lot {
  id: string;
  name: string;
  price: number;
  expectedSales: number;
  startDate: string;
  endDate: string;
}

interface LaunchOffer {
  id: string;
  type: 'orderbump' | 'upsell' | 'downsell';
  name: string;
  price: number;
  conversionRate: number;
}

interface LaunchCosts {
  taxRate: number;
  platformRate: number;
  platformFixedFee: number;
  commissionRate: number;
  adInvestment: number;
  otherCosts: number;
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const typeLabels = { orderbump: 'Order Bump', upsell: 'Upsell', downsell: 'Downsell' };
const typeIcons = { orderbump: ShoppingBag, upsell: ArrowUpRight, downsell: ArrowDownRight };
const typeColors = { orderbump: 'text-primary', upsell: 'text-emerald', downsell: 'text-amber' };
const typeBg = { orderbump: 'bg-primary/10', upsell: 'bg-emerald/10', downsell: 'bg-amber/10' };

export default function LaunchPlanner() {
  const [productName, setProductName] = useState('Meu Lançamento');
  const [lots, setLots] = useState<Lot[]>([
    { id: crypto.randomUUID(), name: 'Lote 1', price: 297, expectedSales: 50, startDate: '', endDate: '' },
  ]);
  const [offers, setOffers] = useState<LaunchOffer[]>([]);
  const [costs, setCosts] = useState<LaunchCosts>({
    taxRate: 6,
    platformRate: 10,
    platformFixedFee: 2.50,
    commissionRate: 0,
    adInvestment: 10000,
    otherCosts: 0,
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ lots: true, offers: true, costs: true });

  const toggleSection = (s: string) => setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }));

  // Calculations
  const calc = useMemo(() => {
    const totalSales = lots.reduce((s, l) => s + l.expectedSales, 0);
    const grossRevenueLots = lots.reduce((s, l) => s + l.price * l.expectedSales, 0);
    const avgTicket = totalSales > 0 ? grossRevenueLots / totalSales : 0;

    // Offer contributions (based on total main sales)
    const offerRevenue = offers.reduce((s, o) => {
      const offerSales = totalSales * (o.conversionRate / 100);
      return s + o.price * offerSales;
    }, 0);

    const totalGrossRevenue = grossRevenueLots + offerRevenue;

    // Costs
    const taxTotal = totalGrossRevenue * (costs.taxRate / 100);
    const platformTotal = totalGrossRevenue * (costs.platformRate / 100) + costs.platformFixedFee * totalSales;
    const commissionTotal = totalGrossRevenue * (costs.commissionRate / 100);
    const totalCosts = taxTotal + platformTotal + commissionTotal + costs.adInvestment + costs.otherCosts;

    const netRevenue = totalGrossRevenue - totalCosts;
    const margin = totalGrossRevenue > 0 ? (netRevenue / totalGrossRevenue) * 100 : 0;
    const roi = costs.adInvestment > 0 ? ((netRevenue) / costs.adInvestment) * 100 : 0;
    const cpaMax = totalSales > 0 ? (totalGrossRevenue - taxTotal - platformTotal - commissionTotal - costs.otherCosts) / totalSales : 0;
    const cpaReal = totalSales > 0 ? costs.adInvestment / totalSales : 0;

    // Per lot breakdown
    const lotBreakdowns = lots.map(l => {
      const lotGross = l.price * l.expectedSales;
      const lotTax = lotGross * (costs.taxRate / 100);
      const lotPlatform = lotGross * (costs.platformRate / 100) + costs.platformFixedFee * l.expectedSales;
      const lotCommission = lotGross * (costs.commissionRate / 100);
      const lotNet = lotGross - lotTax - lotPlatform - lotCommission;
      const lotNetPerSale = l.expectedSales > 0 ? lotNet / l.expectedSales : 0;
      return { ...l, lotGross, lotNet, lotNetPerSale };
    });

    return {
      totalSales,
      grossRevenueLots,
      offerRevenue,
      totalGrossRevenue,
      taxTotal,
      platformTotal,
      commissionTotal,
      totalCosts,
      netRevenue,
      margin,
      roi,
      cpaMax,
      cpaReal,
      avgTicket,
      lotBreakdowns,
    };
  }, [lots, offers, costs]);

  const addLot = () => {
    const num = lots.length + 1;
    setLots(prev => [...prev, {
      id: crypto.randomUUID(),
      name: `Lote ${num}`,
      price: 397 + (num - 1) * 100,
      expectedSales: 30,
      startDate: '',
      endDate: '',
    }]);
  };

  const updateLot = (id: string, partial: Partial<Lot>) => {
    setLots(prev => prev.map(l => l.id === id ? { ...l, ...partial } : l));
  };

  const removeLot = (id: string) => {
    if (lots.length > 1) setLots(prev => prev.filter(l => l.id !== id));
  };

  const addOffer = (type: LaunchOffer['type']) => {
    setOffers(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      name: typeLabels[type],
      price: type === 'downsell' ? 47 : 97,
      conversionRate: type === 'orderbump' ? 15 : 10,
    }]);
  };

  const updateOffer = (id: string, partial: Partial<LaunchOffer>) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, ...partial } : o));
  };

  const removeOffer = (id: string) => {
    setOffers(prev => prev.filter(o => o.id !== id));
  };

  const updateCost = (partial: Partial<LaunchCosts>) => {
    setCosts(prev => ({ ...prev, ...partial }));
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-1">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground tracking-tight">Lançamento Pago</h2>
          <span className="tag-auto">⚡ Tempo real</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Planeje seu lançamento com lotes, ofertas complementares e custos detalhados.
        </p>
      </motion.div>

      {/* KPI Summary */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard label="Faturamento Bruto" value={formatBRL(calc.totalGrossRevenue)} />
        <MetricCard label="Lucro Líquido" value={formatBRL(calc.netRevenue)} signal={calc.netRevenue > 0 ? 'safe' : 'danger'} />
        <MetricCard label="ROI" value={`${formatNumber(calc.roi, 1)}%`} signal={calc.roi > 100 ? 'safe' : calc.roi > 0 ? 'warning' : 'danger'} />
        <MetricCard label="CPA Real" value={formatBRL(calc.cpaReal)} signal={calc.cpaReal < calc.cpaMax ? 'safe' : 'danger'} subtitle={`Máx: ${formatBRL(calc.cpaMax)}`} />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard label="Total de Vendas" value={formatNumber(calc.totalSales, 0)} />
        <MetricCard label="Ticket Médio" value={formatBRL(calc.avgTicket)} />
        <MetricCard label="Margem" value={`${formatNumber(calc.margin, 1)}%`} signal={calc.margin > 30 ? 'safe' : calc.margin > 10 ? 'warning' : 'danger'} />
        <MetricCard label="Receita Ofertas" value={formatBRL(calc.offerRevenue)} signal="primary" subtitle="Bumps + Upsells" />
      </motion.div>

      {/* Product Name */}
      <motion.div variants={item} className="premium-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <Package className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Produto do Lançamento</h3>
            <p className="text-[11px] text-muted-foreground">Nome do produto que será lançado.</p>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nome do Produto</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="user-input w-full max-w-md"
            placeholder="Ex: Curso de Marketing Digital"
          />
        </div>
      </motion.div>

      {/* === LOTES === */}
      <motion.div variants={item} className="premium-card space-y-4">
        <button onClick={() => toggleSection('lots')} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">📦</span>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground">Lotes de Venda</h3>
              <p className="text-[11px] text-muted-foreground">{lots.length} lote{lots.length > 1 ? 's' : ''} configurado{lots.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          {expandedSections.lots ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {expandedSections.lots && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4">
              {lots.map((lot, i) => (
                <div key={lot.id} className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">{lot.name}</span>
                      {calc.lotBreakdowns[i] && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Líq: {formatBRL(calc.lotBreakdowns[i].lotNet)}
                        </span>
                      )}
                    </div>
                    {lots.length > 1 && (
                      <button onClick={() => removeLot(lot.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome</label>
                      <input type="text" value={lot.name} onChange={(e) => updateLot(lot.id, { name: e.target.value })} className="user-input w-full text-sm" />
                    </div>
                    <InputField label="Preço" value={lot.price} prefix="R$" onChange={(v) => updateLot(lot.id, { price: v })} highlight step={1} />
                    <InputField label="Vendas esperadas" value={lot.expectedSales} onChange={(v) => updateLot(lot.id, { expectedSales: v })} highlight step={1} />
                    {calc.lotBreakdowns[i] && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Líquido / venda</label>
                        <div className="calc-value">{formatBRL(calc.lotBreakdowns[i].lotNetPerSale)}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <Button onClick={addLot} variant="outline" className="w-full border-dashed text-sm font-semibold">
                <Plus className="h-4 w-4 mr-1.5" /> Adicionar Próximo Lote
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* === OFERTAS COMPLEMENTARES === */}
      <motion.div variants={item} className="premium-card space-y-4">
        <button onClick={() => toggleSection('offers')} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald/10 flex items-center justify-center">
              <span className="text-emerald font-bold text-xs">🎁</span>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground">Ofertas Complementares</h3>
              <p className="text-[11px] text-muted-foreground">{offers.length} oferta{offers.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {expandedSections.offers ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {expandedSections.offers && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4">
              {offers.map((offer) => {
                const Icon = typeIcons[offer.type];
                const color = typeColors[offer.type];
                const bg = typeBg[offer.type];
                const offerSales = calc.totalSales * (offer.conversionRate / 100);
                const offerGross = offer.price * offerSales;
                return (
                  <div key={offer.id} className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg ${bg} flex items-center justify-center`}>
                          <Icon className={`h-3.5 w-3.5 ${color}`} />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{typeLabels[offer.type]}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">≈ {formatBRL(offerGross)}</span>
                      </div>
                      <button onClick={() => removeOffer(offer.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nome</label>
                        <input type="text" value={offer.name} onChange={(e) => updateOffer(offer.id, { name: e.target.value })} className="user-input w-full text-sm" />
                      </div>
                      <InputField label="Preço" value={offer.price} prefix="R$" onChange={(v) => updateOffer(offer.id, { price: v })} highlight step={1} />
                      <InputField label="Conversão" value={offer.conversionRate} suffix="%" onChange={(v) => updateOffer(offer.id, { conversionRate: v })} highlight tooltip="% dos compradores do lançamento que compram esta oferta" />
                    </div>
                  </div>
                );
              })}

              {offers.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Nenhuma oferta complementar. Adicione abaixo.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['orderbump', 'upsell', 'downsell'] as const).map(type => {
                  const Icon = typeIcons[type];
                  return (
                    <Button key={type} variant="outline" onClick={() => addOffer(type)} className="border-dashed text-xs font-semibold gap-1.5">
                      <Icon className="h-3.5 w-3.5" /> {typeLabels[type]}
                    </Button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* === CUSTOS === */}
      <motion.div variants={item} className="premium-card space-y-4">
        <button onClick={() => toggleSection('costs')} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
              <span className="text-amber font-bold text-xs">💰</span>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-foreground">Custos e Investimento</h3>
              <p className="text-[11px] text-muted-foreground">Taxas, comissões e investimento em ads.</p>
            </div>
          </div>
          {expandedSections.costs ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {expandedSections.costs && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InputField label="Impostos" value={costs.taxRate} suffix="%" onChange={(v) => updateCost({ taxRate: v })} highlight step={0.5} tooltip="% de imposto sobre faturamento" />
                <InputField label="Taxa da plataforma" value={costs.platformRate} suffix="%" onChange={(v) => updateCost({ platformRate: v })} highlight step={0.5} />
                <InputField label="Taxa fixa / venda" value={costs.platformFixedFee} prefix="R$" onChange={(v) => updateCost({ platformFixedFee: v })} highlight />
                <InputField label="Comissão co-produtor" value={costs.commissionRate} suffix="%" onChange={(v) => updateCost({ commissionRate: v })} highlight step={0.5} />
                <InputField label="Investimento em Ads" value={costs.adInvestment} prefix="R$" onChange={(v) => updateCost({ adInvestment: v })} highlight step={100} tooltip="Quanto vai investir em tráfego pago" />
                <InputField label="Outros custos" value={costs.otherCosts} prefix="R$" onChange={(v) => updateCost({ otherCosts: v })} highlight />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* === RESUMO FINAL === */}
      <motion.div variants={item} className="premium-card space-y-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          📊 Resumo do Lançamento
          <span className="tag-auto">⚡ Calculado</span>
        </h3>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Item</th>
                <th className="text-right py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</th>
              </tr>
            </thead>
            <tbody>
              <SummaryRow label="Faturamento Bruto (Lotes)" value={formatBRL(calc.grossRevenueLots)} />
              <SummaryRow label="Faturamento Ofertas" value={formatBRL(calc.offerRevenue)} />
              <SummaryRow label="Faturamento Total" value={formatBRL(calc.totalGrossRevenue)} bold />
              <SummaryRow label="(-) Impostos" value={formatBRL(calc.taxTotal)} negative />
              <SummaryRow label="(-) Plataforma" value={formatBRL(calc.platformTotal)} negative />
              <SummaryRow label="(-) Comissão" value={formatBRL(calc.commissionTotal)} negative />
              <SummaryRow label="(-) Ads" value={formatBRL(costs.adInvestment)} negative />
              <SummaryRow label="(-) Outros custos" value={formatBRL(costs.otherCosts)} negative />
              <SummaryRow label="= Lucro Líquido" value={formatBRL(calc.netRevenue)} bold highlight={calc.netRevenue > 0 ? 'safe' : 'danger'} />
              <SummaryRow label="Margem" value={`${formatNumber(calc.margin, 1)}%`} />
              <SummaryRow label="ROI" value={`${formatNumber(calc.roi, 1)}%`} bold highlight={calc.roi > 100 ? 'safe' : calc.roi > 0 ? 'warning' : 'danger'} />
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SummaryRow({ label, value, bold, negative, highlight }: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
  highlight?: 'safe' | 'warning' | 'danger';
}) {
  const textClass = highlight
    ? highlight === 'safe' ? 'signal-safe' : highlight === 'warning' ? 'signal-warning' : 'signal-danger'
    : negative ? 'text-muted-foreground' : 'text-foreground';
  return (
    <tr className="border-b border-border/50">
      <td className={`py-2.5 px-3 ${bold ? 'font-bold text-foreground' : 'text-muted-foreground'} text-sm`}>{label}</td>
      <td className={`py-2.5 px-3 text-right font-mono text-sm ${bold ? 'font-bold' : 'font-semibold'} ${textClass}`}>{value}</td>
    </tr>
  );
}
