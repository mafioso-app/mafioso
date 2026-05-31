import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { api } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function registerPushToken(): Promise<void> {
  try {
    const granted = await requestPermissions()
    if (!granted) return
    const tokenData = await Notifications.getExpoPushTokenAsync()
    await api.post('/users/push-token', { token: tokenData.data })
  } catch {
    // non-fatal — push token is best-effort
  }
}

export async function scheduleLocalNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    })
  } catch {
    // ignore
  }
}
