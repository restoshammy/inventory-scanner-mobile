// src/config.ts — runtime-editable backend URL
import Constants from 'expo-constants';

let BACKEND_URL: string =
  (Constants.expoConfig?.extra as any)?.backendUrl ||
  (Constants.manifest2 as any)?.extra?.backendUrl ||
  'http://192.168.1.6:5000';

export function getBackendUrl() { return BACKEND_URL; }
export function setBackendUrl(url: string) {
  if (typeof url === 'string' && url.trim()) {
    BACKEND_URL = url.trim().replace(/\/$/, '');
  }
}

export const API = {
  HEALTH: () => `${BACKEND_URL}/api/health`,
  SCAN:   () => `${BACKEND_URL}/api/scan`,
  PRODUCTS: () => `${BACKEND_URL}/api/products`,
};
