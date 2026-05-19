export interface TimeSlot {
  displayTime: string;
  time: Date;
}

export interface ServiceOption {
  price: number;
  title: string;
  durationMinutes: number;
}

export interface BookingEntity {
  id: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  userId: string;
  appointmentDate: Date;
  timeSlot: TimeSlot;
  serviceOption: ServiceOption;
  totalAmount: number;
  createdAt: Date;
  userName: string;
  participants: string[];
  status: string; // e.g., 'pending', 'confirmed', 'cancelled'
  latitude?: number;
  longitude?: number;
  workingDays?: string[];
  workingHours?: any;
  services?: any[];
  reminderSent?: boolean;
  cancelReason?: string;
  updatedAt?: Date;
}