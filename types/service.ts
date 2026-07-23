export interface WorkingHours {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface ServiceEntity {
  id: string;
  providerId: string;
  name: string;
  description: string;
  category: string;
  location: string;
  workingDays: string[];
  workingHours: WorkingHours;
  durationMinutes: number;
  images: string[];
  rating: number;
  totalReviews: number;
  createdAt: Date;
  latitude?: number;
  longitude?: number;
  workers: number;
  services: Array<{ name: string; price: number; duration: number }>;
  status: string;
  amenities: string[];
  number: string;
  region: string;
  district: string;
  rejectionReason?: string;
  landmark: string
}