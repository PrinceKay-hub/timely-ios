
export type ProductCategory =
  | "hair"
  | "nails"
  | "skincare"
  | "makeup"
  | "barbering"
  | "tools"
  | "fragrance"
  | "bundles";

export const CATEGORIES: { id: ProductCategory; label: string; icon: string }[] = [
  { id: "hair", label: "Hair", icon: "hair-dryer" },
  { id: "nails", label: "Nails", icon: "hand-back-right" },
  { id: "skincare", label: "Skincare", icon: "spa" },
  { id: "makeup", label: "Makeup", icon: "palette" },
  { id: "barbering", label: "Barbering", icon: "content-cut" },
  { id: "tools", label: "Tools", icon: "toolbox" },
  { id: "fragrance", label: "Fragrance", icon: "flower" },
  { id: "bundles", label: "Bundles", icon: "gift" },
];


export type ProductStatus = "active" | "offline" | "pending";

export interface Product {
  productId: string;
  sellerId: string;
  sellerName: string;
  sellerType: "provider" | "client";
  name: string;
  description: string;
  price: number;
  currency: string;
  category: ProductCategory;
  tags: string[];
  images: string[];
  thumbnailUrl: string;
  status: ProductStatus;
  contact: string;
  isDelivery: boolean;
  location: string;
  viewCount: number;
  createdAt: number;
  updatedAt: number;
}