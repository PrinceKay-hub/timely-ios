// types/offer.ts
export interface OfferModel {
  key: string;
  imageUrl: string;
  isActive: boolean;
  order: number;
}

export const offerFromFirestore = (data: Record<string, any>): OfferModel => ({
  key: data.key ?? '',
  imageUrl: data.imageUrl ?? '',
  isActive: !!data.isActive,
  order: data.order ?? 0,
});