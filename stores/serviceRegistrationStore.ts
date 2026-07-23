import { create } from 'zustand';
import Toast from 'react-native-toast-message';
import {
  createService,
  updateService,
  deleteService,
  getServicesByProvider,
  uploadServiceImages,
  linkServiceToProvider,
} from '@/services/serviceRepository';
import { ServiceEntity } from '@/types/service';

// Helper to check if a URI is a local file (needs upload)
const isLocalUri = (uri: string): boolean => {
  return uri.startsWith('file://') || uri.startsWith('content://');
};

// Factory for a blank service, used whenever the user starts a brand new
// listing — pulled out so it can be reused regardless of how many
// services the provider already has.
const createBlankService = (): ServiceEntity =>
  ({
    id: '',
    providerId: '',
    name: '',
    description: '',
    category: '',
    location: '',
    workingDays: [],
    workingHours: { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
    durationMinutes: 60,
    images: [],
    rating: 0,
    totalReviews: 0,
    createdAt: new Date(),
    latitude: 0,
    longitude: 0,
    workers: 1,
    services: [],
    status: 'pending',
    amenities: [],
    number: '+233',
    region: '',
    district: '',
    landmark: '',
  }) as ServiceEntity;

interface ServiceRegistrationState {
  currentService: ServiceEntity | null; // the one being created/edited in the form
  services: ServiceEntity[]; // ALL of the provider's services, loaded from Firestore
  isLoading: boolean;
  error: string | null;
  step: number; // 0 = overview, 1-7 = form steps
  // Actions
  loadServicesByProvider: (providerId: string) => Promise<void>;
  startNewService: () => void; // begin creating an additional service
  resetForm: () => void;
  setStep: (step: number) => void;
  updateServiceField: <K extends keyof ServiceEntity>(field: K, value: ServiceEntity[K]) => void;
  saveService: (providerId: string, allImageFiles: string[]) => Promise<void>; // unified save (create or update)
  updateExistingService: (serviceId: string, data: Partial<ServiceEntity>) => Promise<void>;
  deleteExistingService: (serviceId: string, providerId: string) => Promise<void>;
  setCurrentServiceForEdit: (service: ServiceEntity) => void;
  clearError: () => void;
}

export const useServiceRegistrationStore = create<ServiceRegistrationState>((set, get) => ({
  currentService: null,
  services: [],
  isLoading: false,
  error: null,
  step: 0,

  // Loads the FULL list of the provider's services. Unlike the old
  // single-service version, this never auto-creates a blank currentService
  // — that only happens when the user explicitly taps "Add Service" via
  // startNewService(), so loading the list can't accidentally kick you
  // into the create-a-new-listing form.
  loadServicesByProvider: async (providerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const services = await getServicesByProvider(providerId);
      set({ services, isLoading: false, step: 0 });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  // Explicitly start a brand new listing, regardless of how many the
  // provider already has. This replaces the old implicit "no existing
  // service → auto blank form" behavior.
  startNewService: () => {
    set({ currentService: createBlankService(), step: 1 });
  },

  resetForm: () => {
    set({
      currentService: null,
      step: 0,
      error: null,
    });
  },

  setStep: (step: number) => set({ step }),

  updateServiceField: (field, value) => {
    set((state) => ({
      currentService: state.currentService
        ? { ...state.currentService, [field]: value }
        : null,
    }));
  },

  // Unified save method: handles both create and update
  saveService: async (providerId: string, allImageFiles: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const service = get().currentService;
      if (!service) throw new Error('No service data');

      const isEditMode = !!service.id;
      let wasDeclined = false;

      if (isEditMode) {
        // EDIT MODE: update an existing service
        const existingUrls = service.images.filter((url) => !isLocalUri(url));
        const newLocalFiles = allImageFiles.filter(isLocalUri);

        let finalImages = existingUrls;

        if (newLocalFiles.length > 0) {
          const newUrls = await uploadServiceImages(newLocalFiles, providerId);
          finalImages = [...existingUrls, ...newUrls];
        }

        // Status transition on edit:
        // - 'declined' -> 'pending': editing a declined service means the
        //   provider made the requested changes, so it goes back into the
        //   review queue rather than staying declined forever.
        // - 'approved' -> unchanged: an already-approved service should
        //   NOT drop back into 'pending' just because the provider tweaked
        //   something (e.g. photos, hours) — that would needlessly pull a
        //   live listing out of visibility pending re-review.
        // - 'pending' -> unchanged: already in the queue, nothing to do.
        wasDeclined = service.status === 'declined';
        const newStatus = wasDeclined ? 'pending' : service.status;

        const updateData: Partial<ServiceEntity> = {
          name: service.name,
          description: service.description,
          category: service.category,
          location: service.location,
          workingDays: service.workingDays,
          workingHours: service.workingHours,
          durationMinutes: service.durationMinutes,
          workers: service.workers,
          services: service.services,
          amenities: service.amenities,
          number: service.number,
          region: service.region,
          district: service.district,
          latitude: service.latitude,
          longitude: service.longitude,
          images: finalImages,
          status: newStatus,
          landmark: service.landmark
        };

        await updateService(service.id, updateData);
      } else {
        // CREATE MODE: upload all images and create a NEW service —
        // this no longer overwrites any prior listing. linkServiceToProvider
        // uses arrayUnion, so the provider can accumulate any number of
        // service ids on their user doc instead of just the last one.
        const imageUrls = await uploadServiceImages(allImageFiles, providerId);
        const serviceData: ServiceEntity = {
          ...service,
          providerId,
          images: imageUrls,
          createdAt: new Date(),
          status: 'pending',
        };
        await createService(serviceData);
        await linkServiceToProvider(providerId,);
      }

      set({ isLoading: false, step: 0, currentService: null });
      Toast.show({
        type: 'success',
        text1: wasDeclined ? 'Resubmitted for review' : isEditMode ? 'Service updated' : 'Service created',
        text2: wasDeclined
          ? `${service.name} has been updated and sent back for review.`
          : isEditMode
            ? `${service.name} has been updated.`
            : `${service.name} has been submitted for review.`,
        position: 'top',
        visibilityTime: 3500,
        topOffset: 60,
      });
      // Reload the full list to reflect the create/update
      await get().loadServicesByProvider(providerId);
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      Toast.show({
        type: 'error',
        text1: 'Something went wrong',
        text2: err?.message || 'Failed to save your service. Please try again.',
        position: 'top',
        visibilityTime: 4000,
        topOffset: 60,
      });
    }
  },

  updateExistingService: async (serviceId: string, data: Partial<ServiceEntity>) => {
    set({ isLoading: true, error: null });
    try {
      await updateService(serviceId, data);
      set({ isLoading: false });
      // Find the providerId from the currently loaded list rather than
      // assuming a single existingService.
      const owner = get().services.find((s) => s.id === serviceId);
      if (owner?.providerId) await get().loadServicesByProvider(owner.providerId);
      Toast.show({
        type: 'success',
        text1: 'Service updated',
        position: 'top',
        visibilityTime: 3000,
        topOffset: 60,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      Toast.show({
        type: 'error',
        text1: 'Failed to update service',
        text2: err?.message,
        position: 'top',
        visibilityTime: 4000,
        topOffset: 60,
      });
    }
  },

  deleteExistingService: async (serviceId: string, providerId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteService(serviceId, providerId);
      set((state) => ({
        services: state.services.filter((s) => s.id !== serviceId),
        isLoading: false,
      }));
      Toast.show({
        type: 'success',
        text1: 'Service deleted',
        position: 'top',
        visibilityTime: 3000,
        topOffset: 60,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      Toast.show({
        type: 'error',
        text1: 'Failed to delete service',
        text2: err?.message,
        position: 'top',
        visibilityTime: 4000,
        topOffset: 60,
      });
    }
  },

  setCurrentServiceForEdit: (service: ServiceEntity) => {
    set({
      currentService: { ...service }, // copy to avoid mutations
      step: 1,
    });
  },

  clearError: () => set({ error: null }),
}));