import '@testing-library/jest-dom/vitest';

/** jsdom localStorage can be incomplete in Node 22+; provide a full in-memory store. */
const localStore = new Map();
const localStorageMock = {
  getItem: (key) => (localStore.has(key) ? localStore.get(key) : null),
  setItem: (key, value) => {
    localStore.set(key, String(value));
  },
  removeItem: (key) => {
    localStore.delete(key);
  },
  clear: () => {
    localStore.clear();
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
