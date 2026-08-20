/**
 * Siembra (o reinicia) la organización de demostración.
 *
 *   bun run demo:seed
 *
 * Es idempotente y destructivo con la organización demo: borra la que hubiera y
 * la vuelve a crear desde cero. Pensado para ejecutarse por cron cada pocas
 * horas en una instancia pública, de modo que lo que un visitante escriba no se
 * quede ahí para el siguiente.
 *
 * No toca ningún otro dato de la base.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { auth } from '@/lib/auth/auth'
import { generateEmbeddings } from '@/lib/ai/embeddings'
import { chunkText } from '@/lib/document/document-processing'
import { prisma } from '@/lib/database/prisma-server'

const DEMO_SLUG = process.env.DEMO_ORG_SLUG || 'nordika'
const DEMO_ORG_NAME = 'Nordika Logística'

const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'demo1234'
const DEMO_ADMIN_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || 'demo@nordika.example'
const DEMO_MEMBER_EMAIL = process.env.DEMO_MEMBER_EMAIL || 'almacen@nordika.example'

const documentsRoot = path.resolve(process.cwd(), 'demo/documents')

/**
 * Cada subdirectorio de demo/documents es una categoría. `restricted: true`
 * significa que sólo la ven quienes pertenecen al grupo con acceso: es lo que
 * demuestra la compartimentación en la demo.
 */
const CATEGORIES = [
  {
    dir: 'general',
    name: 'General',
    description: 'Documentación abierta a toda la plantilla',
    color: '#2563eb',
    restricted: false,
  },
  {
    dir: 'rrhh',
    name: 'Recursos Humanos',
    description: 'Políticas laborales y convenios',
    color: '#16a34a',
    restricted: false,
  },
  {
    dir: 'confidencial',
    name: 'Confidencial',
    description: 'Márgenes, tarifas y condiciones comerciales',
    color: '#dc2626',
    restricted: true,
  },
] as const

async function resetDemoOrganization() {
  const existing = await prisma.organization.findUnique({
    where: { slug: DEMO_SLUG },
    select: { id: true },
  })

  if (existing) {
    // Las relaciones están en cascada desde Organization, así que basta con
    // borrarla para llevarse categorías, documentos, chunks y conversaciones.
    await prisma.organization.delete({ where: { id: existing.id } })
    console.log(`[demo] Organización "${DEMO_SLUG}" anterior eliminada`)
  }

  return prisma.organization.create({
    data: { name: DEMO_ORG_NAME, slug: DEMO_SLUG },
  })
}

/** Crea el usuario si no existe; si existe, lo reutiliza tal cual. */
async function ensureUser(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    return existing
  }

  // Vía Better Auth para que la contraseña quede con el hash que espera el login.
  await auth.api.signUpEmail({
    body: { email, password: DEMO_PASSWORD, name },
  })

  const created = await prisma.user.findUnique({ where: { email } })

  if (!created) {
    throw new Error(`No se pudo crear el usuario de demostración ${email}`)
  }

  return created
}

async function indexDocument(
  organizationId: string,
  categoryId: string,
  filePath: string
) {
  const fileName = path.basename(filePath)
  const raw = await readFile(filePath, 'utf8')

  const source = await prisma.knowledgeSource.create({
    data: {
      fileName,
      fileUrl: `demo://${path.relative(documentsRoot, filePath)}`,
      fileType: 'md',
      fileSizeBytes: BigInt(Buffer.byteLength(raw)),
      status: 'processing',
      organizationId,
      categories: { create: [{ categoryId }] },
    },
  })

  const chunks = await chunkText(raw)
  const embeddings = await generateEmbeddings(chunks.map((chunk) => chunk.text))

  for (let i = 0; i < chunks.length; i++) {
    await prisma.$executeRaw`
      INSERT INTO "Chunk" (id, content, embedding, metadata, "sourceId", "organizationId", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${chunks[i].text},
        ${`[${embeddings[i].join(',')}]`}::vector,
        ${JSON.stringify(chunks[i].metadata)}::jsonb,
        ${source.id},
        ${organizationId},
        NOW()
      )
    `
  }

  await prisma.knowledgeSource.update({
    where: { id: source.id },
    data: { status: 'completed' },
  })

  console.log(`[demo]   ${fileName} — ${chunks.length} fragmentos`)
}

async function main() {
  console.log('[demo] Sembrando la organización de demostración...')

  const organization = await resetDemoOrganization()

  const admin = await ensureUser(DEMO_ADMIN_EMAIL, 'Dirección (demo)')
  const member = await ensureUser(DEMO_MEMBER_EMAIL, 'Almacén (demo)')

  await prisma.membership.createMany({
    data: [
      { userId: admin.id, organizationId: organization.id, role: 'OWNER' },
      { userId: member.id, organizationId: organization.id, role: 'MEMBER' },
    ],
  })

  // Grupo con acceso sólo a lo no confidencial. El usuario MEMBER entra aquí,
  // de modo que preguntar por márgenes desde su cuenta no devuelve nada.
  const openGroup = await prisma.group.create({
    data: {
      name: 'Operaciones',
      description: 'Acceso a documentación general y de recursos humanos',
      organizationId: organization.id,
      members: { create: [{ userId: member.id }] },
    },
  })

  for (const category of CATEGORIES) {
    const created = await prisma.category.create({
      data: {
        name: category.name,
        description: category.description,
        color: category.color,
        organizationId: organization.id,
      },
    })

    if (!category.restricted) {
      await prisma.groupCategoryAccess.create({
        data: { groupId: openGroup.id, categoryId: created.id },
      })
    }

    const dir = path.join(documentsRoot, category.dir)
    const files = (await readdir(dir)).filter((file) => file.endsWith('.md'))

    console.log(`[demo] Categoría "${category.name}" (${files.length} documentos)`)

    for (const file of files) {
      await indexDocument(organization.id, created.id, path.join(dir, file))
    }
  }

  console.log('')
  console.log(`[demo] Listo. Organización /${DEMO_SLUG}`)
  console.log(`[demo]   Dirección: ${DEMO_ADMIN_EMAIL} / ${DEMO_PASSWORD} (ve todo)`)
  console.log(`[demo]   Almacén:   ${DEMO_MEMBER_EMAIL} / ${DEMO_PASSWORD} (no ve Confidencial)`)
}

main()
  .catch((error) => {
    console.error('[demo] Error sembrando la demostración:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
