import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  MainProduct, FunnelOffer, TrafficMetrics,
  calcMainProduct, calcFullFunnel, calcCPAProjection,
  ProductCalcResult, FunnelCalcResult, CPAProjectionResult
} from '@/lib/calculations';

interface OperationState {
  product: MainProduct;
  offers: FunnelOffer[];
  traffic: TrafficMetrics;
  trafficInvestment: number;
}

interface OperationContextValue {
  state: OperationState;
  setProduct: (p: MainProduct) => void;
  updateProduct: (partial: Partial<MainProduct>) => void;
  setOffers: (offers: FunnelOffer[]) => void;
  addOffer: (offer: FunnelOffer) => void;
  updateOffer: (id: string, partial: Partial<FunnelOffer>) => void;
  removeOffer: (id: string) => void;
  updateTraffic: (partial: Partial<TrafficMetrics>) => void;
  setTrafficInvestment: (v: number) => void;
  // Computed
  productCalc: ProductCalcResult;
  funnelCalc: FunnelCalcResult;
  cpaProjection: CPAProjectionResult;
}

const defaultProduct: MainProduct = {
  name: 'Meu Produto',
  price: 49.90,
  salesGoal: 100,
  taxRate: 6,
  platformRate: 10,
  platformFixedFee: 2.50,
  commissionRate: 0,
  otherFixedCosts: 0,
};

const defaultTraffic: TrafficMetrics = {
  investment: 5000,
  cpm: 45,
  ctr: 2.3,
  connectRate: 70,
  pageToCheckout: 25,
  checkoutToPurchase: 33,
};

const OperationContext = createContext<OperationContextValue | null>(null);

export function OperationProvider({ children }: { children: React.ReactNode }) {
  const [product, setProduct] = useState<MainProduct>(defaultProduct);
  const [offers, setOffers] = useState<FunnelOffer[]>([]);
  const [traffic, setTraffic] = useState<TrafficMetrics>(defaultTraffic);
  const [trafficInvestment, setTrafficInvestment] = useState(5000);

  const updateProduct = useCallback((partial: Partial<MainProduct>) => {
    setProduct(prev => ({ ...prev, ...partial }));
  }, []);

  const addOffer = useCallback((offer: FunnelOffer) => {
    setOffers(prev => [...prev, offer]);
  }, []);

  const updateOffer = useCallback((id: string, partial: Partial<FunnelOffer>) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, ...partial } : o));
  }, []);

  const removeOffer = useCallback((id: string) => {
    setOffers(prev => prev.filter(o => o.id !== id));
  }, []);

  const updateTraffic = useCallback((partial: Partial<TrafficMetrics>) => {
    setTraffic(prev => ({ ...prev, ...partial }));
  }, []);

  const productCalc = useMemo(() => calcMainProduct(product), [product]);
  const funnelCalc = useMemo(() => calcFullFunnel(product, offers, trafficInvestment), [product, offers, trafficInvestment]);
  const cpaProjection = useMemo(
    () => calcCPAProjection(traffic, funnelCalc.cpaMaxProduct, productCalc.netValuePerSale),
    [traffic, funnelCalc.cpaMaxProduct, productCalc.netValuePerSale]
  );

  const value: OperationContextValue = {
    state: { product, offers, traffic, trafficInvestment },
    setProduct, updateProduct,
    setOffers, addOffer, updateOffer, removeOffer,
    updateTraffic, setTrafficInvestment,
    productCalc, funnelCalc, cpaProjection,
  };

  return (
    <OperationContext.Provider value={value}>
      {children}
    </OperationContext.Provider>
  );
}

export function useOperation() {
  const ctx = useContext(OperationContext);
  if (!ctx) throw new Error('useOperation must be used within OperationProvider');
  return ctx;
}
