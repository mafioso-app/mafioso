export interface RoomTemplate {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  description: string
  roles: Record<string, number>
}

export const ROOM_TEMPLATES: Record<string, RoomTemplate> = {
  classic_7: {
    id: 'classic_7',
    name: 'Classic 7',
    minPlayers: 7,
    maxPlayers: 7,
    description: '2 Mafia hunting 5 villagers',
    roles: { mafia: 2, detective: 1, doctor: 1, villager: 3 },
  },
  classic_10: {
    id: 'classic_10',
    name: 'Classic 10',
    minPlayers: 10,
    maxPlayers: 10,
    description: '3 Mafia vs 7 villagers',
    roles: { mafia: 3, detective: 1, doctor: 1, villager: 5 },
  },
  advanced_12: {
    id: 'advanced_12',
    name: 'Advanced 12',
    minPlayers: 12,
    maxPlayers: 12,
    description: 'Full cast with Sheriff',
    roles: { mafia: 3, detective: 1, doctor: 1, sheriff: 1, villager: 6 },
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    minPlayers: 4,
    maxPlayers: 20,
    description: 'Configure your own roles',
    roles: {},
  },
}

/** Expand a template's role map into a flat array of role strings. */
export function expandTemplateRoles(template: RoomTemplate): string[] {
  const roles: string[] = []
  for (const [role, count] of Object.entries(template.roles)) {
    for (let i = 0; i < count; i++) roles.push(role)
  }
  return roles
}
