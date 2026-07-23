export interface TimeSlot {
  displayTime: string;
  time: Date;
}

export interface ServiceOption {
  price: string;
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
  totalAmount: string;
  createdAt: Date;
  userName: string;
  participants: string[];
  status: string;
  latitude?: number;
  longitude?: number;
  workingDays?: string[];
  workingHours?: any;
  services?: any[];
  reminderSent?: boolean;
  cancelReason?: string;
  updatedAt?: Date;
  phone: string
}