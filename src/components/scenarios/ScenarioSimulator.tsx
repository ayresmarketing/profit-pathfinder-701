import { useState } from 'react';
import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatNumber, calcScenario2 } from '@/lib/calculations';
import { motion } from 'framer-motion';
import { FlaskConical, Lightbulb, AlertTriangle } from 'lucide-react';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0, 0, 1] } },
};

export default function ScenarioSimulator() {
  const { funnelCalc, productCalc, state } = useOperation();
  const mainProduct = state.product;

  const [targetProfitPerSale, setTargetProfitPerSale] = useState(50);
  const [assumedCpa, setAssumedCpa] = useState(25);
  const [monthlyTarget2, setMonthlyTarget2] = useState(20000);

  // Cenário 1
  const requiredCPA = productCalc.netValuePerSale - targetProfitPerSale;
  const monthlyProfit = targetProfitPerSale * mainProduct.salesGoal;
  const requiredInvestment = requiredCPA * mainProduct.salesGoal;

  const scenario2 = calcScenario2(assumedCpa, productCalc.netValuePerSale, monthlyTarget2);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground tracking-tight">Cenários de Simulação</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Simule situações reais. Preencha apenas os campos <span className="tag-user mx-1 text-[9px]">✏️ editáveis</span>, o resto é calculado automaticamente.
        </p>
      </motion.div>

      {/* ===== Cenário 1 ===== */}
      <motion.div variants={item} className="premium-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <span className="text-white font-bold text-xs">01</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Meta de Lucro por Venda</h3>
            <p className="text-[11px] text-muted-foreground">Defina quanto quer lucrar por venda e veja o que precisa.</p>
          </div>
        </div>

        <div className="space-y-4">
          <SentenceRow>
            <span>Se eu quiser ter um lucro de</span>
            <InlineInput value={targetProfitPerSale} onChange={setTargetProfitPerSale} prefix="R$" />
            <span>por venda, preciso ter um CPA de:</span>
            <CalcDisplay value={formatBRL(requiredCPA)} positive={requiredCPA > 0} />
          </SentenceRow>

          <SentenceRow>
            <span>Com minha meta de</span>
            <CalcDisplay value={`${mainProduct.salesGoal}`} positive />
            <span>vendas/mês, meu lucro mensal será:</span>
            <CalcDisplay value={formatBRL(monthlyProfit)} positive={monthlyProfit > 0} />
          </SentenceRow>

          <SentenceRow>
            <span>Para isso, preciso investir:</span>
            <CalcDisplay value={formatBRL(requiredInvestment)} positive={requiredInvestment > 0} />
            <span>em tráfego.</span>
          </SentenceRow>
        </div>

        {requiredCPA <= 0 && (
          <div className="flex items-start gap-3 bg-signal-danger rounded-xl p-4 border border-rose/20">
            <AlertTriangle className="h-4 w-4 text-rose shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Lucro desejado de {formatBRL(targetProfitPerSale)} é maior que o líquido por venda ({formatBRL(productCalc.netValuePerSale)}). Reduza o valor.
            </p>
          </div>
        )}

        <div className="flex items-start gap-3 bg-secondary rounded-xl p-4 border border-border">
          <Lightbulb className="h-4 w-4 text-amber shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Resumo:</strong> CPA máximo de {formatBRL(requiredCPA)}, 
            {mainProduct.salesGoal} vendas/mês = {formatBRL(monthlyProfit)} de lucro, 
            investindo {formatBRL(requiredInvestment)}.
          </p>
        </div>
      </motion.div>

      {/* ===== Cenário 2 ===== */}
      <motion.div variants={item} className="premium-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald/10 flex items-center justify-center">
            <span className="text-emerald font-bold text-xs">02</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">CPA Fixo + Meta Mensal</h3>
            <p className="text-[11px] text-muted-foreground">Defina o CPA e a meta mensal para ver quantas vendas precisa.</p>
          </div>
        </div>

        <div className="space-y-4">
          <SentenceRow>
            <span>Meu CPA máximo do produto é</span>
            <CalcDisplay value={formatBRL(funnelCalc.cpaMaxProduct)} positive />
            <span>e quero lucrar</span>
            <InlineInput value={monthlyTarget2} onChange={setMonthlyTarget2} prefix="R$" />
            <span>por mês.</span>
          </SentenceRow>

          <SentenceRow>
            <span>Considerando um CPA de</span>
            <InlineInput value={assumedCpa} onChange={setAssumedCpa} prefix="R$" />
            <span>preciso de</span>
            <CalcDisplay value={formatNumber(scenario2.requiredSales, 0)} positive />
            <span>vendas.</span>
          </SentenceRow>

          <SentenceRow>
            <span>Investimento necessário:</span>
            <CalcDisplay value={formatBRL(scenario2.requiredInvestment)} positive={scenario2.requiredInvestment > 0 && isFinite(scenario2.requiredInvestment)} />
            <span>por mês.</span>
          </SentenceRow>

          <SentenceRow>
            <span>Lucro por venda neste cenário:</span>
            <CalcDisplay value={formatBRL(scenario2.profitPerSale)} positive={scenario2.profitPerSale > 0} />
          </SentenceRow>
        </div>

        {assumedCpa > funnelCalc.cpaMaxProduct && (
          <div className="flex items-start gap-3 bg-signal-danger rounded-xl p-4 border border-rose/20">
            <AlertTriangle className="h-4 w-4 text-rose shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              CPA de {formatBRL(assumedCpa)} está ACIMA do máximo de {formatBRL(funnelCalc.cpaMaxProduct)}. 
              Prejuízo de {formatBRL(Math.abs(scenario2.profitPerSale))} por venda.
            </p>
          </div>
        )}

        <div className="flex items-start gap-3 bg-secondary rounded-xl p-4 border border-border">
          <Lightbulb className="h-4 w-4 text-amber shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Resumo:</strong> CPA de {formatBRL(assumedCpa)}, 
            lucro de {formatBRL(scenario2.profitPerSale)}/venda. {formatNumber(scenario2.requiredSales, 0)} vendas, 
            investindo {formatBRL(scenario2.requiredInvestment)}.
          </p>
        </div>
      </motion.div>

      {/* ===== ROI Table ===== */}
      <motion.div variants={item} className="premium-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
            <span className="text-amber font-bold text-xs">📈</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Projeção de ROI do Funil</h3>
            <p className="text-[11px] text-muted-foreground">Qual CPA para cada nível de retorno.</p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ROI</th>
                <th className="text-left py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Significado</th>
                <th className="text-right py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">CPA Necessário</th>
                <th className="text-right py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Investimento</th>
              </tr>
            </thead>
            <tbody>
              {funnelCalc.roiProjections.map((row) => (
                <tr key={row.roi} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="py-3 px-3">
                    <span className={`font-mono font-bold text-sm ${
                      row.roi === 0 ? 'signal-warning' : row.roi <= 2 ? 'text-foreground' : 'signal-safe'
                    }`}>
                      {row.roi === 0 ? 'Break-even' : `${row.roi}x`}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">
                    {row.roi === 0 && 'Não ganha nem perde'}
                    {row.roi === 1 && 'Lucra o dobro do investido'}
                    {row.roi === 2 && 'Lucra o triplo do investido'}
                    {row.roi === 3 && 'Lucra 4x o investido'}
                    {row.roi === 5 && 'Lucra 6x o investido'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-mono text-sm font-semibold text-foreground">{formatBRL(row.cpaNeeded)}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-mono text-sm font-semibold text-foreground">{formatBRL(row.investmentNeeded)}</span>
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
      {prefix && <span className="text-xs font-mono font-semibold text-primary">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        className="user-input w-28 text-center text-sm font-mono font-bold py-1.5"
      />
    </div>
  );
}

function CalcDisplay({ value, positive }: { value: string; positive: boolean }) {
  return (
    <span className={`inline-block rounded-lg px-3 py-1.5 text-sm font-mono font-bold border ${
      positive
        ? 'bg-emerald/10 border-emerald/20 text-emerald'
        : 'bg-rose/10 border-rose/20 text-rose'
    }`}>
      {value}
    </span>
  );
}
