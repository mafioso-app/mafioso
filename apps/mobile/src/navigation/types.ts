export type RootStackParamList = {
  Login: undefined
  Register: undefined
  Guest: undefined
  Lobby: undefined
  Room: { code: string }
  Moderator: { code: string }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
