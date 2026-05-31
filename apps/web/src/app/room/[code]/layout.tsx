import { SocketProvider } from '@/components/providers/SocketProvider'

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>
}
