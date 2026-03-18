import { useState } from 'react';
import { OperationProvider } from '@/contexts/OperationContext';
import { useAuth } from '@/contexts/AuthContext';
import ProductRegistration from '@/components/cadastro/ProductRegistration';
import PerpetuoAnalysis from '@/components/perpetuo/PerpetuoAnalysis';
import LaunchPlanner from '@/components/planning/LaunchPlanner';
import ThemeToggle from '@/components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, BarChart3, Rocket, Menu, TrendingUp, LogOut } from 'lucide-react';

const tabs = [
  { id: 'cadastro', label: 'Cadastro', icon: Package, desc: 'Produtos & Funil' },
  { id: 'perpetuo', label: 'Perpétuo', icon: BarChart3, desc: 'Análise & CPA' },
  { id: 'planning', label: 'Lançamento', icon: Rocket, desc: 'Lançamento Pago' },
] as const;

type TabId = typeof tabs[number]['id'];

const tabComponents: Record<TabId, React.FC> = {
  cadastro: ProductRegistration,
  perpetuo: PerpetuoAnalysis,
  planning: LaunchPlanner,
};

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>('cadastro');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, userEmail } = useAuth();
  const ActiveComponent = tabComponents[activeTab];

  return (
    <OperationProvider>
      <div className="min-h-screen bg-background flex">
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-72 lg:w-64
          bg-card border-r border-border
          flex flex-col transition-transform duration-300 print:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-foreground">ANTI-PREJUÍZO</h1>
                <p className="text-[10px] text-muted-foreground font-medium">Inteligência Financeira</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                  className={`sidebar-item w-full ${isActive ? 'active' : ''}`}>
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <div className="text-left">
                    <span className="block text-[13px] font-semibold">{tab.label}</span>
                    <span className="block text-[10px] opacity-60">{tab.desc}</span>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <span className="tag-user text-[9px]">✏️ Editável</span>
              <span className="tag-auto text-[9px]">⚡ Calculado</span>
            </div>
            {userEmail && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{userEmail}</span>
                <button onClick={logout} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Sair">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors lg:hidden">
                  <Menu className="h-5 w-5 text-foreground" />
                </button>
                <div className="flex items-center gap-2 lg:hidden">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                    <TrendingUp className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-extrabold tracking-tight text-foreground">ANTI-PREJUÍZO</span>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </header>

          {/* Mobile tab bar */}
          <div className="lg:hidden bg-background border-b border-border overflow-x-auto print:hidden">
            <div className="flex min-w-max px-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap relative transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {isActive && (
                      <motion.div layoutId="mobile-tab" className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25, ease: [0.25, 0, 0, 1] }}>
                <ActiveComponent />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </OperationProvider>
  );
}
