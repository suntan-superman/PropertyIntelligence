import { ProviderStop } from './client.js';
export function normalizeComps(comps) {
  if (!Array.isArray(comps) || comps.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new ProviderStop('API_CONTRACT_STOP');
  }
  return comps.map((item, index) => ({ providerOrder: index, providerId: item.id ?? null,
    address: item.formattedAddress ?? item.addressLine1 ?? null, propertyType: item.propertyType ?? null,
    price: item.price ?? null, priceMeaning: 'Provider comparable listing price; not asserted closed-sale price',
    lastSalePrice: item.lastSalePrice ?? null, lastSaleDate: item.lastSaleDate ?? null,
    listedDate: item.listedDate ?? null, removedDate: item.removedDate ?? null,
    daysOnMarket: item.daysOnMarket ?? null, status: item.status ?? null,
    distance: item.distance ?? null, correlation: item.correlation ?? null,
    bedrooms: item.bedrooms ?? null, bathrooms: item.bathrooms ?? null,
    squareFeet: item.squareFootage ?? null, latitude: item.latitude ?? null, longitude: item.longitude ?? null,
    providerAttributes: item }));
}
