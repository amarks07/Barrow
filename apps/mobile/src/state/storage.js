import AsyncStorage from "@react-native-async-storage/async-storage";

// The storage adapter usePersistedState (packages/core) expects — the
// mobile equivalent of the web app's direct localStorage calls.
export const asyncStorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
