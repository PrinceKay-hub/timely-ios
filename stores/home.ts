import { categoryRepository } from "@/data/repositories/categoryRepository";
import * as Location from "expo-location";
import { create } from "zustand";

// ─── ViewType enum (mirrors Flutter's enum ViewType { grid, list, tile }) ─────
export type ViewType = "grid" | "list" | "tile";

// ─── State shape (mirrors HomeState) ─────────────────────────────────────────
interface HomeState {
  categories: Record<string, any>[];
  categoriesError: string | null;
  viewType: ViewType;
  location: string;
}

// ─── Actions (mirrors HomeCubit methods) ─────────────────────────────────────
interface HomeActions {
  loadCategories: () => Promise<void>;
  setViewType: (viewType: ViewType) => void;
  setLocation: (location: string) => void;
  updateLocation: () => Promise<void>;
  // Utility used by SpecialOffersCard / other widgets
  showSnackbar: (message: string, type: "error" | "success") => void;
}

// ─── Snackbar state (UI-only, no Flutter equivalent — replaces ScaffoldMessenger) ─
interface SnackbarState {
  snackbarMessage: string;
  snackbarType: "error" | "success";
  snackbarVisible: boolean;
  dismissSnackbar: () => void;
}

export type HomeStore = HomeState & HomeActions & SnackbarState;

// ─── Default state (mirrors HomeState default constructor) ────────────────────
const defaultState: HomeState = {
  categories: [], // this.categories = const []
  categoriesError: null, // this.categoriesError (nullable)
  viewType: "tile", // this.viewType = ViewType.tile
  location: "", // this.location = ''
};

// ─── Store ────────────────────────────────────────────────────────────────────
export const useHomeStore = create<HomeStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  ...defaultState,
  snackbarMessage: "",
  snackbarType: "error",
  snackbarVisible: false,

  // ── loadCategories ─────────────────────────────────────────────────────────
  loadCategories: async () => {
    try {
      const categories = await categoryRepository.fetchCategories();
      set({ categories, categoriesError: null });
    } catch (e) {
      set({ categoriesError: String(e) });
    }
  },

  // ── setViewType ────────────────────────────────────────────────────────────
  setViewType: (viewType: ViewType) => {
    if (get().viewType !== viewType) {
      set({ viewType });
    }
  },

  // ── setLocation ────────────────────────────────────────────────────────────
  setLocation: (location: string) => {
    set({ location });
  },

  // ── updateLocation ─────────────────────────────────────────────────────────
  // Uses expo-location (Expo‑compatible)
  updateLocation: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      get().setLocation(`${latitude},${longitude}`);
    } catch (error) {
      console.log("Failed to get location", error);
      // Fail silently, same as original
    }
  },

  // ── showSnackbar (replaces ScaffoldMessenger.of(context).showSnackBar) ─────
  showSnackbar: (message: string, type: "error" | "success") => {
    set({
      snackbarMessage: message,
      snackbarType: type,
      snackbarVisible: true,
    });
  },

  // ── dismissSnackbar ────────────────────────────────────────────────────────
  dismissSnackbar: () => {
    set({ snackbarVisible: false });
  },
}));
