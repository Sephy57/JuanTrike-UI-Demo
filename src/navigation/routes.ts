import type { AppMode } from '../booking/DemoContext';

export type ModeRoute = '/passenger' | '/driver';

export function routeForMode(mode: AppMode): ModeRoute {
  return mode === 'passenger' ? '/passenger' : '/driver';
}
