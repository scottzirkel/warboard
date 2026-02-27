import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppMode } from '@/types';

// ============================================================================
// Toast Notification Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// ============================================================================
// Modal Types
// ============================================================================

export type ModalType = 'import' | 'export' | 'load' | 'save' | 'confirm' | null;

export interface ConfirmModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

// ============================================================================
// Store Interface
// ============================================================================

// ============================================================================
// Mobile Panel Type
// ============================================================================

export type MobilePanel = 'list' | 'roster' | 'details';

interface UIStoreState {
  // Landing Page
  hasEnteredApp: boolean;

  // App Mode
  mode: AppMode;

  // Unit Selection
  selectedUnitIndex: number | null;

  // Mobile Panel (Build mode only)
  mobilePanel: MobilePanel;

  // Modal States
  activeModal: ModalType;
  confirmModalConfig: ConfirmModalConfig | null;

  // Toast Notifications
  toasts: Toast[];

  // Loading States
  isLoading: boolean;
  loadingMessage: string | null;
}

interface UIStoreActions {
  // Landing Page
  enterApp: () => void;
  exitApp: () => void;

  // Mode Management
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  enterBuildMode: () => void;
  enterPlayMode: () => void;

  // Unit Selection
  selectUnit: (index: number | null) => void;
  clearSelection: () => void;

  // Mobile Panel
  setMobilePanel: (panel: MobilePanel) => void;

  // Modal Management
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  openConfirmModal: (config: ConfirmModalConfig) => void;

  // Toast Notifications
  showToast: (type: ToastType, message: string, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;

  // Loading State
  setLoading: (isLoading: boolean, message?: string | null) => void;

  // Reset
  resetUI: () => void;
}

type UIStore = UIStoreState & UIStoreActions;

// ============================================================================
// Helper Functions
// ============================================================================

const generateToastId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// ============================================================================
// Default State
// ============================================================================

const createDefaultUIState = (): UIStoreState => ({
  hasEnteredApp: false,
  mode: 'build',
  selectedUnitIndex: null,
  mobilePanel: 'list',
  activeModal: null,
  confirmModalConfig: null,
  toasts: [],
  isLoading: false,
  loadingMessage: null,
});

// ============================================================================
// Store Implementation
// ============================================================================

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
  // Initial State
  ...createDefaultUIState(),

  // -------------------------------------------------------------------------
  // Landing Page Actions
  // -------------------------------------------------------------------------

  enterApp: () => {
    set({ hasEnteredApp: true });
  },

  exitApp: () => {
    set({ hasEnteredApp: false, mode: 'build', selectedUnitIndex: null, mobilePanel: 'list' });
  },

  // -------------------------------------------------------------------------
  // Mode Management Actions
  // -------------------------------------------------------------------------

  setMode: (mode: AppMode) => {
    set({ mode });
  },

  toggleMode: () => {
    set(state => ({
      mode: state.mode === 'build' ? 'play' : 'build',
    }));
  },

  enterBuildMode: () => {
    set({ mode: 'build' });
  },

  enterPlayMode: () => {
    set({ mode: 'play' });
  },

  // -------------------------------------------------------------------------
  // Unit Selection Actions
  // -------------------------------------------------------------------------

  selectUnit: (index: number | null) => {
    set({ selectedUnitIndex: index });
  },

  clearSelection: () => {
    set({ selectedUnitIndex: null });
  },

  // -------------------------------------------------------------------------
  // Mobile Panel Actions
  // -------------------------------------------------------------------------

  setMobilePanel: (panel: MobilePanel) => {
    set({ mobilePanel: panel });
  },

  // -------------------------------------------------------------------------
  // Modal Management Actions
  // -------------------------------------------------------------------------

  openModal: (modal: ModalType) => {
    set({ activeModal: modal });
  },

  closeModal: () => {
    set({
      activeModal: null,
      confirmModalConfig: null,
    });
  },

  openConfirmModal: (config: ConfirmModalConfig) => {
    set({
      activeModal: 'confirm',
      confirmModalConfig: config,
    });
  },

  // -------------------------------------------------------------------------
  // Toast Notification Actions
  // -------------------------------------------------------------------------

  showToast: (type: ToastType, message: string, duration: number = 3000) => {
    const id = generateToastId();
    const toast: Toast = { id, type, message, duration };

    set(state => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }
  },

  showSuccess: (message: string) => {
    get().showToast('success', message);
  },

  showError: (message: string) => {
    get().showToast('error', message, 5000); // Longer duration for errors
  },

  showInfo: (message: string) => {
    get().showToast('info', message);
  },

  showWarning: (message: string) => {
    get().showToast('warning', message, 4000);
  },

  dismissToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  // -------------------------------------------------------------------------
  // Loading State Actions
  // -------------------------------------------------------------------------

  setLoading: (isLoading: boolean, message: string | null = null) => {
    set({
      isLoading,
      loadingMessage: isLoading ? message : null,
    });
  },

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  resetUI: () => {
    set(createDefaultUIState());
  },
}),
    {
      name: 'army-tracker-ui',
      partialize: (state) => ({
        mode: state.mode,
        selectedUnitIndex: state.selectedUnitIndex,
        mobilePanel: state.mobilePanel,
      }),
    }
  )
);
