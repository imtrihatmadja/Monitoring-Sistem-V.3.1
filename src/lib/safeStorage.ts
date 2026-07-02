// Safe wrapper around localStorage to prevent DOMExceptions / SecurityErrors in sandboxed iframes
const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Fail to read key "${key}" from localStorage (falling back to memory):`, e);
      return memoryStore[key] !== undefined ? memoryStore[key] : null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] Fail to write key "${key}" to localStorage (falling back to memory):`, e);
      memoryStore[key] = String(value);
    }
  },

  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Fail to remove key "${key}" from localStorage (falling back to memory):`, e);
      delete memoryStore[key];
    }
  },

  clear(): void {
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn('[SafeStorage] Fail to clear localStorage (falling back to memory):', e);
      for (const key in memoryStore) {
        delete memoryStore[key];
      }
    }
  }
};
