import { db } from '@/firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { BookingEntity, TimeSlot } from '@/types/booking';

/**
 * Create a new booking and send a notification to the provider.
 */
export const createBooking = async (booking: BookingEntity): Promise<string> => {
  try {
    // Prepare data (omit id, as Firestore generates it)
    const { id, ...bookingData } = booking;
    const dataToSave = {
      ...bookingData,
      appointmentDate: Timestamp.fromDate(booking.appointmentDate),
      timeSlot: {
        displayTime: booking.timeSlot.displayTime,
        time: Timestamp.fromDate(booking.timeSlot.time),
      },
      serviceOption: booking.serviceOption,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const bookingsRef = collection(db, 'appointments');
    const docRef = await addDoc(bookingsRef, dataToSave);

    // Update the document with its own ID
    await updateDoc(docRef, { id: docRef.id });

    // Create notification for the provider
    await createProviderNotification(docRef.id, booking);

    return docRef.id;
  } catch (e) {
    throw new Error(`Failed to create booking: ${e}`);
  }
};

/**
 * Internal helper to create a provider notification.
 */
const createProviderNotification = async (bookingId: string, booking: BookingEntity) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      type: 'appointment',
      title: 'New Appointment Booking',
      body: `${booking.serviceName} - ${booking.timeSlot.displayTime}`,
      userId: booking.providerId,
      bookingId,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
};

/**
 * Confirm a booking (update status to 'confirmed').
 */
export const confirmBooking = async (bookingId: string): Promise<void> => {
  try {
    const bookingRef = doc(db, 'appointments', bookingId);
    await updateDoc(bookingRef, {
      status: 'confirmed',
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    throw new Error(`Failed to confirm booking: ${e}`);
  }
};

/**
 * Cancel a booking with a reason.
 */
export const cancelBooking = async (bookingId: string, reason: string): Promise<void> => {
  try {
    const bookingRef = doc(db, 'appointments', bookingId);
    await updateDoc(bookingRef, {
      status: 'cancelled',
      cancelReason: reason,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    throw new Error(`Failed to cancel booking: ${e}`);
  }
};

/**
 * Reschedule a booking (update appointment date and time slot).
 */
export const updateBooking = async (
  bookingId: string,
  appointmentDate: Date,
  timeSlot: TimeSlot
): Promise<void> => {
  try {
    const bookingRef = doc(db, 'appointments', bookingId);
    await updateDoc(bookingRef, {
      appointmentDate: Timestamp.fromDate(appointmentDate),
      timeSlot: {
        displayTime: timeSlot.displayTime,
        time: Timestamp.fromDate(timeSlot.time),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    throw new Error(`Failed to reschedule booking: ${e}`);
  }
};

/**
 * Delete a booking entirely.
 */
export const deleteBooking = async (bookingId: string): Promise<void> => {
  try {
    const bookingRef = doc(db, 'appointments', bookingId);
    await deleteDoc(bookingRef);
  } catch (e) {
    throw new Error(`Failed to delete booking: ${e}`);
  }
};

/**
 * Fetch all bookings where the user is a participant (either client or provider).
 * Returns an array of booking documents with IDs attached.
 */
export const getUserBookings = async (userId: string): Promise<any[]> => {
  try {
    const bookingsRef = collection(db, 'appointments');
    const q = query(
      bookingsRef,
      where('participants', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps back to JS Date objects if needed
      appointmentDate: doc.data().appointmentDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      timeSlot: doc.data().timeSlot
        ? {
            ...doc.data().timeSlot,
            time: doc.data().timeSlot.time?.toDate(),
          }
        : undefined,
    }));
  } catch (e) {
    throw new Error(`Failed to get user bookings: ${e}`);
  }
};