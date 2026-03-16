import { useState } from 'react';
import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatNumber, calcScenario1, calcScenario2 } from '@/lib/calculations';
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

export default function ScenarioSimulator() {
  const { funnelCalc, productCalc } = useOperation();

  // Cenário 1
  const [targetProfitPerSale, setTargetProfitPerSale] = useState(50);
  const [monthlyTarget1, setMonthlyTarget1] = useState(5000);

  // Cenário 2
  const [assumedCpa, setAssumedCpa] = useState(25);
  const [monthlyTarget2, setMonthlyTarget2] = useState(20000);

  const scenario1 = calcScenario1(targetProfitPerSale, funnelCalc.cpaMaxFunnel, productCalc.netValuePerSale, monthlyTarget1);
  const scenario2 = calcScenario2(assumedCpa, productCalc.netValuePerSale, monthlyTarget2);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Simulador de Cenários</h2>
        <p className="text-sm text-muted-foreground">Teste diferentes cenários e descubra o que precisa fazer para atingir suas metas.</p>
      </motion.div>

      {/* Cenário 1 */}
      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-electric">Cenário 1 — Meta de Lucro por Venda</h3>
        <p className="text-sm text-muted-foreground">
          "Se eu quiser lucrar <strong className="text-foreground">{formatBRL(targetProfitPerSale)}</strong> por venda, 
          qual CPA preciso atingir e quanto preciso investir?"
        </p>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Lucro desejado / venda" value={targetProfitPerSale} prefix="R$" step={5}
            onChange={setTargetProfitPerSale}
            tooltip="Quanto quer lucrar por cada venda realizada" />
          <InputField label="Lucro mensal desejado" value={monthlyTarget1} prefix="R$" step={500}
            onChange={setMonthlyTarget1}
            tooltip="Meta de lucro total em 30 dias" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="CPA necessário" value={formatBRL(scenario1.requiredCPA)}
            signal={scenario1.requiredCPA > 0 ? 'primary' : 'danger'}
            tooltip="CPA que precisa atingir para ter o lucro desejado por venda" />
          <MetricCard label="Vendas necessárias" value={formatNumber(scenario1.requiredSales, 0)}
            subtitle="por mês"
            tooltip="Quantidade de vendas para atingir a meta de lucro mensal" />
          <MetricCard label="Investimento" value={formatBRL(scenario1.requiredInvestment)}
            signal={scenario1.requiredInvestment > 0 ? 'neutral' : 'danger'}
            tooltip="Investimento em tráfego necessário para atingir a meta" />
        </div>
      </motion.div>

      {/* Cenário 2 */}
      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-electric">Cenário 2 — CPA Fixo + Meta Mensal</h3>
        <p className="text-sm text-muted-foreground">
          "Meu CPA máximo é <strong className="text-foreground">{formatBRL(funnelCalc.cpaMaxProduct)}</strong>. 
          Considerando um CPA de <strong className="text-foreground">{formatBRL(assumedCpa)}</strong>, 
          quanto preciso vender para lucrar <strong className="text-foreground">{formatBRL(monthlyTarget2)}</strong>/mês?"
        </p>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="CPA assumido" value={assumedCpa} prefix="R$" step={1}
            onChange={setAssumedCpa}
            tooltip="CPA que você acredita conseguir atingir com suas campanhas" />
          <InputField label="Lucro mensal desejado" value={monthlyTarget2} prefix="R$" step={1000}
            onChange={setMonthlyTarget2} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Lucro / venda" value={formatBRL(scenario2.profitPerSale)}
            signal={scenario2.profitPerSale > 0 ? 'safe' : 'danger'} />
          <MetricCard label="Vendas necessárias" value={formatNumber(scenario2.requiredSales, 0)}
            subtitle="por mês" />
          <MetricCard label="Investimento" value={formatBRL(scenario2.requiredInvestment)} />
        </div>
      </motion.div>

      {/* ROI Projections */}
      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-electric">Projeção de ROI do Funil Completo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground">ROI</th>
                <th className="text-right py-2 text-xs uppercase tracking-wider text-muted-foreground">CPA Necessário</th>
                <th className="text-right py-2 text-xs uppercase tracking-wider text-muted-foreground">Investimento</th>
              </tr>
            </thead>
            <tbody>
              {funnelCalc.roiProjections.map((row) => (
                <tr key={row.roi} className="border-b border-border/50">
                  <td className="py-2 font-mono text-foreground">{row.roi === 0 ? 'Break-even' : `${row.roi}x`}</td>
                  <td className="py-2 text-right font-mono text-foreground">{formatBRL(row.cpaNeeded)}</td>
                  <td className="py-2 text-right font-mono text-foreground">{formatBRL(row.investmentNeeded)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
