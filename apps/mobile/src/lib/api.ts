import axios from 'axios'
import { getCachedToken, removeToken } from './storage'
import { navigateToLogin } from '../navigation/NavigationRef'

function getApiUrl(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default
    return (Constants.expoConfig?.extra?.['apiUrl'] as string | undefined) ?? 'http://localhost:3001'
  } catch {
    return 'http://localhost:3001'
  }
}

export const api = axios.create({ baseURL: getApiUrl() })

api.interceptors.request.use((config) => {
  const token = getCachedToken()
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const err = error as { response?: { status?: number } }
    if (err.response?.status === 401) {
      await removeToken()
      navigateToLogin()
    }
    return Promise.reject(error)
  },
)
