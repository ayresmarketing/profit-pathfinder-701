import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatPercent, formatNumber, FunnelOffer } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ShoppingBag, ArrowUpRight, ArrowDownRight, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const typeLabels = { orderbump: 'Order Bump', upsell: 'Upsell', downsell: 'Downsell' };
const typeIcons = { orderbump: ShoppingBag, upsell: ArrowUpRight, downsell: ArrowDownRight };
const typeColors = { orderbump: 'text-electric', upsell: 'text-emerald', downsell: 'text-amber' };

export default function FinancialSimulator() {
  const { state, updateProduct, addOffer, updateOffer, removeOffer, productCalc, funnelCalc } = useOperation();
  const p = state.product;

  const [drawerOpen, setDrawerOpen] = useState(false);
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
    setDrawerOpen(false);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h2 className="font-display text-base font-bold tracking-wider text-foreground">OPERAÇÃO</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure seu produto principal e monte seu funil de monetização. 
          <span className="tag-user ml-2">✏️ Você preenche</span> os campos com borda amarela.
        </p>
      </motion.div>

      {/* ===================== PRODUTO PRINCIPAL ===================== */}
      <motion.div variants={item} className="neon-card space-y-4">
        <h3 className="section-title">🎯 Produto Principal</h3>
        <p className="text-xs text-muted-foreground">
          Preencha as informações do seu produto. Exemplo: Se você vende um curso de R$ 197,00 pela Hotmart, preencha o preço como 197 e a taxa da plataforma como a comissão que a Hotmart cobra.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-1 space-y-1">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome do Produto</label>
            <input
              type="text"
              value={p.name}
              onChange={(e) => updateProduct({ name: e.target.value })}
              className="user-input w-full text-foreground"
              placeholder="Ex: Curso de Marketing"
            />
          </div>
          <InputField label="Preço de venda" value={p.price} onChange={(v) => updateProduct({ price: v })} prefix="R$"
            tooltip="Preço que o cliente paga pelo seu produto. Exemplo: R$ 197,00" step={0.1} highlight />
          <InputField label="Meta de vendas (30 dias)" value={p.salesGoal} onChange={(v) => updateProduct({ salesGoal: v })}
            tooltip="Quantas vendas você espera fazer em 30 dias. Exemplo: 100 vendas" step={1} highlight />
        </div>
      </motion.div>

      {/* Custos */}
      <motion.div variants={item} className="neon-card space-y-4">
        <h3 className="section-title">💰 Custos por Venda</h3>
        <p className="text-xs text-muted-foreground">
          Preencha as taxas que são descontadas de cada venda. Exemplo: Se a plataforma cobra 10% + R$ 2,49 por venda, coloque esses valores abaixo.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Impostos" value={p.taxRate} onChange={(v) => updateProduct({ taxRate: v })} suffix="%"
            tooltip="% de imposto sobre cada venda. Exemplo: MEI paga ~6%" step={0.5} highlight />
          <InputField label="Taxa da plataforma (%)" value={p.platformRate} onChange={(v) => updateProduct({ platformRate: v })} suffix="%"
            tooltip="Percentual cobrado pela plataforma. Exemplo: Hotmart cobra ~10%" step={0.5} highlight />
          <InputField label="Taxa fixa por venda" value={p.platformFixedFee} onChange={(v) => updateProduct({ platformFixedFee: v })} prefix="R$"
            tooltip="Valor fixo que a plataforma cobra por venda. Exemplo: R$ 2,49" highlight />
          <InputField label="Comissão co-produtor" value={p.commissionRate} onChange={(v) => updateProduct({ commissionRate: v })} suffix="%"
            tooltip="Se você tem um co-produtor, coloque a % dele aqui. Se não tem, deixe 0%" step={0.5} highlight />
          <InputField label="Outros custos fixos" value={p.otherFixedCosts} onChange={(v) => updateProduct({ otherFixedCosts: v })} prefix="R$"
            tooltip="Outros custos por venda, como suporte, entrega, etc. Se não tem, deixe 0" highlight />
        </div>
      </motion.div>

      {/* Resultados do produto */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="section-title">📊 Resultados Calculados</h3>
          <span className="tag-auto">⚡ Automático</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="CPA Máximo (Produto)"
            value={formatBRL(funnelCalc.cpaMaxProduct)}
            signal="primary"
            tooltip="Este é o valor MÁXIMO que você pode pagar por cada venda sem ter prejuízo. Se seu custo por venda passar desse valor, você perde dinheiro."
          />
          <MetricCard
            label="CPA Máximo (Funil)"
            value={formatBRL(funnelCalc.cpaMaxFunnel)}
            signal="safe"
            tooltip="Considerando o funil completo (bumps + upsells), esse é o valor máximo por venda. Quanto mais ofertas, maior fica esse número."
          />
          <MetricCard
            label="Lucro líquido / venda"
            value={formatBRL(productCalc.netValuePerSale)}
            signal={productCalc.netValuePerSale > 0 ? 'safe' : 'danger'}
            tooltip="Quanto sobra no seu bolso por cada venda, depois de descontar TODAS as taxas"
          />
          <MetricCard
            label="Vendas por dia"
            value={formatNumber(productCalc.salesPerDay, 1)}
            signal="neutral"
            tooltip="Para bater sua meta mensal, você precisa fazer esse número de vendas por dia"
          />
        </div>
      </motion.div>

      {/* Composição de custos */}
      <motion.div variants={item} className="glass-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Composição de Custos (por venda)</h3>
        <div className="space-y-2.5">
          <CostBar label="Impostos" value={productCalc.taxPerSale} total={p.price} color="bg-amber" />
          <CostBar label="Plataforma" value={productCalc.platformFeePerSale} total={p.price} color="bg-electric" />
          <CostBar label="Comissão" value={productCalc.commissionPerSale} total={p.price} color="bg-rose" />
          <CostBar label="Líquido" value={productCalc.netValuePerSale} total={p.price} color="bg-emerald" />
        </div>
      </motion.div>

      {/* Totais */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard label="Faturamento Bruto" value={formatBRL(productCalc.grossRevenue)}
          tooltip="Preço × Meta de vendas. Exemplo: R$ 197 × 100 = R$ 19.700" />
        <MetricCard label="Faturamento Líquido" value={formatBRL(productCalc.netRevenue)} signal="safe"
          tooltip="Quanto realmente entra no seu bolso depois de todas as taxas" />
        <MetricCard
          label="Custos Totais"
          value={formatBRL(productCalc.totalCostsTotal)}
          subtitle={formatPercent((productCalc.totalCostsTotal / productCalc.grossRevenue) * 100) + ' do faturamento'}
          tooltip="Soma de todos os custos (impostos + plataforma + comissões)"
        />
      </motion.div>

      {/* ===================== SEPARADOR ===================== */}
      <motion.div variants={item} className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-background font-display text-xs font-bold tracking-wider text-muted-foreground">
            MONETIZAÇÃO DO FUNIL
          </span>
        </div>
      </motion.div>

      {/* ===================== OFERTAS DO FUNIL ===================== */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="section-title">🚀 Ofertas do Funil</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione Order Bumps, Upsells e Downsells para aumentar seu lucro por cliente. Quanto mais ofertas, maior o CPA que você pode pagar.
            </p>
          </div>
          <Button
            onClick={() => setDrawerOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            <Plus className="h-4 w-4 mr-1" /> Nova Oferta
          </Button>
        </div>
      </motion.div>

      {/* LTV Bar */}
      {state.offers.length > 0 && (
        <motion.div variants={item} className="glass-card p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Receita Líquida por Cliente (LTV Imediato)</h4>
          <div className="flex items-center gap-1 h-8 rounded overflow-hidden">
            <motion.div
              className="h-full bg-electric flex items-center justify-center px-2 rounded-l"
              style={{ flex: Math.max(funnelCalc.cpaMaxProduct, 1) }}
              layout
            >
              <span className="text-[10px] font-mono font-semibold text-primary-foreground truncate">Principal</span>
            </motion.div>
            {funnelCalc.offerResults.map((r, i) => (
              <motion.div
                key={state.offers[i]?.id}
                className={`h-full flex items-center justify-center px-1 ${
                  state.offers[i]?.type === 'upsell' ? 'bg-emerald' :
                  state.offers[i]?.type === 'downsell' ? 'bg-amber' : 'bg-neon-purple'
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
          return (
            <motion.div
              key={offer.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="neon-card space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${typeColors[offer.type]}`} />
                  <span className={`font-display text-[10px] font-bold uppercase tracking-wider ${typeColors[offer.type]}`}>
                    {typeLabels[offer.type]}
                  </span>
                </div>
                <button onClick={() => removeOffer(offer.id)} className="text-muted-foreground hover:text-rose transition-colors p-1 rounded hover:bg-rose/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</label>
                  <input
                    type="text" value={offer.name}
                    onChange={(e) => updateOffer(offer.id, { name: e.target.value })}
                    className="user-input w-full text-foreground"
                  />
                </div>
                <InputField label="Preço" value={offer.price} prefix="R$"
                  onChange={(v) => updateOffer(offer.id, { price: v })} highlight
                  tooltip="Preço desta oferta. Exemplo: R$ 47,00" />
                <InputField label="Conversão" value={offer.conversionRate} suffix="%"
                  onChange={(v) => updateOffer(offer.id, { conversionRate: v })} highlight
                  tooltip="De cada 100 compradores do produto principal, quantos compram esta oferta? Exemplo: 15% significa 15 de cada 100." />
                <InputField label="Impostos" value={offer.taxRate} suffix="%"
                  onChange={(v) => updateOffer(offer.id, { taxRate: v })} highlight />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard label="Líquido / venda" value={formatBRL(result.netValuePerSale)} signal="safe" compact
                    tooltip="Quanto sobra de lucro por cada venda desta oferta" />
                  <MetricCard label="Vendas projetadas" value={result.salesCount.toFixed(0)} compact
                    tooltip="Quantas vendas desta oferta são esperadas baseado na conversão" />
                  <MetricCard label="Contribuição / cliente" value={formatBRL(result.contributionPerMainSale)} signal="primary" compact
                    tooltip="Quanto esta oferta adiciona de lucro para cada cliente que compra o produto principal" />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {state.offers.length === 0 && (
        <motion.div variants={item} className="glass-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            ✨ Nenhuma oferta adicionada ainda. Clique em <strong className="text-foreground">"Nova Oferta"</strong> para adicionar Order Bumps, Upsells ou Downsells e aumentar o lucro por cliente.
          </p>
        </motion.div>
      )}

      {/* Funnel summary */}
      {state.offers.length > 0 && (
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Faturamento Total (Funil)" value={formatBRL(funnelCalc.totalGrossRevenue)} />
          <MetricCard label="Líquido Total (Funil)" value={formatBRL(funnelCalc.totalNetRevenue)} signal="safe" />
          <MetricCard label="CPA Máx. Funil" value={formatBRL(funnelCalc.cpaMaxFunnel)} signal="safe"
            tooltip="CPA máximo considerando a receita de todas as ofertas do funil" />
          <MetricCard label="Break-even" value={`${funnelCalc.breakEvenSales} vendas`}
            tooltip="Vendas necessárias apenas para cobrir o investimento em tráfego" />
        </motion.div>
      )}

      {/* Drawer for adding offers */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="bg-card border-border">
          <SheetHeader>
            <SheetTitle className="text-foreground font-display tracking-wider">NOVA OFERTA</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo da Oferta</label>
              <div className="grid grid-cols-1 gap-2">
                {(['orderbump', 'upsell', 'downsell'] as const).map(t => {
                  const Icon = typeIcons[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setNewType(t)}
                      className={`glass-card p-4 flex items-center gap-3 text-left transition-all ${
                        newType === t ? 'border-primary' : ''
                      }`}
                      style={newType === t ? { borderColor: 'hsl(var(--primary))' } : {}}
                    >
                      <Icon className={`h-5 w-5 ${typeColors[t]}`} />
                      <div>
                        <span className={`text-sm font-semibold ${newType === t ? 'text-foreground' : 'text-muted-foreground'}`}>
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
                  <Copy className="h-4 w-4 text-neon-yellow" />
                  <span className="text-sm font-medium text-foreground">Copiar taxas do produto principal</span>
                </div>
                <Switch checked={copyTaxes} onCheckedChange={setCopyTaxes} />
              </div>
              <p className="text-xs text-muted-foreground">
                {copyTaxes
                  ? `As taxas do produto principal serão copiadas: Impostos ${p.taxRate}%, Plataforma ${p.platformRate}%, Taxa fixa ${formatBRL(p.platformFixedFee)}`
                  : 'Você poderá configurar as taxas manualmente após criar a oferta.'
                }
              </p>
            </div>

            <Button onClick={handleAddOffer} className="w-full bg-primary text-primary-foreground font-semibold text-sm">
              <Plus className="h-4 w-4 mr-2" /> Adicionar {typeLabels[newType]}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}

function CostBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
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
