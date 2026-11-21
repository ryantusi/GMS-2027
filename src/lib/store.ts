import { create } from 'zustand';
import { isDebugMode, isSkipPreloader } from './scroll';

export type NavTheme = 'light' | 'dark';
export type DialogType =
  | 'certificate'
  | 'services'
  | 'contact-directory'
  | 'directory'
  | null;

const AUDIO_STORAGE_KEY = 'gms_audio_enabled';

function getInitialAudioState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(AUDIO_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export interface AppState {
  /* Preloader & Readiness */
  isPreloaded: boolean;
  loadProgress: number;
  skipPreloader: boolean;
  debugMode: boolean;

  /* Theme & Navigation */
  navTheme: NavTheme;
  activeSection: string;
  scrollProgress: number;
  isAudioEnabled: boolean;
  isHeroPinned: boolean;
  isContactVisible: boolean;
  isMobileMenuOpen: boolean;

  /* Shared Selection & Cross-Section Links */
  selectedCountryId: string | null;
  selectedStoreFilter: string | null;
  prefilledStoreEnquiry: string | null;

  /* Shared Dialog State */
  activeDialog: DialogType;
  dialogPayload: unknown;
  dialogTriggerEl: HTMLElement | null;

  /* Actions */
  setPreloaded: (ready: boolean) => void;
  setLoadProgress: (progress: number) => void;
  setNavTheme: (theme: NavTheme) => void;
  setActiveSection: (section: string) => void;
  setScrollProgress: (progress: number) => void;
  toggleAudio: () => void;
  setHeroPinned: (pinned: boolean) => void;
  setContactVisible: (visible: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setSelectedCountryId: (countryId: string | null) => void;
  setSelectedStoreFilter: (storeName: string | null) => void;
  setPrefilledStoreEnquiry: (storeName: string | null) => void;
  setActiveDialog: (dialog: DialogType) => void;
  openDialog: (
    type: Exclude<DialogType, null>,
    payload?: unknown,
    triggerEl?: HTMLElement | null
  ) => void;
  closeDialog: () => void;
}

const initialSkip = isSkipPreloader();
const initialDebug = isDebugMode();

export const useAppStore = create<AppState>((set) => ({
  isPreloaded: initialSkip,
  loadProgress: initialSkip ? 100 : 0,
  skipPreloader: initialSkip,
  debugMode: initialDebug,

  navTheme: 'light',
  activeSection: 'hero',
  scrollProgress: 0,
  isAudioEnabled: getInitialAudioState(),
  isHeroPinned: true,
  isContactVisible: false,
  isMobileMenuOpen: false,

  selectedCountryId: null,
  selectedStoreFilter: null,
  prefilledStoreEnquiry: null,

  activeDialog: null,
  dialogPayload: null,
  dialogTriggerEl: null,

  setPreloaded: (ready) => set({ isPreloaded: ready }),
  setLoadProgress: (progress) => set({ loadProgress: progress }),
  setNavTheme: (theme) => set({ navTheme: theme }),
  setActiveSection: (section) => set({ activeSection: section }),
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
  toggleAudio: () =>
    set((state) => {
      const next = !state.isAudioEnabled;
      try {
        window.sessionStorage.setItem(AUDIO_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors in private browsing
      }
      return { isAudioEnabled: next };
    }),
  setHeroPinned: (pinned) => set({ isHeroPinned: pinned }),
  setContactVisible: (visible) => set({ isContactVisible: visible }),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setSelectedCountryId: (countryId) => set({ selectedCountryId: countryId }),
  setSelectedStoreFilter: (storeName) => set({ selectedStoreFilter: storeName }),
  setPrefilledStoreEnquiry: (storeName) => set({ prefilledStoreEnquiry: storeName }),
  setActiveDialog: (dialog) => set({ activeDialog: dialog }),
  openDialog: (type, payload = null, triggerEl = null) =>
    set({
      activeDialog: type,
      dialogPayload: payload,
      dialogTriggerEl: triggerEl ?? null,
    }),
  closeDialog: () =>
    set({
      activeDialog: null,
      dialogPayload: null,
      dialogTriggerEl: null,
    }),
}));
