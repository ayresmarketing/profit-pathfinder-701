import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, FunnelOffer } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ShoppingBag, ArrowUpRight, ArrowDownRight, Copy, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fadeIn = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

const typeLabels = { orderbump: 'Order Bump', upsell: 'Upsell', downsell: 'Downsell' };
const typeIcons = { orderbump: ShoppingBag, upsell: ArrowUpRight, downsell: ArrowDownRight };
const typeColors = {
  orderbump: { badge: 'bg-primary/10 text-primary border-primary/20', bar: 'bg-primary' },
  upsell: { badge: 'bg-emerald/10 text-emerald border-emerald/20', bar: 'bg-emerald' },
  downsell: { badge: 'bg-amber/10 text-amber border-amber/20', bar: 'bg-amber' },
};

export default function ProductRegistration() {
  const { state, updateProduct, addOffer, updateOffer, removeOffer } = useOperation();
  const p = state.product;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState<FunnelOffer['type']>('orderbump');
  const [copyTaxes, setCopyTaxes] = useState(false);
  const [copyFromProduct, setCopyFromProduct] = useState<string>('main');
  const [expandedOffers, setExpandedOffers] = useState<Record<string, boolean>>({});

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

  const toggleExpand = (id: string) => setExpandedOffers(prev => ({ ...prev, [id]: !prev[id] }));

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

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <motion.div variants={fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Cadastro de Produtos</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastre seus produtos e configure taxas e custos de cada um.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="font-semibold text-sm text-primary-foreground gap-2" style={{ background: 'var(--gradient-primary)' }}>
          <Plus className="h-4 w-4" /> Novo Produto
        </Button>
      </motion.div>

      {/* ===== PRODUTO PRINCIPAL ===== */}
      <motion.div variants={fadeIn} className="section-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Produto Principal</h2>
            <p className="text-xs text-muted-foreground">Este é o produto central da sua operação.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome do Produto</label>
            <input type="text" value={p.name} onChange={(e) => updateProduct({ name: e.target.value })}
              className="user-input w-full text-sm" placeholder="Ex: Curso de Marketing Digital" />
          </div>
          <InputField label="Preço de Venda" value={p.price} onChange={(v) => updateProduct({ price: v })} prefix="R$"
            tooltip="Preço que o cliente paga pelo produto" step={0.1} highlight />
        </div>

        <div className="bg-secondary/50 rounded-xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">💰 Custos por Venda</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <InputField label="Impostos" value={p.taxRate} onChange={(v) => updateProduct({ taxRate: v })} suffix="%"
              step={0.5} highlight tooltip="Ex: MEI ≈ 6%, Simples ≈ 11%" />
            <InputField label="Taxa plataforma" value={p.platformRate} onChange={(v) => updateProduct({ platformRate: v })}
              suffix="%" step={0.5} highlight tooltip="Hotmart ≈ 9,9%, Kiwify ≈ 8,99%" />
            <InputField label="Taxa fixa/venda" value={p.platformFixedFee} onChange={(v) => updateProduct({ platformFixedFee: v })}
              prefix="R$" highlight tooltip="Valor fixo cobrado a cada venda" />
            <InputField label="Comissão" value={p.commissionRate} onChange={(v) => updateProduct({ commissionRate: v })}
              suffix="%" step={0.5} highlight tooltip="Comissão do co-produtor ou afiliado" />
            <InputField label="Outros custos" value={p.otherFixedCosts} onChange={(v) => updateProduct({ otherFixedCosts: v })}
              prefix="R$" highlight tooltip="Suporte, ferramentas, etc." />
          </div>
        </div>
      </motion.div>

      {/* ===== PRODUTOS SECUNDÁRIOS ===== */}
      <motion.div variants={fadeIn}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Produtos Secundários</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Order Bumps, Upsells e Downsells do seu funil.</p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{state.offers.length} produto(s)</span>
        </div>

        {state.offers.length === 0 ? (
          <div className="section-card text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Plus className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum produto secundário cadastrado.</p>
            <p className="text-xs text-muted-foreground mt-1">Clique em <strong className="text-foreground">"Novo Produto"</strong> para adicionar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {state.offers.map((offer) => {
                const isExpanded = expandedOffers[offer.id] !== false;
                const colors = typeColors[offer.type];
                const Icon = typeIcons[offer.type];

                return (
                  <motion.div key={offer.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }} className="section-card">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <button onClick={() => toggleExpand(offer.id)} className="flex items-center gap-3 flex-1 text-left">
                        <div className={`w-2 h-8 rounded-full ${colors.bar}`} />
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${colors.badge}`}>
                          <Icon className="h-3 w-3" />
                          {typeLabels[offer.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-foreground">{offer.name}</span>
                          <span className="text-xs text-muted-foreground font-mono ml-2">{formatBRL(offer.price)}</span>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <button onClick={() => removeOffer(offer.id)} className="ml-2 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pt-5 space-y-5">
                            {/* Info básica */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                                <input type="text" value={offer.name} onChange={(e) => updateOffer(offer.id, { name: e.target.value })} className="user-input w-full text-sm" />
                              </div>
                              <InputField label="Preço de Venda" value={offer.price} prefix="R$" onChange={(v) => updateOffer(offer.id, { price: v })} highlight />
                            </div>

                            {/* Copiar taxas */}
                            <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-3 border border-primary/10">
                              <Copy className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-xs font-medium text-foreground flex-1">Copiar taxas de:</span>
                              <Select onValueChange={(val) => handleCopyTaxesToOffer(offer.id, val)}>
                                <SelectTrigger className="h-8 text-xs w-48">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {allProducts.filter(pr => pr.id !== offer.id).map(pr => (
                                    <SelectItem key={pr.id} value={pr.id} className="text-xs">{pr.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Custos */}
                            <div className="bg-secondary/50 rounded-xl p-4">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">💰 Custos por Venda</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                <InputField label="Impostos" value={offer.taxRate} suffix="%" onChange={(v) => updateOffer(offer.id, { taxRate: v })} highlight />
                                <InputField label="Taxa plataforma" value={offer.platformRate} suffix="%" onChange={(v) => updateOffer(offer.id, { platformRate: v })} highlight />
                                <InputField label="Taxa fixa" value={offer.platformFixedFee} prefix="R$" onChange={(v) => updateOffer(offer.id, { platformFixedFee: v })} highlight />
                                <InputField label="Comissão" value={offer.commissionRate} suffix="%" onChange={(v) => updateOffer(offer.id, { commissionRate: v })} highlight />
                                <InputField label="Outros custos" value={offer.otherFixedCosts} prefix="R$" onChange={(v) => updateOffer(offer.id, { otherFixedCosts: v })} highlight />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Dialog para adicionar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Novo Produto Secundário</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo do Produto</label>
              <div className="grid grid-cols-1 gap-2">
                {(['orderbump', 'upsell', 'downsell'] as const).map(t => {
                  const Icon = typeIcons[t];
                  const isSelected = newType === t;
                  return (
                    <button key={t} onClick={() => setNewType(t)}
                      className={`rounded-xl p-4 flex items-center gap-3 text-left transition-all border ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5 border-primary/20' : 'border-border hover:bg-secondary'
                      }`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <span className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{typeLabels[t]}</span>
                        <p className="text-[11px] text-muted-foreground">
                          {t === 'orderbump' && 'Oferta na página de pagamento'}
                          {t === 'upsell' && 'Oferta após a compra (preço maior)'}
                          {t === 'downsell' && 'Oferta alternativa (preço menor)'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Copiar taxas de outro produto</span>
                </div>
                <Switch checked={copyTaxes} onCheckedChange={setCopyTaxes} />
              </div>
              {copyTaxes && (
                <div className="space-y-2">
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
            </div>

            <Button onClick={handleAddOffer} className="w-full font-semibold text-primary-foreground" style={{ background: 'var(--gradient-primary)' }}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar {typeLabels[newType]}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
