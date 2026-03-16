import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatPercent, formatNumber, FunnelOffer } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ShoppingBag, ArrowUpRight, ArrowDownRight, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const typeLabels = { orderbump: 'Order Bump', upsell: 'Upsell', downsell: 'Downsell' };
const typeIcons = { orderbump: ShoppingBag, upsell: ArrowUpRight, downsell: ArrowDownRight };

export default function FinancialSimulator() {
  const { state, updateProduct, addOffer, updateOffer, removeOffer, productCalc, funnelCalc } = useOperation();
  const p = state.product;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState<FunnelOffer['type']>('orderbump');
  const [copyTaxes, setCopyTaxes] = useState(true);

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
    setDialogOpen(false);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* ===================== RESULTADOS NO TOPO ===================== */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="section-title">📊 Resultados Financeiros</h3>
          <span className="tag-auto">⚡ Automático</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="CPA Máximo (Produto)"
            value={formatBRL(funnelCalc.cpaMaxProduct)}
            signal="primary"
            tooltip="Valor MÁXIMO que você pode pagar por venda sem ter prejuízo."
          />
          <MetricCard
            label="CPA Máximo (Funil)"
            value={formatBRL(funnelCalc.cpaMaxFunnel)}
            signal="safe"
            tooltip="CPA máximo considerando todo o funil (bumps + upsells)."
          />
          <MetricCard
            label="Lucro líquido / venda"
            value={formatBRL(productCalc.netValuePerSale)}
            signal={productCalc.netValuePerSale > 0 ? 'safe' : 'danger'}
            tooltip="Quanto sobra no seu bolso por cada venda."
          />
          <MetricCard
            label="Vendas por dia (meta)"
            value={formatNumber(productCalc.salesPerDay, 1)}
            signal="neutral"
            tooltip="Vendas diárias necessárias para bater sua meta mensal."
          />
        </div>
      </motion.div>

      {/* Totais */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Faturamento Bruto" value={formatBRL(productCalc.grossRevenue)}
          tooltip="Preço × Meta de vendas" />
        <MetricCard label="Faturamento Líquido" value={formatBRL(productCalc.netRevenue)} signal="safe"
          tooltip="Quanto realmente entra depois de todas as taxas" />
        <MetricCard
          label="Custos Totais"
          value={formatBRL(productCalc.totalCostsTotal)}
          subtitle={formatPercent((productCalc.totalCostsTotal / productCalc.grossRevenue) * 100) + ' do faturamento'}
          tooltip="Soma de todos os custos"
        />
      </motion.div>

      {/* Composição de custos */}
      <motion.div variants={item} className="glass-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Composição de Custos (por venda)</h3>
        <div className="space-y-3">
          <CostBar label="Impostos" value={productCalc.taxPerSale} total={p.price} color="bg-amber" />
          <CostBar label="Plataforma" value={productCalc.platformFeePerSale} total={p.price} color="bg-primary" />
          <CostBar label="Comissão" value={productCalc.commissionPerSale} total={p.price} color="bg-rose" />
          <CostBar label="Líquido" value={productCalc.netValuePerSale} total={p.price} color="bg-emerald" />
        </div>
      </motion.div>

      {/* ===================== PRODUTO PRINCIPAL ===================== */}
      <motion.div variants={item} className="section-card space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full bg-primary" />
          <h3 className="section-title">🎯 Produto Principal</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Preencha as informações do seu produto. Ex: Se você vende um curso de R$ 197 pela Hotmart, coloque 197 no preço.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome do Produto</label>
            <input
              type="text"
              value={p.name}
              onChange={(e) => updateProduct({ name: e.target.value })}
              className="user-input w-full text-foreground"
              placeholder="Ex: Curso de Marketing"
            />
          </div>
          <InputField label="Preço de venda" value={p.price} onChange={(v) => updateProduct({ price: v })} prefix="R$"
            tooltip="Preço que o cliente paga. Ex: R$ 197,00" step={0.1} highlight />
          <InputField label="Meta de vendas (30 dias)" value={p.salesGoal} onChange={(v) => updateProduct({ salesGoal: v })}
            tooltip="Quantas vendas em 30 dias. Ex: 100" step={1} highlight />
        </div>
      </motion.div>

      {/* Custos */}
      <motion.div variants={item} className="section-card space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full bg-amber" />
          <h3 className="section-title">💰 Custos por Venda</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Taxas descontadas de cada venda. Ex: Se a plataforma cobra 10% + R$ 2,49 por venda, coloque esses valores.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Impostos" value={p.taxRate} onChange={(v) => updateProduct({ taxRate: v })} suffix="%"
            tooltip="% de imposto. Ex: MEI paga ~6%" step={0.5} highlight />
          <InputField label="Taxa da plataforma (%)" value={p.platformRate} onChange={(v) => updateProduct({ platformRate: v })} suffix="%"
            tooltip="% cobrado pela plataforma. Ex: Hotmart cobra ~10%" step={0.5} highlight />
          <InputField label="Taxa fixa por venda" value={p.platformFixedFee} onChange={(v) => updateProduct({ platformFixedFee: v })} prefix="R$"
            tooltip="Valor fixo por venda. Ex: R$ 2,49" highlight />
          <InputField label="Comissão co-produtor" value={p.commissionRate} onChange={(v) => updateProduct({ commissionRate: v })} suffix="%"
            tooltip="Se tem co-produtor, coloque a % dele. Se não, deixe 0%" step={0.5} highlight />
          <InputField label="Outros custos fixos" value={p.otherFixedCosts} onChange={(v) => updateProduct({ otherFixedCosts: v })} prefix="R$"
            tooltip="Outros custos por venda. Se não tem, deixe 0" highlight />
        </div>
      </motion.div>

      {/* ===================== SEPARADOR ===================== */}
      <motion.div variants={item} className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-background text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Monetização do Funil
          </span>
        </div>
      </motion.div>

      {/* ===================== OFERTAS DO FUNIL ===================== */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="section-title">🚀 Ofertas do Funil</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione Order Bumps, Upsells e Downsells para aumentar seu lucro por cliente.
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            <Plus className="h-4 w-4 mr-1" /> Nova Oferta
          </Button>
        </div>
      </motion.div>

      {/* LTV Bar */}
      {state.offers.length > 0 && (
        <motion.div variants={item} className="glass-card p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Receita Líquida por Cliente (LTV Imediato)</h4>
          <div className="flex items-center gap-1 h-10 rounded-lg overflow-hidden">
            <motion.div
              className="h-full bg-primary flex items-center justify-center px-3 rounded-l-lg"
              style={{ flex: Math.max(funnelCalc.cpaMaxProduct, 1) }}
              layout
            >
              <span className="text-[11px] font-mono font-semibold text-primary-foreground truncate">Principal</span>
            </motion.div>
            {funnelCalc.offerResults.map((r, i) => (
              <motion.div
                key={state.offers[i]?.id}
                className={`h-full flex items-center justify-center px-2 ${
                  state.offers[i]?.type === 'upsell' ? 'bg-emerald' :
                  state.offers[i]?.type === 'downsell' ? 'bg-amber' : 'bg-primary/60'
                }`}
                style={{ flex: Math.max(r.contributionPerMainSale, 0.5) }}
                layout
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
              >
                <span className="text-[11px] font-mono font-semibold truncate text-white">{state.offers[i]?.name.slice(0, 8)}</span>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">Total por cliente</span>
            <span className="text-sm font-mono font-semibold number-glow-safe">{formatBRL(funnelCalc.revenuePerClient)}</span>
          </div>
        </motion.div>
      )}

      {/* Offer cards */}
      <AnimatePresence mode="popLayout">
        {state.offers.map((offer, i) => {
          const result = funnelCalc.offerResults[i];
          const Icon = typeIcons[offer.type];
          const typeColor = offer.type === 'upsell' ? 'bg-emerald' : offer.type === 'downsell' ? 'bg-amber' : 'bg-primary';
          return (
            <motion.div
              key={offer.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="section-card space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-1 h-6 rounded-full ${typeColor}`} />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {typeLabels[offer.type]}
                  </span>
                </div>
                <button onClick={() => removeOffer(offer.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Nome</label>
                  <input
                    type="text" value={offer.name}
                    onChange={(e) => updateOffer(offer.id, { name: e.target.value })}
                    className="user-input w-full text-foreground"
                  />
                </div>
                <InputField label="Preço" value={offer.price} prefix="R$"
                  onChange={(v) => updateOffer(offer.id, { price: v })} highlight
                  tooltip="Preço desta oferta. Ex: R$ 47,00" />
                <InputField label="Conversão" value={offer.conversionRate} suffix="%"
                  onChange={(v) => updateOffer(offer.id, { conversionRate: v })} highlight
                  tooltip="De cada 100 compradores, quantos compram esta oferta? Ex: 15%" />
                <InputField label="Impostos" value={offer.taxRate} suffix="%"
                  onChange={(v) => updateOffer(offer.id, { taxRate: v })} highlight />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputField label="Taxa plataforma" value={offer.platformRate} suffix="%"
                  onChange={(v) => updateOffer(offer.id, { platformRate: v })} highlight />
                <InputField label="Taxa fixa" value={offer.platformFixedFee} prefix="R$"
                  onChange={(v) => updateOffer(offer.id, { platformFixedFee: v })} highlight />
                <InputField label="Comissão" value={offer.commissionRate} suffix="%"
                  onChange={(v) => updateOffer(offer.id, { commissionRate: v })} highlight />
                <InputField label="Outros custos" value={offer.otherFixedCosts} prefix="R$"
                  onChange={(v) => updateOffer(offer.id, { otherFixedCosts: v })} highlight />
              </div>

              {result && (
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard label="Líquido / venda" value={formatBRL(result.netValuePerSale)} signal="safe" compact
                    tooltip="Lucro por venda desta oferta" />
                  <MetricCard label="Vendas projetadas" value={result.salesCount.toFixed(0)} compact
                    tooltip="Vendas esperadas baseado na conversão" />
                  <MetricCard label="Contribuição / cliente" value={formatBRL(result.contributionPerMainSale)} signal="primary" compact
                    tooltip="Lucro adicionado por cada cliente do produto principal" />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {state.offers.length === 0 && (
        <motion.div variants={item} className="glass-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhuma oferta adicionada. Clique em <strong className="text-foreground">"Nova Oferta"</strong> para adicionar Order Bumps, Upsells ou Downsells.
          </p>
        </motion.div>
      )}

      {/* Funnel summary */}
      {state.offers.length > 0 && (
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Faturamento Total (Funil)" value={formatBRL(funnelCalc.totalGrossRevenue)} />
          <MetricCard label="Líquido Total (Funil)" value={formatBRL(funnelCalc.totalNetRevenue)} signal="safe" />
          <MetricCard label="CPA Máx. Funil" value={formatBRL(funnelCalc.cpaMaxFunnel)} signal="safe"
            tooltip="CPA máximo considerando toda a receita do funil" />
          <MetricCard label="Break-even" value={`${funnelCalc.breakEvenSales} vendas`}
            tooltip="Vendas necessárias para cobrir o investimento em tráfego" />
        </motion.div>
      )}

      {/* Dialog for adding offers */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold tracking-tight">Nova Oferta</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tipo da Oferta</label>
              <div className="grid grid-cols-1 gap-2">
                {(['orderbump', 'upsell', 'downsell'] as const).map(t => {
                  const Icon = typeIcons[t];
                  const isSelected = newType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setNewType(t)}
                      className={`glass-card p-4 flex items-center gap-3 text-left transition-all ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <span className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {typeLabels[t]}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {t === 'orderbump' && 'Oferta na página de pagamento (checkout)'}
                          {t === 'upsell' && 'Oferta após a compra, com preço maior'}
                          {t === 'downsell' && 'Oferta alternativa com preço menor'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Copy taxes toggle */}
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-amber" />
                  <span className="text-sm font-medium text-foreground">Copiar taxas do produto principal</span>
                </div>
                <Switch checked={copyTaxes} onCheckedChange={setCopyTaxes} />
              </div>
              <p className="text-xs text-muted-foreground">
                {copyTaxes
                  ? `Taxas copiadas: Impostos ${p.taxRate}%, Plataforma ${p.platformRate}%, Taxa fixa ${formatBRL(p.platformFixedFee)}`
                  : 'Você configurará as taxas manualmente após criar a oferta.'
                }
              </p>
            </div>

            <Button onClick={handleAddOffer} className="w-full bg-primary text-primary-foreground font-semibold">
              <Plus className="h-4 w-4 mr-2" /> Adicionar {typeLabels[newType]}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function CostBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 1)}%` }}
          transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
        />
      </div>
      <span className="text-xs font-mono text-foreground w-20 text-right">
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
      <span className="text-xs font-mono text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}