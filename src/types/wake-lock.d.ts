/**
 * Type definitions for the Screen Wake Lock API
 * https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
 */

interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  readonly type: 'screen';
  release(): Promise<void>;
  addEventListener(
    type: 'release',
    listener: (this: WakeLockSentinel, ev: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: 'release',
    listener: (this: WakeLockSentinel, ev: Event) => void,
    options?: boolean | EventListenerOptions
  ): void;
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

interface Navigator {
  readonly wakeLock: WakeLock;
}
