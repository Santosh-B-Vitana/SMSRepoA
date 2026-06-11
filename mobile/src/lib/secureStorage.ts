import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';

const MAX_SECURE_STORE_VALUE_LENGTH = 2000;

export const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (value.length > MAX_SECURE_STORE_VALUE_LENGTH) {
        const chunks = Math.ceil(value.length / MAX_SECURE_STORE_VALUE_LENGTH);
        for (let i = 0; i < chunks; i++) {
          const chunk = value.slice(
            i * MAX_SECURE_STORE_VALUE_LENGTH,
            (i + 1) * MAX_SECURE_STORE_VALUE_LENGTH,
          );
          await SecureStore.setItemAsync(`${name}_chunk_${i}`, chunk);
        }
        await SecureStore.setItemAsync(`${name}_chunks`, String(chunks));
      } else {
        await SecureStore.setItemAsync(name, value);
      }
    } catch {
      // Silently fail — auth guard will redirect to login on missing token
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      const chunksStr = await SecureStore.getItemAsync(`${name}_chunks`);
      if (chunksStr) {
        const chunks = parseInt(chunksStr, 10);
        for (let i = 0; i < chunks; i++) {
          await SecureStore.deleteItemAsync(`${name}_chunk_${i}`);
        }
        await SecureStore.deleteItemAsync(`${name}_chunks`);
      } else {
        await SecureStore.deleteItemAsync(name);
      }
    } catch {
      // Silently fail
    }
  },
};

export function createSecureStorage(): StateStorage {
  return secureStorage;
}
