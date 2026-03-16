import { useState } from 'react';
import { useOperation } from '@/contexts/OperationContext';
import { formatBRL, formatNumber, calcScenario1, calcScenario2 } from '@/lib/calculations';
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
        <h2 className="font-display text-base font-bold tracking-wider text-foreground">CENÁRIOS</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Simule situações reais para planejar sua operação. Preencha apenas os campos em 
          <span className="tag-user mx-1">✏️ amarelo</span> — o resto é calculado automaticamente.
        </p>
      </motion.div>

      {/* ===================== CENÁRIO 1 ===================== */}
      <motion.div variants={item} className="neon-card space-y-5">
        <h3 className="section-title">📌 Situação 01 — Meta de Lucro por Venda</h3>

        {/* Linha 1 */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Se eu quiser ter um lucro de</span>
          <InlineInput value={targetProfitPerSale} onChange={setTargetProfitPerSale} prefix="R$" />
          <span>por venda, preciso ter um CPA de:</span>
          <CalcDisplay value={formatBRL(scenario1.requiredCPA)} signal={scenario1.requiredCPA > 0} />
        </div>

        {/* Linha 2 */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Que me faria lucrar</span>
          <InlineInput value={monthlyTarget1} onChange={setMonthlyTarget1} prefix="R$" />
          <span>por mês (30 dias), fazendo:</span>
          <CalcDisplay value={formatNumber(scenario1.requiredSales, 0)} signal={true} />
          <span>vendas do produto principal.</span>
        </div>

        {/* Linha 3 */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Para isso, preciso investir:</span>
          <CalcDisplay value={formatBRL(scenario1.requiredInvestment)} signal={scenario1.requiredInvestment > 0} />
          <span>em tráfego.</span>
        </div>

        {/* Explicação */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground">
            💡 <strong className="text-foreground">Como interpretar:</strong> Para lucrar {formatBRL(targetProfitPerSale)} por venda, 
            seu custo de aquisição por cliente (CPA) precisa ser no máximo {formatBRL(scenario1.requiredCPA)}. 
            Para bater {formatBRL(monthlyTarget1)}/mês, você precisaria de {formatNumber(scenario1.requiredSales, 0)} vendas, 
            investindo {formatBRL(scenario1.requiredInvestment)} em anúncios.
          </p>
        </div>
      </motion.div>

      {/* ===================== CENÁRIO 2 ===================== */}
      <motion.div variants={item} className="neon-card space-y-5">
        <h3 className="section-title">📌 Situação 02 — CPA Fixo + Meta Mensal</h3>

        {/* Linha 1 */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Meu CPA máximo do produto principal é de</span>
          <CalcDisplay value={formatBRL(funnelCalc.cpaMaxProduct)} signal={true} />
          <span>, quero lucrar por mês:</span>
          <InlineInput value={monthlyTarget2} onChange={setMonthlyTarget2} prefix="R$" />
        </div>

        {/* Linha 2 */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Considerando um CPA de</span>
          <InlineInput value={assumedCpa} onChange={setAssumedCpa} prefix="R$" />
          <span>Vou precisar fazer</span>
          <CalcDisplay value={formatNumber(scenario2.requiredSales, 0)} signal={true} />
          <span>vendas do produto principal.</span>
        </div>

        {/* Linha 3 */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Para isso, preciso investir:</span>
          <CalcDisplay value={formatBRL(scenario2.requiredInvestment)} signal={scenario2.requiredInvestment > 0 && isFinite(scenario2.requiredInvestment)} />
          <span>por mês em tráfego.</span>
        </div>

        {/* Indicador de lucro por venda */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Neste cenário, meu lucro por venda seria de:</span>
          <CalcDisplay value={formatBRL(scenario2.profitPerSale)} signal={scenario2.profitPerSale > 0} danger={scenario2.profitPerSale <= 0} />
        </div>

        {/* Alerta se CPA > CPA máximo */}
        {assumedCpa > funnelCalc.cpaMaxProduct && (
          <div className="bg-signal-danger rounded-lg p-3 border border-rose/30">
            <p className="text-xs text-rose font-medium">
              ⚠️ ATENÇÃO: O CPA de {formatBRL(assumedCpa)} está ACIMA do seu CPA máximo de {formatBRL(funnelCalc.cpaMaxProduct)}. 
              Neste cenário, você teria <strong>prejuízo</strong> de {formatBRL(Math.abs(scenario2.profitPerSale))} por venda.
            </p>
          </div>
        )}

        {/* Explicação */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground">
            💡 <strong className="text-foreground">Como interpretar:</strong> Se você conseguir manter seu CPA em {formatBRL(assumedCpa)}, 
            vai lucrar {formatBRL(scenario2.profitPerSale)} por venda. Para chegar em {formatBRL(monthlyTarget2)}/mês, 
            precisaria de {formatNumber(scenario2.requiredSales, 0)} vendas, investindo {formatBRL(scenario2.requiredInvestment)}.
          </p>
        </div>
      </motion.div>

      {/* ===================== TABELA DE ROI ===================== */}
      <motion.div variants={item} className="neon-card space-y-4">
        <h3 className="section-title">📈 Projeção de ROI do Funil Completo</h3>
        <p className="text-xs text-muted-foreground">
          Esta tabela mostra qual CPA você precisa atingir para cada nível de retorno. Quanto menor o CPA, maior o ROI.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 text-xs font-display uppercase tracking-wider text-muted-foreground">ROI</th>
                <th className="text-left py-3 text-xs uppercase tracking-wider text-muted-foreground">O que significa</th>
                <th className="text-right py-3 text-xs uppercase tracking-wider text-muted-foreground">CPA Necessário</th>
                <th className="text-right py-3 text-xs uppercase tracking-wider text-muted-foreground">Investimento</th>
              </tr>
            </thead>
            <tbody>
              {funnelCalc.roiProjections.map((row) => (
                <tr key={row.roi} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
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

/* ===================== COMPONENTES INLINE ===================== */

function InlineInput({ value, onChange, prefix }: { value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="inline-flex items-center gap-1 relative">
      {prefix && <span className="text-xs font-mono text-neon-yellow">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        className="user-input w-28 text-center text-sm font-mono font-bold text-neon-yellow py-1.5"
      />
    </div>
  );
}

function CalcDisplay({ value, signal, danger }: { value: string; signal: boolean; danger?: boolean }) {
  return (
    <span className={`calc-value inline-block text-sm font-bold ${
      danger ? '!bg-rose/10 !border-rose/30 !text-rose' : 
      signal ? '' : '!bg-muted !border-border !text-muted-foreground'
    }`}>
      {value}
    </span>
  );
}
