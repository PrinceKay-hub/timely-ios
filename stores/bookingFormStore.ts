import { create } from 'zustand';
import { isToday, addMinutes, format } from 'date-fns';

interface Service {
  name: string;
  price: string;
  duration: number;
}

interface BookingFormState {
  providerData: any;
  services: Service[];
  selectedServiceIndices: number[];  // changed from single index
  selectedDate: Date;
  selectedTimeSlot: { display: string; time: Date } | null;
  // totalPrice removed – we compute it from selected services
  isDateWorkingDay: boolean;
  isProviderDataLoaded: boolean;
  phone: string;

  // actions
  setProviderData: (data: any) => void;
  toggleService: (index: number) => void;   // replaces selectService
  selectDate: (date: Date) => void;
  setTimeSlot: (slot: { display: string; time: Date } | null) => void;
  setPhone: (phone: string) => void;
  generateTimeSlots: () => { display: string; time: Date }[];
  reset: () => void;
}

export const useBookingFormStore = create<BookingFormState>((set, get) => ({
  providerData: {},
  services: [],
  selectedServiceIndices: [],   // empty array initially
  selectedDate: new Date(),
  selectedTimeSlot: null,
  isDateWorkingDay: false,
  isProviderDataLoaded: false,
  phone: '+233',

  setProviderData: (data) => {
    const services = data.services || [];
    const workingDays = data.workingDays || [];
    const dayMap: Record<string, number> = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:7 };
    const dayNumbers = workingDays.map((d: string) => dayMap[d]);

    const currentSelectedDate = get().selectedDate;
    const jsDay = currentSelectedDate.getDay();
    const numericDay = jsDay === 0 ? 7 : jsDay;
    const isWorking = dayNumbers.includes(numericDay);

    set({
      providerData: data,
      services,
      isProviderDataLoaded: true,
      isDateWorkingDay: isWorking,
    });
  },

  toggleService: (index) => {
    const { selectedServiceIndices } = get();
    if (selectedServiceIndices.includes(index)) {
      // remove it
      set({ selectedServiceIndices: selectedServiceIndices.filter(i => i !== index) });
    } else {
      // add it
      set({ selectedServiceIndices: [...selectedServiceIndices, index] });
    }
  },

  selectDate: (date) => {
    const { providerData } = get();
    const workingDays = providerData.workingDays || [];
    const dayMap: Record<string, number> = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:7 };
    const dayNumbers = workingDays.map((d: string) => dayMap[d]);
    const isWorkingDay = dayNumbers.includes(date.getDay() === 0 ? 7 : date.getDay());

    set({
      selectedDate: date,
      isDateWorkingDay: isWorkingDay,
      selectedTimeSlot: null,
    });
  },

  setTimeSlot: (slot) => {
    set({ selectedTimeSlot: slot });
  },

  setPhone: (phone) => {
    set({ phone });
  },

  generateTimeSlots: () => {
    const { providerData, selectedDate } = get();
    const hours = providerData.workingHours || { startHour:9, startMinute:0, endHour:17, endMinute:0 };
    const slots = [];

    let start = new Date(selectedDate);
    start.setHours(hours.startHour, hours.startMinute, 0, 0);
    let end = new Date(selectedDate);
    end.setHours(hours.endHour, hours.endMinute, 0, 0);

    const now = new Date();
    const isTodaySelected = isToday(selectedDate);

    while (start < end) {
      if (!isTodaySelected || start > now) {
        slots.push({
          display: format(start, 'h:mm aa'),
          time: new Date(start),
        });
      }
      start = addMinutes(start, 60);
    }
    return slots;
  },

  reset: () => {
    set({
      selectedServiceIndices: [],   // reset to empty
      selectedDate: new Date(),
      selectedTimeSlot: null,
      isDateWorkingDay: false,
      phone: '',
    });
  },
}));