import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, FunnelOffer } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ShoppingBag, ArrowUpRight, ArrowDownRight, Copy, DollarSign, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const typeLabels = { orderbump: 'Order Bump', upsell: 'Upsell', downsell: 'Downsell' };
const typeIcons = { orderbump: ShoppingBag, upsell: ArrowUpRight, downsell: ArrowDownRight };

export default function ProductRegistration() {
  const { state, updateProduct, addOffer, updateOffer, removeOffer } = useOperation();
  const p = state.product;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState<FunnelOffer['type']>('orderbump');
  const [copyTaxes, setCopyTaxes] = useState(false);
  const [copyFromProduct, setCopyFromProduct] = useState<string>('main');
  const [expandedOffers, setExpandedOffers] = useState<Record<string, boolean>>({});

  // All products for copy-taxes selector
  const allProducts = [
    { id: 'main', name: p.name, taxRate: p.taxRate, platformRate: p.platformRate, platformFixedFee: p.platformFixedFee, commissionRate: p.commissionRate, otherFixedCosts: p.otherFixedCosts },
    ...state.offers.map(o => ({ id: o.id, name: o.name, taxRate: o.taxRate, platformRate: o.platformRate, platformFixedFee: o.platformFixedFee, commissionRate: o.commissionRate, otherFixedCosts: o.otherFixedCosts })),
  ];

  const selectedSource = allProducts.find(pr => pr.id === copyFromProduct) || allProducts[0];

  const handleAddOffer = () => {
    const source = copyTaxes ? selectedSource : null;
    const offer: FunnelOffer = {
      id: crypto.randomUUID(),
      type: newType,
      name: `${typeLabels[newType]}`,
      price: newType === 'downsell' ? 19.90 : 29.90,
      conversionRate: newType === 'orderbump' ? 15 : 10,
      taxRate: source ? source.taxRate : 6,
      platformRate: source ? source.platformRate : 10,
      platformFixedFee: source ? source.platformFixedFee : 2.50,
      commissionRate: source ? source.commissionRate : 0,
      otherFixedCosts: source ? source.otherFixedCosts : 0,
    };
    addOffer(offer);
    setExpandedOffers(prev => ({ ...prev, [offer.id]: true }));
    setDialogOpen(false);
  };

  const toggleOfferExpand = (id: string) => {
    setExpandedOffers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy taxes to existing offer
  const handleCopyTaxesToOffer = (offerId: string, sourceId: string) => {
    const source = allProducts.find(pr => pr.id === sourceId);
    if (!source) return;
    updateOffer(offerId, {
      taxRate: source.taxRate,
      platformRate: source.platformRate,
      platformFixedFee: source.platformFixedFee,
      commissionRate: source.commissionRate,
      otherFixedCosts: source.otherFixedCosts,
    });
  };

  const orderbumps = state.offers.filter(o => o.type === 'orderbump');
  const upsells = state.offers.filter(o => o.type === 'upsell');
  const downsells = state.offers.filter(o => o.type === 'downsell');

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground tracking-tight">Cadastro de Produtos</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Cadastre seu produto principal e produtos secundários (Order Bumps, Upsells, Downsells) com suas respectivas taxas.
        </p>
      </motion.div>

      {/* ===== PRODUTO PRINCIPAL ===== */}
      <motion.div variants={item} className="premium-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Produto Principal</h3>
            <p className="text-[11px] text-muted-foreground">Defina nome, preço de venda e os custos do seu produto.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nome do Produto</label>
            <input type="text" value={p.name} onChange={(e) => updateProduct({ name: e.target.value })}
              className="user-input w-full" placeholder="Ex: Curso de Marketing" />
          </div>
          <InputField label="Preço de venda" value={p.price} onChange={(v) => updateProduct({ price: v })} prefix="R$"
            tooltip="Preço que o cliente paga pelo produto" step={0.1} highlight />
        </div>

        {/* Custos */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Custos por venda</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InputField label="Impostos" value={p.taxRate} onChange={(v) => updateProduct({ taxRate: v })} suffix="%"
              step={0.5} highlight tooltip="Percentual de impostos. Ex: MEI ≈ 6%" />
            <InputField label="Taxa da plataforma (%)" value={p.platformRate} onChange={(v) => updateProduct({ platformRate: v })}
              suffix="%" step={0.5} highlight tooltip="Percentual cobrado pela plataforma (Hotmart, Kiwify, etc)" />
            <InputField label="Taxa fixa por venda" value={p.platformFixedFee} onChange={(v) => updateProduct({ platformFixedFee: v })}
              prefix="R$" highlight tooltip="Valor fixo cobrado por cada venda (ex: R$ 2,49)" />
            <InputField label="Comissão co-produtor" value={p.commissionRate} onChange={(v) => updateProduct({ commissionRate: v })}
              suffix="%" step={0.5} highlight tooltip="Se você tem um co-produtor, coloque a % de comissão dele" />
            <InputField label="Outros custos fixos" value={p.otherFixedCosts} onChange={(v) => updateProduct({ otherFixedCosts: v })}
              prefix="R$" highlight tooltip="Outros custos fixos por venda (suporte, ferramentas, etc)" />
          </div>
        </div>
      </motion.div>

      {/* ===== SEPARATOR: PRODUTOS SECUNDÁRIOS ===== */}
      <motion.div variants={item} className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-6 bg-background text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Produtos Secundários
          </span>
        </div>
      </motion.div>

      {/* Add offer button */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">Adicionar Produto Secundário</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Order Bumps, Upsells e Downsells para complementar seu funil.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="font-semibold text-sm text-white" style={{ background: 'var(--gradient-primary)' }}>
          <Plus className="h-4 w-4 mr-1.5" /> Novo Produto
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
                        {/* Basic info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nome</label>
                            <input type="text" value={offer.name} onChange={(e) => updateOffer(offer.id, { name: e.target.value })} className="user-input w-full" />
                          </div>
                          <InputField label="Preço de venda" value={offer.price} prefix="R$" onChange={(v) => updateOffer(offer.id, { price: v })} highlight />
                        </div>

                        {/* Copy taxes toggle */}
                        <div className="glass-card p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Copy className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-medium text-foreground">Copiar taxas de outro produto</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select onValueChange={(val) => handleCopyTaxesToOffer(offer.id, val)}>
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue placeholder="Selecione o produto..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allProducts.filter(pr => pr.id !== offer.id).map(pr => (
                                  <SelectItem key={pr.id} value={pr.id} className="text-xs">{pr.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Custos */}
                        <div className="border-t border-border pt-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Custos por venda</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <InputField label="Impostos" value={offer.taxRate} suffix="%" onChange={(v) => updateOffer(offer.id, { taxRate: v })} highlight />
                            <InputField label="Taxa plataforma" value={offer.platformRate} suffix="%" onChange={(v) => updateOffer(offer.id, { platformRate: v })} highlight />
                            <InputField label="Taxa fixa" value={offer.platformFixedFee} prefix="R$" onChange={(v) => updateOffer(offer.id, { platformFixedFee: v })} highlight />
                            <InputField label="Comissão" value={offer.commissionRate} suffix="%" onChange={(v) => updateOffer(offer.id, { commissionRate: v })} highlight />
                            <InputField label="Outros custos" value={offer.otherFixedCosts} prefix="R$" onChange={(v) => updateOffer(offer.id, { otherFixedCosts: v })} highlight />
                          </div>
                        </div>
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
            Nenhum produto secundário adicionado. Clique em <strong className="text-foreground">"Novo Produto"</strong> para começar.
          </p>
        </motion.div>
      )}

      {/* Dialog for adding offers */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold tracking-tight">Novo Produto Secundário</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tipo do Produto</label>
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
                  <span className="text-sm font-medium text-foreground">Copiar taxas de outro produto</span>
                </div>
                <Switch checked={copyTaxes} onCheckedChange={setCopyTaxes} />
              </div>
              {copyTaxes && (
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Copiar taxas do produto:</label>
                  <Select value={copyFromProduct} onValueChange={setCopyFromProduct}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts.map(pr => (
                        <SelectItem key={pr.id} value={pr.id} className="text-xs">{pr.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Impostos {selectedSource.taxRate}% · Plataforma {selectedSource.platformRate}% · Taxa fixa {formatBRL(selectedSource.platformFixedFee)}
                  </p>
                </div>
              )}
              {!copyTaxes && (
                <p className="text-[11px] text-muted-foreground">
                  Você configurará as taxas manualmente após adicionar.
                </p>
              )}
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
