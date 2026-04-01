import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  loading: boolean;
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

// Debounce helper
function useDebouncedEffect(fn: () => void, deps: any[], delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    timeoutRef.current = setTimeout(fn, delay);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function OperationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [product, setProduct] = useState<MainProduct>(defaultProduct);
  const [offers, setOffers] = useState<FunnelOffer[]>([]);
  const [traffic, setTraffic] = useState<TrafficMetrics>(defaultTraffic);
  const [trafficInvestment, setTrafficInvestment] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [mainProductDbId, setMainProductDbId] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  // ---- LOAD from Supabase ----
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Load main product (type = 'principal')
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (products && products.length > 0) {
          const mainProd = products.find(p => p.type === 'principal') || products[0];
          setMainProductDbId(mainProd.id);
          setProduct({
            name: mainProd.name,
            price: Number(mainProd.price),
            salesGoal: 100,
            taxRate: Number(mainProd.tax_percentage || 0),
            platformRate: Number(mainProd.platform_percentage || 0),
            platformFixedFee: Number(mainProd.platform_fixed || 0),
            commissionRate: Number(mainProd.coproducer_percentage || 0),
            otherFixedCosts: Number(mainProd.other_costs || 0),
          });

          // Load secondary products as offers
          const secondaryProds = products.filter(p => p.type !== 'principal');
          const loadedOffers: FunnelOffer[] = secondaryProds.map(sp => ({
            id: sp.id,
            type: (sp.type as FunnelOffer['type']) || 'orderbump',
            name: sp.name,
            price: Number(sp.price),
            conversionRate: 15,
            taxRate: Number(sp.tax_percentage || 0),
            platformRate: Number(sp.platform_percentage || 0),
            platformFixedFee: Number(sp.platform_fixed || 0),
            commissionRate: Number(sp.coproducer_percentage || 0),
            otherFixedCosts: Number(sp.other_costs || 0),
          }));
          setOffers(loadedOffers);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    };

    loadData();
  }, [user]);

  // ---- SAVE main product ----
  useDebouncedEffect(() => {
    if (!user || !initialLoadDone.current) return;

    const save = async () => {
      const data = {
        user_id: user.id,
        name: product.name,
        price: product.price,
        type: 'principal',
        tax_percentage: product.taxRate,
        platform_percentage: product.platformRate,
        platform_fixed: product.platformFixedFee,
        coproducer_percentage: product.commissionRate,
        other_costs: product.otherFixedCosts,
      };

      if (mainProductDbId) {
        await supabase.from('products').update(data).eq('id', mainProductDbId);
      } else {
        const { data: inserted } = await supabase.from('products').insert(data).select().single();
        if (inserted) setMainProductDbId(inserted.id);
      }
    };

    save();
  }, [product, user, mainProductDbId], 1000);

  // ---- SAVE offers (secondary products) ----
  useDebouncedEffect(() => {
    if (!user || !initialLoadDone.current) return;

    const saveOffers = async () => {
      for (const offer of offers) {
        const data = {
          user_id: user.id,
          name: offer.name,
          price: offer.price,
          type: offer.type,
          tax_percentage: offer.taxRate,
          platform_percentage: offer.platformRate,
          platform_fixed: offer.platformFixedFee,
          coproducer_percentage: offer.commissionRate,
          other_costs: offer.otherFixedCosts,
        };

        // Check if exists
        const { data: existing } = await supabase.from('products').select('id').eq('id', offer.id).single();
        if (existing) {
          await supabase.from('products').update(data).eq('id', offer.id);
        } else {
          await supabase.from('products').insert({ ...data, id: offer.id }).select();
        }
      }
    };

    saveOffers();
  }, [offers, user], 1500);

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
    // Delete from DB
    if (user) {
      supabase.from('products').delete().eq('id', id).then();
    }
  }, [user]);

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
    loading,
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
