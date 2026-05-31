import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

if (process.env['NODE_ENV'] === 'production') {
  console.error('seed.ts must not run in production')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('password123', 12)

  const alice = await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: { username: 'alice', email: 'alice@example.com', passwordHash, isGuest: false },
  })

  const mod = await prisma.user.upsert({
    where: { username: 'moderator' },
    update: {},
    create: { username: 'moderator', email: 'mod@example.com', passwordHash, isGuest: false },
  })

  await prisma.room.upsert({
    where: { code: 'TEST01' },
    update: {},
    create: {
      code: 'TEST01',
      moderatorId: mod.id,
      status: 'LOBBY',
      settings: {
        maxPlayers: 10,
        onSiteMode: false,
        roles: { mafia: 2, detective: 1, doctor: 1, villager: 6 },
        tieVoteRule: 'no_elimination',
        doctorCanSelfSave: true,
      },
    },
  })

  // eslint-disable-next-line no-console
  console.log(`Seeded users: ${alice.username}, ${mod.username} — room: TEST01`)
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })
  .finally(() => void prisma.$disconnect())
