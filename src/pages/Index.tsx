import { useState } from 'react';
import { OperationProvider } from '@/contexts/OperationContext';
import FinancialSimulator from '@/components/simulator/FinancialSimulator';
import CPAForecast from '@/components/cpa/CPAForecast';
import ScenarioSimulator from '@/components/scenarios/ScenarioSimulator';
import HealthDashboard from '@/components/dashboard/HealthDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Target, FlaskConical, Activity } from 'lucide-react';

const tabs = [
  { id: 'simulator', label: 'Operação', icon: Calculator, desc: 'Produto + Funil' },
  { id: 'cpa', label: 'Previsão CPA', icon: Target, desc: 'Tráfego' },
  { id: 'scenarios', label: 'Cenários', icon: FlaskConical, desc: 'Simulações' },
  { id: 'dashboard', label: 'Dashboard', icon: Activity, desc: 'Saúde' },
] as const;

type TabId = typeof tabs[number]['id'];

const tabComponents: Record<TabId, React.FC> = {
  simulator: FinancialSimulator,
  cpa: CPAForecast,
  scenarios: ScenarioSimulator,
  dashboard: HealthDashboard,
};

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>('simulator');
  const ActiveComponent = tabComponents[activeTab];

  return (
    <OperationProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-8 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">AP</span>
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-foreground">ANTI-PREJUÍZO</h1>
                <p className="text-[11px] text-muted-foreground">Terminal de Inteligência Financeira</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <span className="tag-user">✏️ Você preenche</span>
              <span className="tag-auto">⚡ Calculado</span>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="bg-card border-b border-border px-4 md:px-8">
          <div className="max-w-5xl mx-auto flex gap-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </OperationProvider>
  );
}