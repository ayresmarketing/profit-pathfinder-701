import { useState } from 'react';
import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatNumber, calcScenario1, calcScenario2 } from '@/lib/calculations';
import { motion } from 'framer-motion';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function ScenarioSimulator() {
  const { funnelCalc, productCalc } = useOperation();

  const [targetProfitPerSale, setTargetProfitPerSale] = useState(50);
  const [monthlyTarget1, setMonthlyTarget1] = useState(5000);
  const [assumedCpa, setAssumedCpa] = useState(25);
  const [monthlyTarget2, setMonthlyTarget2] = useState(20000);

  const scenario1 = calcScenario1(targetProfitPerSale, funnelCalc.cpaMaxFunnel, productCalc.netValuePerSale, monthlyTarget1);
  const scenario2 = calcScenario2(assumedCpa, productCalc.netValuePerSale, monthlyTarget2);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h2 className="text-base font-bold tracking-tight text-foreground">Cenários</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Simule situações reais. Preencha apenas os campos em <span className="tag-user mx-1">✏️ amarelo</span>.
        </p>
      </motion.div>

      {/* Cenário 1 */}
      <motion.div variants={item} className="section-card space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full bg-primary" />
          <h3 className="section-title">📌 Situação 01 — Meta de Lucro por Venda</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground leading-relaxed">
          <span>Se eu quiser ter um lucro de</span>
          <InlineInput value={targetProfitPerSale} onChange={setTargetProfitPerSale} prefix="R$" />
          <span>por venda, preciso ter um CPA de:</span>
          <CalcDisplay value={formatBRL(scenario1.requiredCPA)} signal={scenario1.requiredCPA > 0} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground leading-relaxed">
          <span>Para lucrar</span>
          <InlineInput value={monthlyTarget1} onChange={setMonthlyTarget1} prefix="R$" />
          <span>por mês, preciso de</span>
          <CalcDisplay value={formatNumber(scenario1.requiredSales, 0)} signal={true} />
          <span>vendas do produto principal.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground leading-relaxed">
          <span>Para isso, preciso investir:</span>
          <CalcDisplay value={formatBRL(scenario1.requiredInvestment)} signal={scenario1.requiredInvestment > 0} />
          <span>em tráfego.</span>
        </div>

        <div className="bg-muted rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground">
            💡 <strong className="text-foreground">Resumo:</strong> Para lucrar {formatBRL(targetProfitPerSale)} por venda, 
            seu CPA precisa ser no máximo {formatBRL(scenario1.requiredCPA)}. 
            Para {formatBRL(monthlyTarget1)}/mês = {formatNumber(scenario1.requiredSales, 0)} vendas, 
            investindo {formatBRL(scenario1.requiredInvestment)} em anúncios.
          </p>
        </div>
      </motion.div>

      {/* Cenário 2 */}
      <motion.div variants={item} className="section-card space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full bg-emerald" />
          <h3 className="section-title">📌 Situação 02 — CPA Fixo + Meta Mensal</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground leading-relaxed">
          <span>Meu CPA máximo do produto é</span>
          <CalcDisplay value={formatBRL(funnelCalc.cpaMaxProduct)} signal={true} />
          <span>e quero lucrar</span>
          <InlineInput value={monthlyTarget2} onChange={setMonthlyTarget2} prefix="R$" />
          <span>por mês.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground leading-relaxed">
          <span>Considerando um CPA de</span>
          <InlineInput value={assumedCpa} onChange={setAssumedCpa} prefix="R$" />
          <span>preciso de</span>
          <CalcDisplay value={formatNumber(scenario2.requiredSales, 0)} signal={true} />
          <span>vendas.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground leading-relaxed">
          <span>Investimento necessário:</span>
          <CalcDisplay value={formatBRL(scenario2.requiredInvestment)} signal={scenario2.requiredInvestment > 0 && isFinite(scenario2.requiredInvestment)} />
          <span>por mês.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground leading-relaxed">
          <span>Lucro por venda neste cenário:</span>
          <CalcDisplay value={formatBRL(scenario2.profitPerSale)} signal={scenario2.profitPerSale > 0} danger={scenario2.profitPerSale <= 0} />
        </div>

        {assumedCpa > funnelCalc.cpaMaxProduct && (
          <div className="bg-signal-danger rounded-xl p-4 border border-rose/20">
            <p className="text-xs text-rose font-medium">
              ⚠️ CPA de {formatBRL(assumedCpa)} está ACIMA do máximo de {formatBRL(funnelCalc.cpaMaxProduct)}. 
              Prejuízo de {formatBRL(Math.abs(scenario2.profitPerSale))} por venda.
            </p>
          </div>
        )}

        <div className="bg-muted rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground">
            💡 <strong className="text-foreground">Resumo:</strong> Com CPA de {formatBRL(assumedCpa)}, 
            lucro de {formatBRL(scenario2.profitPerSale)}/venda. Para {formatBRL(monthlyTarget2)}/mês = {formatNumber(scenario2.requiredSales, 0)} vendas, 
            investindo {formatBRL(scenario2.requiredInvestment)}.
          </p>
        </div>
      </motion.div>

      {/* ROI Table */}
      <motion.div variants={item} className="section-card space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full bg-amber" />
          <h3 className="section-title">📈 Projeção de ROI do Funil Completo</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Qual CPA você precisa para cada nível de retorno. Quanto menor o CPA, maior o ROI.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ROI</th>
                <th className="text-left py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Significado</th>
                <th className="text-right py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPA Necessário</th>
                <th className="text-right py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Investimento</th>
              </tr>
            </thead>
            <tbody>
              {funnelCalc.roiProjections.map((row) => (
                <tr key={row.roi} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3">
                    <span className={`font-mono font-bold ${
                      row.roi === 0 ? 'text-amber' : row.roi <= 2 ? 'text-foreground' : 'text-emerald'
                    }`}>
                      {row.roi === 0 ? 'Break-even' : `${row.roi}x`}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {row.roi === 0 && 'Não ganha nem perde'}
                    {row.roi === 1 && 'Lucra o dobro do investido'}
                    {row.roi === 2 && 'Lucra o triplo do investido'}
                    {row.roi === 3 && 'Lucra 4x o investido'}
                    {row.roi === 5 && 'Lucra 6x o investido'}
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-foreground">{formatBRL(row.cpaNeeded)}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-foreground">{formatBRL(row.investmentNeeded)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InlineInput({ value, onChange, prefix }: { value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="inline-flex items-center gap-1 relative">
      {prefix && <span className="text-xs font-mono text-amber font-semibold">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        className="user-input w-28 text-center text-sm font-mono font-bold text-foreground py-1.5"
      />
    </div>
  );
}

function CalcDisplay({ value, signal, danger }: { value: string; signal: boolean; danger?: boolean }) {
  return (
    <span className={`calc-value inline-block text-sm font-bold ${
      danger ? '!bg-rose/10 !border-rose/20 !text-rose' : 
      signal ? '' : '!bg-muted !border-border !text-muted-foreground'
    }`}>
      {value}
    </span>
  );
}