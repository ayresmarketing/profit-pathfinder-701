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
  const { state, updateTraffic, cpaProjection, funnelCalc } = useOperation();
  const t = state.traffic;

  const healthProduct = getHealthStatus(cpaProjection.projectedCPA, funnelCalc.healthZonesProduct);
  const signalMap = { healthy: 'safe' as const, moderate: 'warning' as const, aggressive: 'warning' as const, danger: 'danger' as const };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h2 className="font-display text-base font-bold tracking-wider text-foreground">PREVISÃO DE CPA</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha suas métricas de tráfego para descobrir quanto vai custar cada venda. 
          Os campos com <span className="tag-user mx-1">✏️ borda amarela</span> são os que você preenche.
        </p>
      </motion.div>

      {/* Traffic inputs */}
      <motion.div variants={item} className="neon-card space-y-4">
        <h3 className="section-title">📡 Métricas de Tráfego</h3>
        <p className="text-xs text-muted-foreground">
          Preencha com os dados das suas campanhas. Exemplo: Se você investe R$ 5.000 e o CPM médio é R$ 45, coloque esses valores.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Investimento em Ads" value={t.investment} prefix="R$" step={100}
            onChange={(v) => updateTraffic({ investment: v })}
            tooltip="Quanto você vai investir em anúncios. Exemplo: R$ 5.000" highlight />
          <InputField label="CPM (custo por mil)" value={t.cpm} prefix="R$" step={0.5}
            onChange={(v) => updateTraffic({ cpm: v })}
            tooltip="Custo para exibir seu anúncio 1.000 vezes. Veja no gerenciador de anúncios. Exemplo: R$ 45" highlight />
          <InputField label="CTR (taxa de clique)" value={t.ctr} suffix="%" step={0.1}
            onChange={(v) => updateTraffic({ ctr: v })}
            tooltip="De cada 100 pessoas que veem seu anúncio, quantas clicam? Exemplo: 2,3% significa que 23 de cada 1.000 clicam" highlight />
        </div>
      </motion.div>

      <motion.div variants={item} className="neon-card space-y-4">
        <h3 className="section-title">🔄 Funil de Conversão</h3>
        <p className="text-xs text-muted-foreground">
          Configure as taxas de cada etapa do funil. Exemplo: Se 70% dos cliques chegam na página, coloque 70 no Connect Rate.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Connect Rate" value={t.connectRate} suffix="%" step={1}
            onChange={(v) => updateTraffic({ connectRate: v })}
            tooltip="% de pessoas que clicam no anúncio e realmente chegam na sua página de vendas. Exemplo: 70%" highlight />
          <InputField label="Página → Checkout" value={t.pageToCheckout} suffix="%" step={0.5}
            onChange={(v) => updateTraffic({ pageToCheckout: v })}
            tooltip="De cada 100 visitantes na página, quantos iniciam o checkout? Exemplo: 25% significa 25 de cada 100" highlight />
          <InputField label="Checkout → Compra" value={t.checkoutToPurchase} suffix="%" step={0.5}
            onChange={(v) => updateTraffic({ checkoutToPurchase: v })}
            tooltip="De cada 100 que iniciam checkout, quantos finalizam a compra? Exemplo: 33% significa 33 de cada 100" highlight />
        </div>
      </motion.div>

      {/* Funnel visualization */}
      <motion.div variants={item} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funil Projetado</h3>
          <span className="tag-auto">⚡ Automático</span>
        </div>
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
          tooltip="Quanto cada venda vai custar com base nas suas métricas de tráfego"
        />
        <MetricCard
          label="CPA Máximo"
          value={formatBRL(funnelCalc.cpaMaxProduct)}
          signal="primary"
          tooltip="Limite máximo de custo por venda sem ter prejuízo"
        />
        <MetricCard
          label="Lucro / venda"
          value={formatBRL(cpaProjection.projectedProfitPerSale)}
          signal={cpaProjection.projectedProfitPerSale > 0 ? 'safe' : 'danger'}
          tooltip="Quanto sobra no seu bolso após pagar o anúncio e todas as taxas"
        />
        <MetricCard
          label="Lucro total"
          value={formatBRL(cpaProjection.projectedProfit)}
          signal={cpaProjection.projectedProfit > 0 ? 'safe' : 'danger'}
          subtitle={`${cpaProjection.purchases} vendas projetadas`}
          tooltip="Lucro total considerando todas as vendas projetadas"
        />
      </motion.div>

      {/* Viability indicator */}
      <motion.div variants={item} className={`neon-card ${!cpaProjection.isViable ? 'bg-signal-danger' : 'bg-signal-safe'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className={`text-sm font-bold ${cpaProjection.isViable ? 'signal-safe' : 'signal-danger'}`}>
              {cpaProjection.isViable ? '✅ Cenário Viável — Você pode escalar!' : '🚨 Risco de Prejuízo — Ajuste suas métricas!'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {cpaProjection.isViable
                ? `Seu CPA projetado está ${formatBRL(funnelCalc.cpaMaxProduct - cpaProjection.projectedCPA)} abaixo do limite. Há margem para escalar.`
                : `Seu CPA projetado excede o máximo em ${formatBRL(cpaProjection.projectedCPA - funnelCalc.cpaMaxProduct)}. Melhore conversão, reduza CPM ou aumente o preço.`
              }
            </p>
          </div>
          <div className="font-mono text-xl font-bold flex items-center gap-2">
            <span className={cpaProjection.isViable ? 'number-glow-safe' : 'number-glow-danger'}>
              {formatBRL(cpaProjection.projectedCPA)}
            </span>
            <span className="text-muted-foreground text-sm">vs</span>
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
          className={`h-7 rounded flex items-center px-2 ${highlight ? 'bg-primary' : 'bg-muted'}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(width, 3)}%` }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        >
          <span className={`text-[10px] font-mono font-semibold ${highlight ? 'text-primary-foreground' : 'text-foreground'}`}>{value}</span>
        </motion.div>
      </div>
      {cost && <span className="text-xs font-mono text-muted-foreground w-24 text-right">{cost}/un</span>}
    </div>
  );
}
