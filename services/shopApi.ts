import { getFunctions, httpsCallable } from "firebase/functions";

interface UploadResult {
  key: string;
  uploadUrl: string;
  contentType: string;
}

export async function getUploadUrls(
  files: { contentType: string }[]
): Promise<UploadResult[]> {
  const fn = httpsCallable(getFunctions(), "getUploadUrl");
  const res = await fn({ files });
  return (res.data as { uploads: UploadResult[] }).uploads;
}

export async function uploadImageToB2(uploadUrl: string, uri: string, contentType: string) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!putRes.ok) {
    throw new Error(`Upload failed with status ${putRes.status}`);
  }
}

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  imageKeys: string[];
  contact: string;
  isDelivery: boolean;
  location: string;
  sellerName: string;
  currency: string;
}

export async function createProduct(input: CreateProductInput) {
  const fn = httpsCallable(getFunctions(), "createProduct");
  const res = await fn(input);
  return res.data as { productId: string; thumbnailUrl: string };
}

export async function deleteProduct(productId: string): Promise<void> {
  const fn = httpsCallable(getFunctions(), "deleteProduct");
  await fn({ productId });
}

export interface UpdateProductInput {
  productId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  images: string[];
  newImageKeys: string[];
  contact: string;
  isDelivery: boolean;
  location: string;
  currency: string;
}

export async function updateProduct(input: UpdateProductInput) {
  const fn = httpsCallable(getFunctions(), "updateProduct");
  const res = await fn(input);
  return res.data as { productId: string; thumbnailUrl: string };
}