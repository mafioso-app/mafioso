import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'accessToken'

let cachedToken: string | null = null

export async function setToken(token: string): Promise<void> {
  cachedToken = token
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function getToken(): Promise<string | null> {
  if (cachedToken !== null) return cachedToken
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY)
  return cachedToken
}

export async function removeToken(): Promise<void> {
  cachedToken = null
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export function getCachedToken(): string | null {
  return cachedToken
}
