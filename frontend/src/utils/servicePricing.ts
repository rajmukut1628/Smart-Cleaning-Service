export interface PricingUnit { _id?: string; unitType: string; label: string; customPlaceholder?: string }
interface PricedService { pricePerSqFt?: number; pricePerUnit?: number; unitConfig?: string | PricingUnit | null }
// Match the backend: a linked unit wins; otherwise infer from the saved service rates.
export function resolveServiceUnit(service: PricedService, available: PricingUnit[] = []): PricingUnit {
  const linked = service.unitConfig;
  if (linked && typeof linked === 'object' && linked.unitType) return linked;
  if (typeof linked === 'string') {
    const match = available.find(config => config._id === linked);
    if (match) return match;
  }
  const unitType = (service.pricePerSqFt || 0) > 0 && (service.pricePerUnit || 0) === 0 ? 'square' : 'unit';
  return available.find(config => config.unitType === unitType) || { unitType, label: unitType === 'square' ? 'Square feet' : 'Quantity', customPlaceholder: unitType === 'square' ? 'Enter area in square feet' : 'Enter quantity' };
}
export function serviceUnitRate(service: PricedService, unit: PricingUnit): number {
  return unit.unitType === 'square' ? service.pricePerSqFt || 0 : service.pricePerUnit || 0;
}
