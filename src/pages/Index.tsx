import { useState } from 'react';
import { OperationProvider } from '@/contexts/OperationContext';
import FinancialSimulator from '@/components/simulator/FinancialSimulator';
import OfferStack from '@/components/offers/OfferStack';
import CPAForecast from '@/components/cpa/CPAForecast';
import ScenarioSimulator from '@/components/scenarios/ScenarioSimulator';
import HealthDashboard from '@/components/dashboard/HealthDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Layers, Target, FlaskConical, Activity } from 'lucide-react';

const tabs = [
  { id: 'simulator', label: 'Simulador', icon: Calculator },
  { id: 'offers', label: 'Monetização', icon: Layers },
  { id: 'cpa', label: 'Previsão CPA', icon: Target },
  { id: 'scenarios', label: 'Cenários', icon: FlaskConical },
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
] as const;

type TabId = typeof tabs[number]['id'];

const tabComponents: Record<TabId, React.FC> = {
  simulator: FinancialSimulator,
  offers: OfferStack,
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
        <header className="border-b border-border px-4 md:px-8 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-mono font-bold text-sm">AP</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-foreground">Anti-Prejuízo</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Terminal de Inteligência Financeira</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono hidden md:block">
              Sua operação não é uma aposta. É um cálculo.
            </p>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="border-b border-border px-4 md:px-8 overflow-x-auto">
          <div className="max-w-6xl mx-auto flex gap-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-primary text-electric'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 md:px-8 py-6">
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
