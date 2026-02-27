import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useUIStore } from './uiStore';

// ============================================================================
// Tests
// ============================================================================

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Landing Page
  // ---------------------------------------------------------------------------

  describe('landing page', () => {
    it('starts with hasEnteredApp false', () => {
      expect(useUIStore.getState().hasEnteredApp).toBe(false);
    });

    it('sets hasEnteredApp on enterApp', () => {
      useUIStore.getState().enterApp();

      expect(useUIStore.getState().hasEnteredApp).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Mode Management
  // ---------------------------------------------------------------------------

  describe('mode management', () => {
    it('starts in build mode', () => {
      expect(useUIStore.getState().mode).toBe('build');
    });

    it('sets mode', () => {
      useUIStore.getState().setMode('play');

      expect(useUIStore.getState().mode).toBe('play');
    });

    it('toggles mode', () => {
      useUIStore.getState().toggleMode();
      expect(useUIStore.getState().mode).toBe('play');

      useUIStore.getState().toggleMode();
      expect(useUIStore.getState().mode).toBe('build');
    });

    it('enters build mode', () => {
      useUIStore.getState().setMode('play');
      useUIStore.getState().enterBuildMode();

      expect(useUIStore.getState().mode).toBe('build');
    });

    it('enters play mode', () => {
      useUIStore.getState().enterPlayMode();

      expect(useUIStore.getState().mode).toBe('play');
    });
  });

  // ---------------------------------------------------------------------------
  // Unit Selection
  // ---------------------------------------------------------------------------

  describe('unit selection', () => {
    it('starts with no selection', () => {
      expect(useUIStore.getState().selectedUnitIndex).toBeNull();
    });

    it('selects a unit', () => {
      useUIStore.getState().selectUnit(2);

      expect(useUIStore.getState().selectedUnitIndex).toBe(2);
    });

    it('clears selection', () => {
      useUIStore.getState().selectUnit(2);
      useUIStore.getState().clearSelection();

      expect(useUIStore.getState().selectedUnitIndex).toBeNull();
    });

    it('selects null to clear', () => {
      useUIStore.getState().selectUnit(2);
      useUIStore.getState().selectUnit(null);

      expect(useUIStore.getState().selectedUnitIndex).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Mobile Panel
  // ---------------------------------------------------------------------------

  describe('mobile panel', () => {
    it('starts on list panel', () => {
      expect(useUIStore.getState().mobilePanel).toBe('list');
    });

    it('sets mobile panel', () => {
      useUIStore.getState().setMobilePanel('roster');
      expect(useUIStore.getState().mobilePanel).toBe('roster');

      useUIStore.getState().setMobilePanel('details');
      expect(useUIStore.getState().mobilePanel).toBe('details');
    });
  });

  // ---------------------------------------------------------------------------
  // Modal Management
  // ---------------------------------------------------------------------------

  describe('modal management', () => {
    it('starts with no modal', () => {
      expect(useUIStore.getState().activeModal).toBeNull();
    });

    it('opens a modal', () => {
      useUIStore.getState().openModal('save');

      expect(useUIStore.getState().activeModal).toBe('save');
    });

    it('closes a modal', () => {
      useUIStore.getState().openModal('save');
      useUIStore.getState().closeModal();

      expect(useUIStore.getState().activeModal).toBeNull();
    });

    it('opens confirm modal with config', () => {
      const config = {
        title: 'Delete?',
        message: 'Are you sure?',
        onConfirm: vi.fn(),
      };

      useUIStore.getState().openConfirmModal(config);

      expect(useUIStore.getState().activeModal).toBe('confirm');
      expect(useUIStore.getState().confirmModalConfig).toEqual(config);
    });

    it('clears confirm config on close', () => {
      useUIStore.getState().openConfirmModal({
        title: 'Test',
        message: 'Test',
        onConfirm: vi.fn(),
      });
      useUIStore.getState().closeModal();

      expect(useUIStore.getState().confirmModalConfig).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Toast Notifications
  // ---------------------------------------------------------------------------

  describe('toast notifications', () => {
    it('shows a toast', () => {
      useUIStore.getState().showToast('success', 'Saved!');

      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0].type).toBe('success');
      expect(useUIStore.getState().toasts[0].message).toBe('Saved!');
    });

    it('shows multiple toasts', () => {
      useUIStore.getState().showSuccess('Success');
      useUIStore.getState().showError('Error');
      useUIStore.getState().showInfo('Info');
      useUIStore.getState().showWarning('Warning');

      expect(useUIStore.getState().toasts).toHaveLength(4);
    });

    it('dismisses a toast by id', () => {
      useUIStore.getState().showSuccess('Test');
      const id = useUIStore.getState().toasts[0].id;

      useUIStore.getState().dismissToast(id);

      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it('clears all toasts', () => {
      useUIStore.getState().showSuccess('A');
      useUIStore.getState().showError('B');
      useUIStore.getState().clearToasts();

      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it('auto-dismisses after duration', () => {
      useUIStore.getState().showToast('info', 'Auto-dismiss', 1000);

      expect(useUIStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1001);

      expect(useUIStore.getState().toasts).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  describe('loading state', () => {
    it('starts not loading', () => {
      expect(useUIStore.getState().isLoading).toBe(false);
      expect(useUIStore.getState().loadingMessage).toBeNull();
    });

    it('sets loading with message', () => {
      useUIStore.getState().setLoading(true, 'Saving...');

      expect(useUIStore.getState().isLoading).toBe(true);
      expect(useUIStore.getState().loadingMessage).toBe('Saving...');
    });

    it('clears loading message when done', () => {
      useUIStore.getState().setLoading(true, 'Loading...');
      useUIStore.getState().setLoading(false);

      expect(useUIStore.getState().isLoading).toBe(false);
      expect(useUIStore.getState().loadingMessage).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  describe('resetUI', () => {
    it('resets all UI state', () => {
      useUIStore.getState().enterApp();
      useUIStore.getState().setMode('play');
      useUIStore.getState().selectUnit(3);
      useUIStore.getState().setMobilePanel('details');
      useUIStore.getState().openModal('save');
      useUIStore.getState().setLoading(true, 'test');

      useUIStore.getState().resetUI();

      const state = useUIStore.getState();

      expect(state.hasEnteredApp).toBe(false);
      expect(state.mode).toBe('build');
      expect(state.selectedUnitIndex).toBeNull();
      expect(state.mobilePanel).toBe('list');
      expect(state.activeModal).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });
});
