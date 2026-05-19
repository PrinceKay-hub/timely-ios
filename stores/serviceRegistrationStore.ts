import { create } from 'zustand';
import {
  createService,
  updateService,
  deleteService,
  getServiceByProvider,
  uploadServiceImages,
} from '@/services/serviceRepository';
import { ServiceEntity } from '@/types/service';
import { Platform } from 'react-native';

// Helper to check if a URI is a local file (needs upload)
const isLocalUri = (uri: string): boolean => {
  return uri.startsWith('file://') || uri.startsWith('content://');
};

interface ServiceRegistrationState {
  currentService: ServiceEntity | null;
  existingService: ServiceEntity | null; // loaded from Firestore
  isLoading: boolean;
  error: string | null;
  step: number; // 0 = overview, 1-7 = form steps
  // Actions
  loadServiceByProvider: (providerId: string) => Promise<void>;
  resetForm: () => void;
  setStep: (step: number) => void;
  updateServiceField: <K extends keyof ServiceEntity>(field: K, value: ServiceEntity[K]) => void;
  saveService: (providerId: string, allImageFiles: string[]) => Promise<void>; // unified save (create or update)
  updateExistingService: (serviceId: string, data: Partial<ServiceEntity>) => Promise<void>;
  deleteExistingService: (serviceId: string) => Promise<void>;
  setCurrentServiceForEdit: (service: ServiceEntity) => void;
  clearError: () => void;
}

export const useServiceRegistrationStore = create<ServiceRegistrationState>((set, get) => ({
  currentService: null,
  existingService: null,
  isLoading: false,
  error: null,
  step: 0,

  loadServiceByProvider: async (providerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const service = await getServiceByProvider(providerId);
      set({ existingService: service, isLoading: false, step: service ? 0 : 0 });
      if (!service) {
        // Initialize a new blank service for creation
        set({
          currentService: {
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
          } as ServiceEntity,
        });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
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

      if (service.id) {
        // EDIT MODE: update existing service
        // Separate existing URLs from new local files
        const existingUrls = service.images.filter((url) => !isLocalUri(url));
        const newLocalFiles = allImageFiles.filter(isLocalUri);

        let finalImages = existingUrls;

        // Upload new images if any
        if (newLocalFiles.length > 0) {
          const newUrls = await uploadServiceImages(newLocalFiles, providerId);
          finalImages = [...existingUrls, ...newUrls];
        }

        // Prepare update data (omit id, providerId, createdAt, etc. that shouldn't change)
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
          status: service.status, // could be 'pending' or already approved
        };

        await updateService(service.id, updateData);
      } else {
        // CREATE MODE: upload all images and create new service
        const imageUrls = await uploadServiceImages(allImageFiles, providerId);
        const serviceData: ServiceEntity = {
          ...service,
          providerId,
          images: imageUrls,
          createdAt: new Date(),
          status: 'pending',
        };
        await createService(serviceData);
      }

      set({ isLoading: false, step: 0 });
      // Reload the service to reflect changes
      await get().loadServiceByProvider(providerId);
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateExistingService: async (serviceId: string, data: Partial<ServiceEntity>) => {
    set({ isLoading: true, error: null });
    try {
      await updateService(serviceId, data);
      set({ isLoading: false });
      const providerId = get().existingService?.providerId;
      if (providerId) await get().loadServiceByProvider(providerId);
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  deleteExistingService: async (serviceId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteService(serviceId);
      set({ existingService: null, currentService: null, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setCurrentServiceForEdit: (service: ServiceEntity) => {
    set({ 
      currentService: { ...service }, // copy to avoid mutations
      step: 1,
      existingService: service,
    });
  },

  clearError: () => set({ error: null }),
}));