import { create } from 'zustand';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  createBooking as createBookingService,
  confirmBooking as confirmBookingService,
  cancelBooking as cancelBookingService,
  deleteBooking as deleteBookingService,
  updateBooking as updateBookingService,
  getUserBookings,
} from '@/services/bookingService';
import { sendNotification } from '@/services/notificationService';
import { BookingEntity } from '@/types/booking';

// Helper to convert Firestore doc to BookingEntity
const docToBooking = (doc: DocumentData): BookingEntity => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    appointmentDate: data.appointmentDate?.toDate(),
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
    timeSlot: data.timeSlot
      ? { ...data.timeSlot, time: data.timeSlot.time?.toDate() }
      : undefined,
  } as BookingEntity;
};

interface BookingStore {
  userBookings: BookingEntity[];
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  // Real‑time listener management
  startListening: (userId: string) => void;
  stopListening: () => void;
  // Data fetching (one‑time, used as fallback)
  fetchUserBookings: (userId: string) => Promise<void>;
  // Actions (keep your existing ones with notification logic)
  createBooking: (booking: BookingEntity) => Promise<void>;
  confirmBooking: (bookingId: string, userId: string) => Promise<void>;
  cancelBooking: (bookingId: string, targetId: string , reason: string) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  updateBooking: (bookingId: string, appointmentDate: Date, timeSlot: any) => Promise<void>;
  clearMessages: () => void;
}

export const useBookingStore = create<BookingStore>((set, get) => {
  let unsubscribe: (() => void) | null = null;

  const startListening = (userId: string) => {
    if (!userId) return;
    if (unsubscribe) unsubscribe(); // clean up previous listener

    const bookingsRef = collection(db, 'appointments');
    const q = query(
      bookingsRef,
      where('participants', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const bookings = snapshot.docs.map(docToBooking);
        set({ userBookings: bookings, isLoading: false });
      },
      (error) => {
        console.error('Snapshot error:', error);
        set({ error: error.message, isLoading: false });
      }
    );
  };

  const stopListening = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  return {
    userBookings: [],
    isLoading: false,
    error: null,
    successMessage: null,

    startListening,
    stopListening,

    // One‑time fetch – can still be used for initial load, but the listener will also do it.
    fetchUserBookings: async (userId: string) => {
      set({ isLoading: true, error: null });
      try {
        const bookings = await getUserBookings(userId);
        set({ userBookings: bookings, isLoading: false });
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
      }
    },

    
    createBooking: async (booking: BookingEntity) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        await createBookingService(booking);
        set({ successMessage: 'Booking created successfully', isLoading: false });

        // Send notification to provider
        const providerRef = doc(db, 'users', booking.providerId);
        const providerSnap = await getDoc(providerRef);
        if (providerSnap.exists()) {
          const providerData = providerSnap.data();
          const providerToken = providerData.fcmToken;
          if (providerToken) {
            await sendNotification({
              deviceToken: providerToken,
              title: 'New Appointment Booking',
              body: `Open app for more details`,
            }).catch(err => console.warn('Notification failed', err));
          }
        }

        // Refresh – the listener will pick up the change anyway, but we keep it for consistency
        const userId = booking.userId;
        if (userId) {
          await get().fetchUserBookings(userId);
        }
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    confirmBooking: async (bookingId: string, userId: string) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        await confirmBookingService(bookingId);
        
        

        // Send notification to provider
        const providerRef = doc(db, 'users', userId);
        const providerSnap = await getDoc(providerRef);
        if (providerSnap.exists()) {
          const providerData = providerSnap.data();
          const providerToken = providerData.fcmToken;
          if (providerToken) {
            await sendNotification({
              deviceToken: providerToken,
              title: 'Appointment Confirmed ✅',
              body: `Your appointment has been confirmed`,
            }).catch(err => console.warn('Notification failed', err));
          }
        }
        // No manual refresh needed – the snapshot will update
        set({ successMessage: 'Booking confirmed', isLoading: false });
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    cancelBooking: async (bookingId: string, targetId: string, reason: string) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        await cancelBookingService(bookingId, reason);

        // Send notification to the other party
        const otherUserRef = doc(db, 'users', targetId);
        const otherUserSnap = await getDoc(otherUserRef);
        if (otherUserSnap.exists()) {
          const otherUserData = otherUserSnap.data();
          const token = otherUserData.fcmToken || otherUserData.expoPushToken;
          if (token) {
            await sendNotification({
              deviceToken: token,
              title: 'Appointment Cancelled',
              body: `Your appointment has been cancelled. Reason: ${reason}`,
            }).catch(err => console.warn('Notification failed', err));
          }
        }

    set({ successMessage: 'Booking cancelled', isLoading: false });

      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    deleteBooking: async (bookingId: string) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        await deleteBookingService(bookingId);
        set({ successMessage: 'Booking deleted', isLoading: false });
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    updateBooking: async (bookingId: string, appointmentDate: Date, timeSlot: any) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        await updateBookingService(bookingId, appointmentDate, timeSlot);
        set({ successMessage: 'Booking updated', isLoading: false });
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    clearMessages: () => set({ error: null, successMessage: null }),

  };
});