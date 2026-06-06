export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

export function saveToken(token: string): void {
  localStorage.setItem('accessToken', token)
}

export function clearToken(): void {
  localStorage.removeItem('accessToken')
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
