import * as SecureStore from 'expo-secure-store';

const KEY = 'OPENAI_API_KEY';

export async function saveApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, key.trim());
}

export async function loadApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
