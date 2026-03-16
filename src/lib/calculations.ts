// ============================================================
// Anti-Prejuízo Calculation Engine
// Cascading Reactivity: L1 (Base) → L2 (Funnel) → L3 (Traffic) → L4 (Decision)
// ============================================================

export interface MainProduct {
  name: string;
  price: number;
  salesGoal: number; // meta de vendas em 30 dias
  taxRate: number; // % impostos
  platformRate: number; // % taxa plataforma
  platformFixedFee: number; // taxa fixa por venda
  commissionRate: number; // % co-produtor
  otherFixedCosts: number; // outros custos fixos por venda
}

export interface FunnelOffer {
  id: string;
  type: 'orderbump' | 'upsell' | 'downsell';
  name: string;
  price: number;
  conversionRate: number; // % de conversão sobre vendas do principal
  taxRate: number;
  platformRate: number;
  platformFixedFee: number;
  commissionRate: number;
  otherFixedCosts: number;
}

export interface TrafficMetrics {
  investment: number;
  cpm: number;
  ctr: number; // %
  connectRate: number; // %
  pageToCheckout: number; // %
  checkoutToPurchase: number; // %
}

export interface ScenarioInputs {
  targetProfitPerSale: number;
  targetMonthlyProfit: number;
  assumedCpa: number;
}

// ============================================================
// L1: Base Product Calculations
// ============================================================

export interface ProductCalcResult {
  taxPerSale: number;
  platformFeePerSale: number;
  commissionPerSale: number;
  totalCostsPerSale: number;
  netValuePerSale: number; // CPA máximo do produto
  taxTotal: number;
  platformFeeTotal: number;
  commissionTotal: number;
  totalCostsTotal: number;
  grossRevenue: number;
  netRevenue: number;
  salesPerDay: number;
}

export function calcMainProduct(p: MainProduct): ProductCalcResult {
  const taxPerSale = p.price * (p.taxRate / 100);
  const platformFeePerSale = p.price * (p.platformRate / 100) + p.platformFixedFee;
  const commissionPerSale = p.price * (p.commissionRate / 100);
  const totalCostsPerSale = taxPerSale + platformFeePerSale + commissionPerSale + p.otherFixedCosts;
  const netValuePerSale = p.price - totalCostsPerSale;

  return {
    taxPerSale,
    platformFeePerSale,
    commissionPerSale,
    totalCostsPerSale,
    netValuePerSale,
    taxTotal: taxPerSale * p.salesGoal,
    platformFeeTotal: platformFeePerSale * p.salesGoal,
    commissionTotal: commissionPerSale * p.salesGoal,
    totalCostsTotal: totalCostsPerSale * p.salesGoal,
    grossRevenue: p.price * p.salesGoal,
    netRevenue: netValuePerSale * p.salesGoal,
    salesPerDay: p.salesGoal / 30,
  };
}

// ============================================================
// L2: Funnel Offer Calculations
// ============================================================

export interface OfferCalcResult {
  netValuePerSale: number;
  salesCount: number; // based on main product sales goal * conversion rate
  taxPerSale: number;
  platformFeePerSale: number;
  commissionPerSale: number;
  totalCostsPerSale: number;
  grossRevenue: number;
  netRevenue: number;
  contributionPerMainSale: number; // net value × conversion rate
}

export function calcOffer(offer: FunnelOffer, mainSalesGoal: number): OfferCalcResult {
  const taxPerSale = offer.price * (offer.taxRate / 100);
  const platformFeePerSale = offer.price * (offer.platformRate / 100) + offer.platformFixedFee;
  const commissionPerSale = offer.price * (offer.commissionRate / 100);
  const totalCostsPerSale = taxPerSale + platformFeePerSale + commissionPerSale + offer.otherFixedCosts;
  const netValuePerSale = offer.price - totalCostsPerSale;
  const salesCount = mainSalesGoal * (offer.conversionRate / 100);

  return {
    netValuePerSale,
    salesCount,
    taxPerSale,
    platformFeePerSale,
    commissionPerSale,
    totalCostsPerSale,
    grossRevenue: offer.price * salesCount,
    netRevenue: netValuePerSale * salesCount,
    contributionPerMainSale: netValuePerSale * (offer.conversionRate / 100),
  };
}

// ============================================================
// L2: Full Funnel Aggregation
// ============================================================

export interface FunnelCalcResult {
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalCosts: number;
  totalCommissions: number;
  cpaMaxProduct: number; // CPA máximo considerando só produto
  cpaMaxFunnel: number; // CPA máximo considerando funil completo
  revenuePerClient: number; // receita líquida por cliente (LTV imediato)
  offerResults: OfferCalcResult[];
  roiProjections: { roi: number; cpaNeeded: number; investmentNeeded: number }[];
  breakEvenSales: number;
  healthZonesProduct: HealthZones;
  healthZonesFunnel: HealthZones;
}

export interface HealthZones {
  healthy: [number, number];
  moderate: [number, number];
  aggressive: [number, number];
  dangerAbove: number;
}

function calcHealthZones(cpaMax: number): HealthZones {
  // Based on spreadsheet: healthy ~38-63%, moderate 63-76%, aggressive 76-88%, danger >88%
  return {
    healthy: [cpaMax * 0.38, cpaMax * 0.63],
    moderate: [cpaMax * 0.63, cpaMax * 0.76],
    aggressive: [cpaMax * 0.76, cpaMax * 0.885],
    dangerAbove: cpaMax * 0.885,
  };
}

