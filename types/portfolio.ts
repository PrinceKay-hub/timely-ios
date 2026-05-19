export interface PortfolioImage {
  id: string;
  imageUrl: string;
  createdAt: Date;
  caption: string;
  likes: string[]; // user IDs
  serviceName: string;
}