import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

// Create a singleton instance for edge runtime
const globalForPrisma = globalThis as unknown as {
  prismaEdge: PrismaClient | undefined
  pgPool: Pool | undefined
}

// Initialize the PostgreSQL connection pool
if (!globalForPrisma.pgPool) {
  globalForPrisma.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
}

// Initialize Prisma Client with the driver adapter
if (!globalForPrisma.prismaEdge) {
  const adapter = new PrismaPg(globalForPrisma.pgPool)
  globalForPrisma.prismaEdge = new PrismaClient({ adapter })
}

export const prismaEdge = globalForPrisma.prismaEdge
export const pgPool = globalForPrisma.pgPool


