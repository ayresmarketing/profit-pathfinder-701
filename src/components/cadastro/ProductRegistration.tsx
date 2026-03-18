import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, FunnelOffer } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ShoppingBag, ArrowUpRight, ArrowDownRight, Copy, DollarSign, TrendingUp, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const typeLabels = { orderbump: 'Order Bump', upsell: 'Upsell', downsell: 'Downsell' };
const typeIcons = { orderbump: ShoppingBag, upsell: ArrowUpRight, downsell: ArrowDownRight };

export default function ProductRegistration() {
  const { state, updateProduct, addOffer, updateOffer, removeOffer, productCalc, funnelCalc } = useOperation();
  const p = state.product;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState<FunnelOffer['type']>('orderbump');
  const [copyTaxes, setCopyTaxes] = useState(true);
  const [expandedOffers, setExpandedOffers] = useState<Record<string, boolean>>({});

  const handleAddOffer = () => {
    const offer: FunnelOffer = {
      id: crypto.randomUUID(),
      type: newType,
      name: `${typeLabels[newType]}`,
      price: newType === 'downsell' ? 19.90 : 29.90,
      conversionRate: newType === 'orderbump' ? 15 : 10,
      taxRate: copyTaxes ? p.taxRate : 6,
      platformRate: copyTaxes ? p.platformRate : 10,
      platformFixedFee: copyTaxes ? p.platformFixedFee : 2.50,
      commissionRate: copyTaxes ? p.commissionRate : 0,
      otherFixedCosts: copyTaxes ? p.otherFixedCosts : 0,
    };
    addOffer(offer);
    setExpandedOffers(prev => ({ ...prev, [offer.id]: true }));
    setDialogOpen(false);
  };

  const toggleOfferExpand = (id: string) => {
    setExpandedOffers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Donut chart data
  const costData = [
    { name: 'Impostos', value: productCalc.taxPerSale, color: 'hsl(38, 92%, 50%)' },
    { name: 'Plataforma', value: productCalc.platformFeePerSale, color: 'hsl(217, 91%, 60%)' },
    { name: 'Comissão', value: productCalc.commissionPerSale + p.otherFixedCosts, color: 'hsl(263, 70%, 58%)' },
    { name: 'Líquido', value: Math.max(productCalc.netValuePerSale, 0), color: 'hsl(152, 69%, 45%)' },
  ].filter(d => d.value > 0);

  const orderbumps = state.offers.filter(o => o.type === 'orderbump');
  const upsells = state.offers.filter(o => o.type === 'upsell');
  const downsells = state.offers.filter(o => o.type === 'downsell');

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground tracking-tight">Cadastro de Produtos</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Cadastre seu produto principal e ofertas complementares. Preencha os campos <span className="tag-user mx-1 text-[9px]">✏️ editáveis</span>.
        </p>
      </motion.div>

      {/* Quick KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard label="CPA Máx. (Produto)" value={formatBRL(funnelCalc.cpaMaxProduct)} signal="primary"
          tooltip="Valor máximo que pode pagar por venda sem prejuízo" />
        <MetricCard label="CPA Máx. (Funil)" value={formatBRL(funnelCalc.cpaMaxFunnel)} signal="safe"
          tooltip="CPA máximo com funil completo" />
        <MetricCard label="Líquido / venda" value={formatBRL(productCalc.netValuePerSale)}
          signal={productCalc.netValuePerSale > 0 ? 'safe' : 'danger'} />
        <MetricCard label="LTV por Cliente" value={formatBRL(funnelCalc.revenuePerClient)} signal="safe"
          tooltip="Receita líquida total por cliente (produto + funil)" />
      </motion.div>

      {/* ===== PRODUTO PRINCIPAL ===== */}
      <motion.div variants={item} className="premium-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Produto Principal</h3>
            <p className="text-[11px] text-muted-foreground">Defina preço, meta e informações do seu produto.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nome do Produto</label>
            <input type="text" value={p.name} onChange={(e) => updateProduct({ name: e.target.value })}
              className="user-input w-full" placeholder="Ex: Curso de Marketing" />
          </div>
          <InputField label="Preço de venda" value={p.price} onChange={(v) => updateProduct({ price: v })} prefix="R$"
            tooltip="Preço que o cliente paga" step={0.1} highlight />
          <InputField label="Meta de vendas (30 dias)" value={p.salesGoal} onChange={(v) => updateProduct({ salesGoal: v })}
            tooltip="Quantas vendas em 30 dias" step={1} highlight />
        </div>
      </motion.div>

      {/* Costs */}
      <motion.div variants={item} className="premium-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-amber" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Custos por Venda</h3>
            <p className="text-[11px] text-muted-foreground">Taxas descontadas de cada venda realizada.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InputField label="Impostos" value={p.taxRate} onChange={(v) => updateProduct({ taxRate: v })} suffix="%" step={0.5} highlight
            tooltip="% de imposto. Ex: MEI ~6%" />
          <InputField label="Taxa da plataforma (%)" value={p.platformRate} onChange={(v) => updateProduct({ platformRate: v })} suffix="%" step={0.5} highlight />
          <InputField label="Taxa fixa por venda" value={p.platformFixedFee} onChange={(v) => updateProduct({ platformFixedFee: v })} prefix="R$" highlight />
          <InputField label="Comissão co-produtor" value={p.commissionRate} onChange={(v) => updateProduct({ commissionRate: v })} suffix="%" step={0.5} highlight />
          <InputField label="Outros custos fixos" value={p.otherFixedCosts} onChange={(v) => updateProduct({ otherFixedCosts: v })} prefix="R$" highlight />
        </div>
      </motion.div>

      {/* Cost breakdown chart */}
      <motion.div variants={item} className="premium-card">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-48 h-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                  {costData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <RTooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }}
                  formatter={(v: number) => formatBRL(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Composição de Custos (por venda)</h3>
            <CostRow label="Impostos" value={productCalc.taxPerSale} total={p.price} color="bg-amber" />
            <CostRow label="Plataforma" value={productCalc.platformFeePerSale} total={p.price} color="bg-primary" />
            <CostRow label="Comissão + Outros" value={productCalc.commissionPerSale + p.otherFixedCosts} total={p.price} color="bg-violet" />
            <CostRow label="Líquido" value={productCalc.netValuePerSale} total={p.price} color="bg-emerald" />
          </div>
        </div>
      </motion.div>

      {/* ===== SEPARATOR: FUNNEL ===== */}
      <motion.div variants={item} className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-6 bg-background text-xs font-bold tracking-widest text-muted-foreground uppercase">
            🚀 Ofertas do Funil
          </span>
        </div>
      </motion.div>

      {/* Add offer button */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">Monetize seu funil</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Adicione Order Bumps, Upsells e Downsells para aumentar o LTV.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="font-semibold text-sm" style={{ background: 'var(--gradient-primary)' }}>
          <Plus className="h-4 w-4 mr-1.5" /> Nova Oferta
        </Button>
      </motion.div>

      {/* Offer sections by type */}
      {[
        { type: 'orderbump' as const, items: orderbumps, label: 'Order Bumps', icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10' },
        { type: 'upsell' as const, items: upsells, label: 'Upsells', icon: ArrowUpRight, color: 'text-emerald', bg: 'bg-emerald/10' },
        { type: 'downsell' as const, items: downsells, label: 'Downsells', icon: ArrowDownRight, color: 'text-amber', bg: 'bg-amber/10' },
      ].map(section => section.items.length > 0 && (
        <motion.div key={section.type} variants={item} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg ${section.bg} flex items-center justify-center`}>
              <section.icon className={`h-3.5 w-3.5 ${section.color}`} />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${section.color}`}>{section.label}</span>
            <span className="text-[10px] text-muted-foreground">({section.items.length})</span>
          </div>

          <AnimatePresence mode="popLayout">
            {section.items.map((offer) => {
              const i = state.offers.findIndex(o => o.id === offer.id);
              const result = funnelCalc.offerResults[i];
              const isExpanded = expandedOffers[offer.id] !== false;
              const barColor = offer.type === 'upsell' ? 'bg-emerald' : offer.type === 'downsell' ? 'bg-amber' : 'bg-primary';

              return (
                <motion.div key={offer.id} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }} className="premium-card space-y-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => toggleOfferExpand(offer.id)} className="flex items-center gap-2 flex-1 text-left">
                      <div className={`w-1 h-6 rounded-full ${barColor}`} />
                      <span className="text-sm font-semibold text-foreground">{offer.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{formatBRL(offer.price)}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    <button onClick={() => removeOffer(offer.id)} className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nome</label>
                            <input type="text" value={offer.name} onChange={(e) => updateOffer(offer.id, { name: e.target.value })} className="user-input w-full" />
                          </div>
                          <InputField label="Preço" value={offer.price} prefix="R$" onChange={(v) => updateOffer(offer.id, { price: v })} highlight />
                          <InputField label="Conversão" value={offer.conversionRate} suffix="%" onChange={(v) => updateOffer(offer.id, { conversionRate: v })} highlight
                            tooltip="De cada 100 compradores, quantos compram esta oferta?" />
                          <InputField label="Impostos" value={offer.taxRate} suffix="%" onChange={(v) => updateOffer(offer.id, { taxRate: v })} highlight />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <InputField label="Taxa plataforma" value={offer.platformRate} suffix="%" onChange={(v) => updateOffer(offer.id, { platformRate: v })} highlight />
                          <InputField label="Taxa fixa" value={offer.platformFixedFee} prefix="R$" onChange={(v) => updateOffer(offer.id, { platformFixedFee: v })} highlight />
                          <InputField label="Comissão" value={offer.commissionRate} suffix="%" onChange={(v) => updateOffer(offer.id, { commissionRate: v })} highlight />
                          <InputField label="Outros custos" value={offer.otherFixedCosts} prefix="R$" onChange={(v) => updateOffer(offer.id, { otherFixedCosts: v })} highlight />
                        </div>

                        {result && (
                          <div className="grid grid-cols-3 gap-3">
                            <MetricCard label="Líquido / venda" value={formatBRL(result.netValuePerSale)} signal="safe" compact />
                            <MetricCard label="Vendas projetadas" value={result.salesCount.toFixed(0)} compact />
                            <MetricCard label="Contribuição / cliente" value={formatBRL(result.contributionPerMainSale)} signal="primary" compact />
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ))}

      {state.offers.length === 0 && (
        <motion.div variants={item} className="glass-card p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Plus className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            Nenhuma oferta adicionada. Clique em <strong className="text-foreground">"Nova Oferta"</strong> para começar.
          </p>
        </motion.div>
      )}

      {/* LTV Bar */}
      {state.offers.length > 0 && (
        <motion.div variants={item} className="premium-card">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Receita Líquida por Cliente (LTV Imediato)</h4>
          <div className="flex items-center gap-1 h-12 rounded-xl overflow-hidden">
            <motion.div className="h-full flex items-center justify-center px-3 rounded-l-xl"
              style={{ flex: Math.max(funnelCalc.cpaMaxProduct, 1), background: 'var(--gradient-primary)' }} layout>
              <span className="text-[11px] font-mono font-bold text-white truncate">Principal</span>
            </motion.div>
            {funnelCalc.offerResults.map((r, i) => (
              <motion.div key={state.offers[i]?.id}
                className={`h-full flex items-center justify-center px-2 ${
                  state.offers[i]?.type === 'upsell' ? 'bg-emerald' : state.offers[i]?.type === 'downsell' ? 'bg-amber' : 'bg-primary/60'
                }`}
                style={{ flex: Math.max(r.contributionPerMainSale, 0.5) }} layout initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}>
                <span className="text-[11px] font-mono font-bold truncate text-white">{state.offers[i]?.name.slice(0, 8)}</span>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-xs text-muted-foreground">Total por cliente</span>
            <span className="text-lg font-mono font-bold number-glow-safe">{formatBRL(funnelCalc.revenuePerClient)}</span>
          </div>
        </motion.div>
      )}

      {/* Dialog for adding offers */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold tracking-tight">Nova Oferta</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tipo da Oferta</label>
              <div className="grid grid-cols-1 gap-2">
                {(['orderbump', 'upsell', 'downsell'] as const).map(t => {
                  const Icon = typeIcons[t];
                  const isSelected = newType === t;
                  return (
                    <button key={t} onClick={() => setNewType(t)}
                      className={`glass-card p-4 flex items-center gap-3 text-left transition-all ${
                        isSelected ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-secondary'
                      }`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <span className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {typeLabels[t]}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          {t === 'orderbump' && 'Oferta na página de pagamento'}
                          {t === 'upsell' && 'Oferta após a compra, preço maior'}
                          {t === 'downsell' && 'Oferta alternativa, preço menor'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Copiar taxas do produto principal</span>
                </div>
                <Switch checked={copyTaxes} onCheckedChange={setCopyTaxes} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {copyTaxes
                  ? `Taxas copiadas: Impostos ${p.taxRate}%, Plataforma ${p.platformRate}%, Taxa fixa ${formatBRL(p.platformFixedFee)}`
                  : 'Você configurará as taxas manualmente.'}
              </p>
            </div>

            <Button onClick={handleAddOffer} className="w-full font-semibold text-white" style={{ background: 'var(--gradient-primary)' }}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar {typeLabels[newType]}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function CostRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-muted-foreground w-28 shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
        <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 1)}%` }} transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }} />
      </div>
      <span className="text-xs font-mono text-foreground w-20 text-right font-semibold">{formatBRL(value)}</span>
      <span className="text-[11px] font-mono text-muted-foreground w-14 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}
