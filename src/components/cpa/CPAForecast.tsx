import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatNumber, getHealthStatus } from '@/lib/calculations';
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

export default function CPAForecast() {
  const { state, updateTraffic, cpaProjection, funnelCalc, productCalc } = useOperation();
  const t = state.traffic;

  const healthProduct = getHealthStatus(cpaProjection.projectedCPA, funnelCalc.healthZonesProduct);
  const signalMap = { healthy: 'safe' as const, moderate: 'warning' as const, aggressive: 'warning' as const, danger: 'danger' as const };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Previsão de CPA</h2>
        <p className="text-sm text-muted-foreground">Projete seu custo por compra baseado nas métricas de tráfego.</p>
      </motion.div>

      {/* Traffic inputs */}
      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-electric">Métricas de Tráfego</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Investimento" value={t.investment} prefix="R$" step={100}
            onChange={(v) => updateTraffic({ investment: v })}
            tooltip="Valor total que será investido em anúncios" />
          <InputField label="CPM" value={t.cpm} prefix="R$" step={0.5}
            onChange={(v) => updateTraffic({ cpm: v })}
            tooltip="Custo por mil impressões" />
          <InputField label="CTR (link)" value={t.ctr} suffix="%" step={0.1}
            onChange={(v) => updateTraffic({ ctr: v })}
            tooltip="Taxa de cliques no link do anúncio" />
        </div>
      </motion.div>

      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-electric">Funil de Conversão</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Connect Rate" value={t.connectRate} suffix="%" step={1}
            onChange={(v) => updateTraffic({ connectRate: v })}
            tooltip="% de pessoas que clicam e realmente chegam na página" />
          <InputField label="Página → Checkout" value={t.pageToCheckout} suffix="%" step={0.5}
            onChange={(v) => updateTraffic({ pageToCheckout: v })}
            tooltip="% de visitantes que iniciam o checkout" />
          <InputField label="Checkout → Compra" value={t.checkoutToPurchase} suffix="%" step={0.5}
            onChange={(v) => updateTraffic({ checkoutToPurchase: v })}
            tooltip="% de checkouts que se convertem em compra" />
        </div>
      </motion.div>

      {/* Funnel visualization */}
      <motion.div variants={item} className="glass-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Funil Projetado</h3>
        <div className="space-y-2">
          <FunnelStep label="Impressões" value={formatNumber(cpaProjection.impressions, 0)} width={100} />
          <FunnelStep label="Cliques" value={formatNumber(cpaProjection.clicks, 0)} cost={formatBRL(cpaProjection.cpc)} width={(cpaProjection.clicks / cpaProjection.impressions) * 100} />
          <FunnelStep label="Visualizações" value={formatNumber(cpaProjection.pageViews, 0)} cost={formatBRL(cpaProjection.costPerPageView)} width={(cpaProjection.pageViews / cpaProjection.impressions) * 100} />
          <FunnelStep label="Checkouts" value={formatNumber(cpaProjection.checkouts, 0)} cost={formatBRL(cpaProjection.costPerCheckout)} width={(cpaProjection.checkouts / cpaProjection.impressions) * 100} />
          <FunnelStep label="Compras" value={formatNumber(cpaProjection.purchases, 0)} cost={formatBRL(cpaProjection.projectedCPA)} width={Math.max((cpaProjection.purchases / cpaProjection.impressions) * 100, 2)} highlight />
        </div>
      </motion.div>

      {/* Results */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="CPA Projetado"
          value={formatBRL(cpaProjection.projectedCPA)}
          signal={signalMap[healthProduct]}
          tooltip="Custo por compra estimado com base nas métricas de tráfego"
        />
        <MetricCard
          label="CPA Máximo"
          value={formatBRL(funnelCalc.cpaMaxProduct)}
          signal="primary"
          tooltip="Valor máximo que pode pagar por compra sem prejuízo"
        />
        <MetricCard
          label="Lucro / venda"
          value={formatBRL(cpaProjection.projectedProfitPerSale)}
          signal={cpaProjection.projectedProfitPerSale > 0 ? 'safe' : 'danger'}
        />
        <MetricCard
          label="Lucro total"
          value={formatBRL(cpaProjection.projectedProfit)}
          signal={cpaProjection.projectedProfit > 0 ? 'safe' : 'danger'}
          subtitle={`${cpaProjection.purchases} vendas projetadas`}
        />
      </motion.div>

      {/* Viability indicator */}
      <motion.div variants={item} className={`glass-card p-5 ${!cpaProjection.isViable ? 'bg-signal-danger' : 'bg-signal-safe'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-semibold ${cpaProjection.isViable ? 'signal-safe' : 'signal-danger'}`}>
              {cpaProjection.isViable ? '✓ Cenário Viável' : '✗ Risco de Prejuízo'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {cpaProjection.isViable
                ? `Seu CPA projetado está ${formatBRL(funnelCalc.cpaMaxProduct - cpaProjection.projectedCPA)} abaixo do máximo.`
                : `Seu CPA projetado excede o máximo em ${formatBRL(cpaProjection.projectedCPA - funnelCalc.cpaMaxProduct)}.`
              }
            </p>
          </div>
          <div className="font-mono text-2xl font-bold">
            <span className={cpaProjection.isViable ? 'number-glow-safe' : 'number-glow-danger'}>
              {formatBRL(cpaProjection.projectedCPA)}
            </span>
            <span className="text-muted-foreground mx-2">/</span>
            <span className="number-glow-primary">{formatBRL(funnelCalc.cpaMaxProduct)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FunnelStep({ label, value, cost, width, highlight }: { label: string; value: string; cost?: string; width: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1">
        <motion.div
          className={`h-6 rounded flex items-center px-2 ${highlight ? 'bg-electric' : 'bg-muted'}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(width, 3)}%` }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        >
          <span className={`text-[10px] font-mono font-semibold ${highlight ? 'text-primary-foreground' : 'text-foreground'}`}>{value}</span>
        </motion.div>
      </div>
      {cost && <span className="text-xs font-mono text-muted-foreground w-20 text-right">{cost}/un</span>}
    </div>
  );
}
