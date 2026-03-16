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
  const { funnelCalc, productCalc, mainProduct } = useOperation();

  const [targetProfitPerSale, setTargetProfitPerSale] = useState(50);
  const [assumedCpa, setAssumedCpa] = useState(25);
  const [monthlyTarget2, setMonthlyTarget2] = useState(20000);

  // Cenário 1: tudo calculado automaticamente a partir do lucro desejado por venda
  const requiredCPA = productCalc.netValuePerSale - targetProfitPerSale;
  const monthlyProfit = targetProfitPerSale * mainProduct.salesGoal;
  const requiredInvestment = requiredCPA * mainProduct.salesGoal;

  const scenario2 = calcScenario2(assumedCpa, productCalc.netValuePerSale, monthlyTarget2);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Cenários</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Simule situações reais. Preencha apenas os campos em <span className="tag-user mx-1">✏️ amarelo</span>.
        </p>
      </motion.div>

      {/* Cenário 1 */}
      <motion.div variants={item} className="section-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-primary" />
          <h3 className="text-base font-bold text-foreground">📌 Situação 01 — Meta de Lucro por Venda</h3>
        </div>

        <SentenceRow>
          <span>Se eu quiser ter um lucro de</span>
          <InlineInput value={targetProfitPerSale} onChange={setTargetProfitPerSale} prefix="R$" />
          <span>por venda, preciso ter um CPA de:</span>
          <CalcDisplay value={formatBRL(requiredCPA)} signal={requiredCPA > 0} danger={requiredCPA <= 0} />
        </SentenceRow>

        <SentenceRow>
          <span>Com minha meta de</span>
          <CalcDisplay value={`${mainProduct.salesGoal}`} signal={true} />
          <span>vendas/mês, meu lucro mensal será:</span>
          <CalcDisplay value={formatBRL(monthlyProfit)} signal={monthlyProfit > 0} danger={monthlyProfit <= 0} />
        </SentenceRow>

        <SentenceRow>
          <span>Para isso, preciso investir:</span>
          <CalcDisplay value={formatBRL(requiredInvestment)} signal={requiredInvestment > 0} danger={requiredInvestment <= 0} />
          <span>em tráfego.</span>
        </SentenceRow>

        {requiredCPA <= 0 && (
          <div className="bg-signal-danger rounded-xl p-4 border" style={{ borderColor: 'hsl(var(--rose) / 0.2)' }}>
            <p className="text-sm text-foreground font-medium">
              ⚠️ Lucro desejado de {formatBRL(targetProfitPerSale)} é maior que o valor líquido por venda ({formatBRL(productCalc.netValuePerSale)}). Reduza o lucro desejado.
            </p>
          </div>
        )}

        <div className="bg-muted rounded-xl p-4 border border-border">
          <p className="text-sm text-foreground/80">
            💡 <strong className="text-foreground">Resumo:</strong> Para lucrar {formatBRL(targetProfitPerSale)} por venda, 
            seu CPA precisa ser no máximo {formatBRL(requiredCPA)}. 
            Com {mainProduct.salesGoal} vendas/mês = {formatBRL(monthlyProfit)} de lucro, 
            investindo {formatBRL(requiredInvestment)} em anúncios.
          </p>
        </div>
      </motion.div>

      {/* Cenário 2 */}
      <motion.div variants={item} className="section-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full" style={{ background: 'hsl(var(--emerald))' }} />
          <h3 className="text-base font-bold text-foreground">📌 Situação 02 — CPA Fixo + Meta Mensal</h3>
        </div>

        <SentenceRow>
          <span>Meu CPA máximo do produto é</span>
          <CalcDisplay value={formatBRL(funnelCalc.cpaMaxProduct)} signal={true} />
          <span>e quero lucrar</span>
          <InlineInput value={monthlyTarget2} onChange={setMonthlyTarget2} prefix="R$" />
          <span>por mês.</span>
        </SentenceRow>

        <SentenceRow>
          <span>Considerando um CPA de</span>
          <InlineInput value={assumedCpa} onChange={setAssumedCpa} prefix="R$" />
          <span>preciso de</span>
          <CalcDisplay value={formatNumber(scenario2.requiredSales, 0)} signal={true} />
          <span>vendas.</span>
        </SentenceRow>

        <SentenceRow>
          <span>Investimento necessário:</span>
          <CalcDisplay value={formatBRL(scenario2.requiredInvestment)} signal={scenario2.requiredInvestment > 0 && isFinite(scenario2.requiredInvestment)} />
          <span>por mês.</span>
        </SentenceRow>

        <SentenceRow>
          <span>Lucro por venda neste cenário:</span>
          <CalcDisplay value={formatBRL(scenario2.profitPerSale)} signal={scenario2.profitPerSale > 0} danger={scenario2.profitPerSale <= 0} />
        </SentenceRow>

        {assumedCpa > funnelCalc.cpaMaxProduct && (
          <div className="bg-signal-danger rounded-xl p-4 border" style={{ borderColor: 'hsl(var(--rose) / 0.2)' }}>
            <p className="text-sm text-foreground font-medium">
              ⚠️ CPA de {formatBRL(assumedCpa)} está ACIMA do máximo de {formatBRL(funnelCalc.cpaMaxProduct)}. 
              Prejuízo de {formatBRL(Math.abs(scenario2.profitPerSale))} por venda.
            </p>
          </div>
        )}

        <div className="bg-muted rounded-xl p-4 border border-border">
          <p className="text-sm text-foreground/80">
            💡 <strong className="text-foreground">Resumo:</strong> Com CPA de {formatBRL(assumedCpa)}, 
            lucro de {formatBRL(scenario2.profitPerSale)}/venda. Para {formatBRL(monthlyTarget2)}/mês = {formatNumber(scenario2.requiredSales, 0)} vendas, 
            investindo {formatBRL(scenario2.requiredInvestment)}.
          </p>
        </div>
      </motion.div>

      {/* ROI Table */}
      <motion.div variants={item} className="section-card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full" style={{ background: 'hsl(var(--amber))' }} />
          <h3 className="text-base font-bold text-foreground">📈 Projeção de ROI do Funil Completo</h3>
        </div>
        <p className="text-sm text-foreground/70">
          Qual CPA você precisa para cada nível de retorno. Quanto menor o CPA, maior o ROI.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">ROI</th>
                <th className="text-left py-3 px-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">Significado</th>
                <th className="text-right py-3 px-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">CPA Necessário</th>
                <th className="text-right py-3 px-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">Investimento</th>
              </tr>
            </thead>
            <tbody>
              {funnelCalc.roiProjections.map((row) => (
                <tr key={row.roi} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-2">
                    <span className={`font-mono font-bold text-sm ${
                      row.roi === 0 ? 'signal-warning' : row.roi <= 2 ? 'text-foreground' : 'signal-safe'
                    }`}>
                      {row.roi === 0 ? 'Break-even' : `${row.roi}x`}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm text-foreground/70">
                    {row.roi === 0 && 'Não ganha nem perde'}
                    {row.roi === 1 && 'Lucra o dobro do investido'}
                    {row.roi === 2 && 'Lucra o triplo do investido'}
                    {row.roi === 3 && 'Lucra 4x o investido'}
                    {row.roi === 5 && 'Lucra 6x o investido'}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="font-mono text-sm font-medium text-foreground">{formatBRL(row.cpaNeeded)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="font-mono text-sm font-medium text-foreground">{formatBRL(row.investmentNeeded)}</span>
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

/* Wrapper to align sentence elements on baseline */
function SentenceRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground leading-relaxed">
      {children}
    </div>
  );
}

function InlineInput({ value, onChange, prefix }: { value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="inline-flex items-center gap-1 relative">
      {prefix && <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--amber))' }}>{prefix}</span>}
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
      danger ? '!bg-signal-danger !text-foreground' : 
      signal ? '' : '!bg-muted !border-border !text-foreground/60'
    }`} style={danger ? { borderColor: 'hsl(var(--rose) / 0.3)', color: 'hsl(var(--rose))' } : undefined}>
      {value}
    </span>
  );
}
