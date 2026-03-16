import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatPercent, formatNumber } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import { motion } from 'framer-motion';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function FinancialSimulator() {
  const { state, updateProduct, productCalc, funnelCalc } = useOperation();
  const p = state.product;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Simulador Financeiro</h2>
        <p className="text-sm text-muted-foreground">Núcleo da operação. Todos os módulos dependem destes dados.</p>
      </motion.div>

      {/* Product Info */}
      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-electric">Produto Principal</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-2 md:col-span-1 space-y-1">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</label>
            <input
              type="text"
              value={p.name}
              onChange={(e) => updateProduct({ name: e.target.value })}
              className="precision-input w-full text-foreground"
            />
          </div>
          <InputField label="Preço" value={p.price} onChange={(v) => updateProduct({ price: v })} prefix="R$"
            tooltip="Preço de venda do produto principal" step={0.1} />
          <InputField label="Meta de vendas (30d)" value={p.salesGoal} onChange={(v) => updateProduct({ salesGoal: v })}
            tooltip="Quantidade de vendas esperada em 30 dias" step={1} />
        </div>
      </motion.div>

      {/* Costs */}
      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-electric">Custos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Impostos" value={p.taxRate} onChange={(v) => updateProduct({ taxRate: v })} suffix="%"
            tooltip="Alíquota de impostos sobre cada venda" step={0.5} />
          <InputField label="Taxa da plataforma" value={p.platformRate} onChange={(v) => updateProduct({ platformRate: v })} suffix="%"
            tooltip="Percentual cobrado pela plataforma de vendas" step={0.5} />
          <InputField label="Taxa fixa por venda" value={p.platformFixedFee} onChange={(v) => updateProduct({ platformFixedFee: v })} prefix="R$"
            tooltip="Valor fixo cobrado pela plataforma por cada venda" />
          <InputField label="Comissão co-produtor" value={p.commissionRate} onChange={(v) => updateProduct({ commissionRate: v })} suffix="%"
            tooltip="Percentual pago ao co-produtor por cada venda" step={0.5} />
          <InputField label="Outros custos fixos" value={p.otherFixedCosts} onChange={(v) => updateProduct({ otherFixedCosts: v })} prefix="R$"
            tooltip="Custos fixos adicionais por venda (ex: entrega, suporte)" />
        </div>
      </motion.div>

      {/* Results */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="CPA Máximo (Produto)"
          value={formatBRL(funnelCalc.cpaMaxProduct)}
          signal="primary"
          tooltip="Valor máximo que pode pagar por venda sem ter prejuízo, considerando apenas o produto principal"
        />
        <MetricCard
          label="CPA Máximo (Funil)"
          value={formatBRL(funnelCalc.cpaMaxFunnel)}
          signal="safe"
          tooltip="CPA máximo considerando receita de todo o funil (bumps + upsells)"
        />
        <MetricCard
          label="Lucro líquido / venda"
          value={formatBRL(productCalc.netValuePerSale)}
          signal={productCalc.netValuePerSale > 0 ? 'safe' : 'danger'}
          tooltip="Valor que sobra por venda após todos os custos"
        />
        <MetricCard
          label="Vendas / dia"
          value={formatNumber(productCalc.salesPerDay, 1)}
          signal="neutral"
          tooltip="Média de vendas necessárias por dia para atingir a meta"
        />
      </motion.div>

      {/* Cost breakdown */}
      <motion.div variants={item} className="glass-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Composição de Custos (por venda)</h3>
        <div className="space-y-2">
          <CostBar label="Impostos" value={productCalc.taxPerSale} total={state.product.price} color="bg-amber" />
          <CostBar label="Plataforma" value={productCalc.platformFeePerSale} total={state.product.price} color="bg-electric" />
          <CostBar label="Comissão" value={productCalc.commissionPerSale} total={state.product.price} color="bg-rose" />
          <CostBar label="Líquido" value={productCalc.netValuePerSale} total={state.product.price} color="bg-emerald" />
        </div>
      </motion.div>

      {/* Totals */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard label="Faturamento Bruto" value={formatBRL(productCalc.grossRevenue)} />
        <MetricCard label="Faturamento Líquido" value={formatBRL(productCalc.netRevenue)} signal="safe" />
        <MetricCard
          label="Custos Totais"
          value={formatBRL(productCalc.totalCostsTotal)}
          subtitle={formatPercent((productCalc.totalCostsTotal / productCalc.grossRevenue) * 100) + ' do faturamento'}
        />
      </motion.div>
    </motion.div>
  );
}

function CostBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
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
