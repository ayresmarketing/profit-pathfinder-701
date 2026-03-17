import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatNumber, getHealthStatus } from '@/lib/calculations';
import InputField from '@/components/shared/InputField';
import MetricCard from '@/components/shared/MetricCard';
import { motion } from 'framer-motion';
import { Megaphone, MousePointerClick } from 'lucide-react';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0, 0, 1] } },
};

export default function CPAForecast() {
  const { state, updateTraffic, cpaProjection, funnelCalc } = useOperation();
  const t = state.traffic;

  const healthProduct = getHealthStatus(cpaProjection.projectedCPA, funnelCalc.healthZonesProduct);
  const signalMap = { healthy: 'safe' as const, moderate: 'warning' as const, aggressive: 'warning' as const, danger: 'danger' as const };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Results on top */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground tracking-tight">Previsão de CPA</h2>
          <span className="tag-auto">⚡ Tempo real</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricCard
            label="CPA Projetado"
            value={formatBRL(cpaProjection.projectedCPA)}
            signal={signalMap[healthProduct]}
            tooltip="Quanto cada venda vai custar com base nas métricas de tráfego"
          />
          <MetricCard
            label="CPA Máximo"
            value={formatBRL(funnelCalc.cpaMaxProduct)}
            signal="primary"
            tooltip="Limite de custo por venda sem prejuízo"
          />
          <MetricCard
            label="Lucro / venda"
            value={formatBRL(cpaProjection.projectedProfitPerSale)}
            signal={cpaProjection.projectedProfitPerSale > 0 ? 'safe' : 'danger'}
            tooltip="Lucro após pagar anúncio e taxas"
          />
          <MetricCard
            label="Lucro total"
            value={formatBRL(cpaProjection.projectedProfit)}
            signal={cpaProjection.projectedProfit > 0 ? 'safe' : 'danger'}
            subtitle={`${cpaProjection.purchases} vendas projetadas`}
            tooltip="Lucro total com todas as vendas"
          />
        </div>
      </motion.div>

      {/* Viability banner */}
      <motion.div variants={item} className={`premium-card ${!cpaProjection.isViable ? 'bg-signal-danger' : 'bg-signal-safe'}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className={`text-base font-bold ${cpaProjection.isViable ? 'signal-safe' : 'signal-danger'}`}>
              {cpaProjection.isViable ? '✅ Cenário Viável — Você pode escalar!' : '🚨 Risco de Prejuízo — Ajuste suas métricas!'}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {cpaProjection.isViable
                ? `CPA projetado está ${formatBRL(funnelCalc.cpaMaxProduct - cpaProjection.projectedCPA)} abaixo do limite.`
                : `CPA projetado excede o máximo em ${formatBRL(cpaProjection.projectedCPA - funnelCalc.cpaMaxProduct)}.`
              }
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-xl font-bold shrink-0">
            <span className={cpaProjection.isViable ? 'number-glow-safe' : 'number-glow-danger'}>
              {formatBRL(cpaProjection.projectedCPA)}
            </span>
            <span className="text-muted-foreground text-sm">vs</span>
            <span className="number-glow-primary">{formatBRL(funnelCalc.cpaMaxProduct)}</span>
          </div>
        </div>
      </motion.div>

      {/* Traffic inputs */}
      <motion.div variants={item} className="premium-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <Megaphone className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Métricas de Tráfego</h3>
            <p className="text-[11px] text-muted-foreground">Dados das suas campanhas de anúncios.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InputField label="Investimento em Ads" value={t.investment} prefix="R$" step={100}
            onChange={(v) => updateTraffic({ investment: v })}
            tooltip="Quanto vai investir em anúncios. Ex: R$ 5.000" highlight />
          <InputField label="CPM (custo por mil)" value={t.cpm} prefix="R$" step={0.5}
            onChange={(v) => updateTraffic({ cpm: v })}
            tooltip="Custo para 1.000 impressões. Ex: R$ 45" highlight />
          <InputField label="CTR (taxa de clique)" value={t.ctr} suffix="%" step={0.1}
            onChange={(v) => updateTraffic({ ctr: v })}
            tooltip="De cada 100 que veem, quantos clicam? Ex: 2,3%" highlight />
        </div>
      </motion.div>

      <motion.div variants={item} className="premium-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald/10 flex items-center justify-center">
            <MousePointerClick className="h-4 w-4 text-emerald" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Funil de Conversão</h3>
            <p className="text-[11px] text-muted-foreground">Taxas de conversão em cada etapa.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InputField label="Connect Rate" value={t.connectRate} suffix="%" step={1}
            onChange={(v) => updateTraffic({ connectRate: v })}
            tooltip="% que chega na página após clicar. Ex: 70%" highlight />
          <InputField label="Página → Checkout" value={t.pageToCheckout} suffix="%" step={0.5}
            onChange={(v) => updateTraffic({ pageToCheckout: v })}
            tooltip="% que inicia checkout. Ex: 25%" highlight />
          <InputField label="Checkout → Compra" value={t.checkoutToPurchase} suffix="%" step={0.5}
            onChange={(v) => updateTraffic({ checkoutToPurchase: v })}
            tooltip="% que finaliza a compra. Ex: 33%" highlight />
        </div>
      </motion.div>

      {/* Funnel visualization */}
      <motion.div variants={item} className="premium-card">
        <div className="flex items-center gap-2 mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funil Projetado</h3>
          <span className="tag-auto">⚡ Automático</span>
        </div>
        <div className="space-y-3">
          <FunnelStep label="Impressões" value={formatNumber(cpaProjection.impressions, 0)} width={100} />
          <FunnelStep label="Cliques" value={formatNumber(cpaProjection.clicks, 0)} cost={formatBRL(cpaProjection.cpc)} width={(cpaProjection.clicks / cpaProjection.impressions) * 100} />
          <FunnelStep label="Visualizações" value={formatNumber(cpaProjection.pageViews, 0)} cost={formatBRL(cpaProjection.costPerPageView)} width={(cpaProjection.pageViews / cpaProjection.impressions) * 100} />
          <FunnelStep label="Checkouts" value={formatNumber(cpaProjection.checkouts, 0)} cost={formatBRL(cpaProjection.costPerCheckout)} width={(cpaProjection.checkouts / cpaProjection.impressions) * 100} />
          <FunnelStep label="Compras" value={formatNumber(cpaProjection.purchases, 0)} cost={formatBRL(cpaProjection.projectedCPA)} width={Math.max((cpaProjection.purchases / cpaProjection.impressions) * 100, 2)} highlight />
        </div>
      </motion.div>
    </motion.div>
  );
}

function FunnelStep({ label, value, cost, width, highlight }: { label: string; value: string; cost?: string; width: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-muted-foreground w-24 shrink-0 font-medium">{label}</span>
      <div className="flex-1">
        <motion.div
          className={`h-9 rounded-lg flex items-center px-3 ${highlight ? '' : 'bg-secondary'}`}
          style={highlight ? { background: 'var(--gradient-primary)' } : undefined}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(width, 3)}%` }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        >
          <span className={`text-[11px] font-mono font-bold ${highlight ? 'text-white' : 'text-foreground'}`}>{value}</span>
        </motion.div>
      </div>
      {cost && <span className="text-[11px] font-mono text-muted-foreground w-24 text-right">{cost}/un</span>}
    </div>
  );
}
