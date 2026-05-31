import { Team } from '@mafioso/types'
import { villagerRole } from './villager'

describe('villagerRole — static properties', () => {
  it('id is villager', () => expect(villagerRole.id).toBe('villager'))
  it('team is VILLAGE', () => expect(villagerRole.team).toBe(Team.VILLAGE))
  it('hasNightAction is false', () => expect(villagerRole.hasNightAction).toBe(false))
  it('canTargetSelf is false', () => expect(villagerRole.canTargetSelf).toBe(false))
  it('allowedPhases is empty', () => expect(villagerRole.allowedPhases).toHaveLength(0))
  it('has no nightAction function', () => expect(villagerRole.nightAction).toBeUndefined())
})
