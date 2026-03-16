import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatPercent, FunnelOffer } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ShoppingBag, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const typeLabels = { orderbump: 'Order Bump', upsell: 'Upsell', downsell: 'Downsell' };
const typeIcons = { orderbump: ShoppingBag, upsell: ArrowUpRight, downsell: ArrowDownRight };
const typeColors = { orderbump: 'text-electric', upsell: 'text-emerald', downsell: 'text-amber' };

export default function OfferStack() {
  const { state, addOffer, updateOffer, removeOffer, funnelCalc } = useOperation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newType, setNewType] = useState<FunnelOffer['type']>('orderbump');

  const handleAdd = () => {
    const offer: FunnelOffer = {
      id: crypto.randomUUID(),
      type: newType,
      name: `Nova Oferta`,
      price: 29.90,
      conversionRate: 10,
      taxRate: 6,
      platformRate: 10,
      platformFixedFee: 2.50,
      commissionRate: 0,
      otherFixedCosts: 0,
    };
    addOffer(offer);
    setDrawerOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Estrutura de Monetização</h2>
          <p className="text-sm text-muted-foreground">Monte seu funil com bumps, upsells e downsells.</p>
        </div>
        <Button
          onClick={() => setDrawerOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar Oferta
        </Button>
      </div>

      {/* Funnel summary bar */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Receita por Cliente (LTV Imediato)</h3>
        <div className="flex items-center gap-1 h-8 rounded overflow-hidden">
          <motion.div
            className="h-full bg-electric flex items-center justify-center px-2 rounded-l"
            style={{ flex: funnelCalc.cpaMaxProduct }}
            layout
          >
            <span className="text-[10px] font-mono font-semibold text-primary-foreground truncate">Principal</span>
          </motion.div>
          {funnelCalc.offerResults.map((r, i) => (
            <motion.div
              key={state.offers[i]?.id}
              className={`h-full flex items-center justify-center px-1 ${
                state.offers[i]?.type === 'upsell' ? 'bg-emerald' :
                state.offers[i]?.type === 'downsell' ? 'bg-amber' : 'bg-electric/60'
              }`}
              style={{ flex: Math.max(r.contributionPerMainSale, 0.5) }}
              layout
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
            >
              <span className="text-[10px] font-mono font-semibold truncate text-card">{state.offers[i]?.name.slice(0, 8)}</span>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground">Receita líquida / cliente</span>
          <span className="text-sm font-mono font-semibold number-glow-safe">{formatBRL(funnelCalc.revenuePerClient)}</span>
        </div>
      </div>

      {/* Offer cards */}
      <AnimatePresence mode="popLayout">
        {state.offers.map((offer, i) => {
          const result = funnelCalc.offerResults[i];
          const Icon = typeIcons[offer.type];
          return (
            <motion.div
              key={offer.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${typeColors[offer.type]}`} />
                  <span className={`text-xs uppercase tracking-widest font-semibold ${typeColors[offer.type]}`}>
                    {typeLabels[offer.type]}
                  </span>
                </div>
                <button onClick={() => removeOffer(offer.id)} className="text-muted-foreground hover:text-rose transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</label>
                  <input
                    type="text" value={offer.name}
                    onChange={(e) => updateOffer(offer.id, { name: e.target.value })}
                    className="precision-input w-full text-foreground"
                  />
                </div>
                <InputField label="Preço" value={offer.price} prefix="R$"
                  onChange={(v) => updateOffer(offer.id, { price: v })} />
                <InputField label="Conversão" value={offer.conversionRate} suffix="%"
                  onChange={(v) => updateOffer(offer.id, { conversionRate: v })}
                  tooltip="% dos compradores do produto principal que compram esta oferta" />
                <InputField label="Impostos" value={offer.taxRate} suffix="%"
                  onChange={(v) => updateOffer(offer.id, { taxRate: v })} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InputField label="Taxa plataforma" value={offer.platformRate} suffix="%"
                  onChange={(v) => updateOffer(offer.id, { platformRate: v })} />
                <InputField label="Taxa fixa" value={offer.platformFixedFee} prefix="R$"
                  onChange={(v) => updateOffer(offer.id, { platformFixedFee: v })} />
                <InputField label="Comissão" value={offer.commissionRate} suffix="%"
                  onChange={(v) => updateOffer(offer.id, { commissionRate: v })} />
                <InputField label="Outros custos" value={offer.otherFixedCosts} prefix="R$"
                  onChange={(v) => updateOffer(offer.id, { otherFixedCosts: v })} />
              </div>

              {result && (
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard label="Líquido / venda" value={formatBRL(result.netValuePerSale)} signal="safe" compact />
                  <MetricCard label="Vendas projetadas" value={result.salesCount.toFixed(0)} compact />
                  <MetricCard label="Contribuição / cliente" value={formatBRL(result.contributionPerMainSale)} signal="primary" compact
                    tooltip="Valor adicionado ao LTV por cada venda do produto principal" />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {state.offers.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma oferta adicionada. Adicione bumps, upsells ou downsells para aumentar seu LTV.</p>
        </div>
      )}

      {/* Summary */}
      {state.offers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Faturamento total (funil)" value={formatBRL(funnelCalc.totalGrossRevenue)} />
          <MetricCard label="Líquido total (funil)" value={formatBRL(funnelCalc.totalNetRevenue)} signal="safe" />
          <MetricCard label="CPA máx. funil" value={formatBRL(funnelCalc.cpaMaxFunnel)} signal="safe"
            tooltip="CPA máximo considerando receita de todo o funil" />
          <MetricCard label="Break-even" value={`${funnelCalc.breakEvenSales} vendas`}
            tooltip="Quantidade de vendas para cobrir o investimento em tráfego" />
        </div>
      )}

      {/* Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="bg-card border-border">
          <SheetHeader>
            <SheetTitle className="text-foreground">Nova Oferta</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {(['orderbump', 'upsell', 'downsell'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    className={`glass-card p-3 text-center text-xs font-semibold uppercase tracking-wider transition-colors ${
                      newType === t ? 'border-primary text-electric' : 'text-muted-foreground'
                    }`}
                    style={newType === t ? { borderColor: 'hsl(var(--primary))' } : {}}
                  >
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full bg-primary text-primary-foreground">
              Adicionar {typeLabels[newType]}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