export function calcFullFunnel(
  product: MainProduct,
  offers: FunnelOffer[],
  trafficInvestment: number = 5000
): FunnelCalcResult {
  const mainResult = calcMainProduct(product);
  const offerResults = offers.map(o => calcOffer(o, product.salesGoal));

  const totalGrossRevenue = mainResult.grossRevenue + offerResults.reduce((s, o) => s + o.grossRevenue, 0);
  const totalNetRevenue = mainResult.netRevenue + offerResults.reduce((s, o) => s + o.netRevenue, 0);
  const totalCosts = mainResult.totalCostsTotal + offerResults.reduce((s, o) => s + o.totalCostsPerSale * o.salesCount, 0);
  const totalCommissions = mainResult.commissionTotal + offerResults.reduce((s, o) => s + o.commissionPerSale * o.salesCount, 0);

  const cpaMaxProduct = mainResult.netValuePerSale;
  const funnelContribution = offerResults.reduce((s, o) => s + o.contributionPerMainSale, 0);
  const cpaMaxFunnel = cpaMaxProduct + funnelContribution;
  const revenuePerClient = cpaMaxFunnel; // net value per client including funnel

  // ROI projections
  const roiProjections = [0, 1, 2, 3, 5].map(roi => {
    const cpaNeeded = cpaMaxFunnel / (roi + 1);
    const investmentNeeded = cpaNeeded * product.salesGoal;
    return { roi, cpaNeeded, investmentNeeded };
  });

  // Break-even: how many sales to cover investment
  const breakEvenSales = cpaMaxFunnel > 0 ? Math.ceil(trafficInvestment / cpaMaxFunnel) : Infinity;

  return {
    totalGrossRevenue,
    totalNetRevenue,
    totalCosts,
    totalCommissions,
    cpaMaxProduct,
    cpaMaxFunnel,
    revenuePerClient,
    offerResults,
    roiProjections,
    breakEvenSales,
    healthZonesProduct: calcHealthZones(cpaMaxProduct),
    healthZonesFunnel: calcHealthZones(cpaMaxFunnel),
  };
}

// ============================================================
// L3: Traffic / CPA Projection
// ============================================================

export interface CPAProjectionResult {
  impressions: number;
  clicks: number;
  cpc: number;
  pageViews: number;
  costPerPageView: number;
  checkouts: number;
  costPerCheckout: number;
  purchases: number;
  projectedCPA: number;
  projectedProfit: number;
  projectedProfitPerSale: number;
  isViable: boolean;
}

export function calcCPAProjection(
  traffic: TrafficMetrics,
  cpaMaxProduct: number,
  netValuePerSale: number
): CPAProjectionResult {
  const impressions = (traffic.investment / traffic.cpm) * 1000;
  const clicks = impressions * (traffic.ctr / 100);
  const cpc = traffic.investment / clicks;
  const pageViews = clicks * (traffic.connectRate / 100);
  const costPerPageView = traffic.investment / pageViews;
  const checkouts = pageViews * (traffic.pageToCheckout / 100);
  const costPerCheckout = traffic.investment / checkouts;
  const purchases = checkouts * (traffic.checkoutToPurchase / 100);
  const projectedCPA = traffic.investment / purchases;
  const projectedProfitPerSale = netValuePerSale - projectedCPA;
  const projectedProfit = projectedProfitPerSale * purchases;
  const isViable = projectedCPA <= cpaMaxProduct;

  return {
    impressions,
    clicks,
    cpc,
    pageViews,
    costPerPageView,
    checkouts,
    costPerCheckout,
    purchases: Math.floor(purchases),
    projectedCPA,
    projectedProfit,
    projectedProfitPerSale,
    isViable,
  };
}

// ============================================================
// L4: Scenario Calculations
// ============================================================

export interface ScenarioResult1 {
  requiredCPA: number;
  requiredSales: number;
  requiredInvestment: number;
}

// Situação 1: Given target profit per sale → find CPA, monthly sales, investment
export function calcScenario1(
  targetProfitPerSale: number,
  cpaMaxFunnel: number,
  netValuePerSale: number,
  monthlyProfitTarget: number
): ScenarioResult1 {
  const requiredCPA = netValuePerSale - targetProfitPerSale;
  const requiredSales = monthlyProfitTarget / targetProfitPerSale;
  const requiredInvestment = requiredCPA * requiredSales;
  return { requiredCPA, requiredSales, requiredInvestment };
}

// Situação 2: Given assumed CPA and monthly profit target → find sales and investment
export interface ScenarioResult2 {
  profitPerSale: number;
  requiredSales: number;
  requiredInvestment: number;
}

export function calcScenario2(
  assumedCpa: number,
  netValuePerSale: number,
  monthlyProfitTarget: number
): ScenarioResult2 {
  const profitPerSale = netValuePerSale - assumedCpa;
  const requiredSales = profitPerSale > 0 ? Math.ceil(monthlyProfitTarget / profitPerSale) : Infinity;
  const requiredInvestment = assumedCpa * requiredSales;
  return { profitPerSale, requiredSales, requiredInvestment };
}

// ============================================================
// Helpers
// ============================================================

export function getHealthStatus(cpa: number, zones: HealthZones): 'healthy' | 'moderate' | 'aggressive' | 'danger' {
  if (cpa <= zones.healthy[1]) return 'healthy';
  if (cpa <= zones.moderate[1]) return 'moderate';
  if (cpa <= zones.aggressive[1]) return 'aggressive';
  return 'danger';
}

export function formatBRL(value: number): string {
  if (!isFinite(value)) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercent(value: number): string {
  if (!isFinite(value)) return '—';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

export function formatNumber(value: number, decimals = 0): string {
  if (!isFinite(value)) return '—';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
