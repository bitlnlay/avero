import type { AveroBridge } from '@avero/shared';

declare global {
  interface Window {
    avero: AveroBridge;
  }
}

export {};
