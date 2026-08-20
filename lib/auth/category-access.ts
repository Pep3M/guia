import { prisma } from '@/lib/database/prisma-server'

/**
 * Obtiene las categorías accesibles por un usuario a través de sus grupos.
 * 
 * Reglas de acceso:
 * - OWNER/ADMIN: acceso a todas las categorías de la organización
 * - MEMBER: solo categorías a las que tiene acceso a través de sus grupos
 * - Si no está en ningún grupo: sin acceso a categorías (retorna array vacío)
 * 
 * @param userId - ID del usuario
 * @param organizationId - ID de la organización
 * @returns Array de IDs de categorías accesibles
 */
export async function getUserAccessibleCategories(
  userId: string,
  organizationId: string
): Promise<string[]> {
  try {
    // Obtener el rol del usuario en la organización
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: {
        role: true,
      },
    })

    if (!membership) {
      return []
    }

    // OWNER y ADMIN tienen acceso a todas las categorías
    if (membership.role === 'OWNER' || membership.role === 'ADMIN') {
      const allCategories = await prisma.category.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
        },
      })
      return allCategories.map((cat) => cat.id)
    }

    // MEMBER: obtener categorías a través de sus grupos
    return await getUserCategoriesFromGroups(userId, organizationId)
  } catch (error) {
    console.error('[CATEGORY-ACCESS] Error getting accessible categories:', error)
    // En caso de error, ser conservador y retornar array vacío
    return []
  }
}

/**
 * Obtiene las categorías a las que un usuario tiene acceso a través de sus grupos.
 * 
 * @param userId - ID del usuario
 * @param organizationId - ID de la organización
 * @returns Array de IDs de categorías accesibles a través de grupos
 */
export async function getUserCategoriesFromGroups(
  userId: string,
  organizationId: string
): Promise<string[]> {
  try {
    // Obtener todos los grupos del usuario en la organización
    const groupMemberships = await prisma.groupMember.findMany({
      where: {
        user: {
          id: userId,
        },
        group: {
          organizationId,
        },
      },
      select: {
        groupId: true,
      },
    })

    if (groupMemberships.length === 0) {
      return []
    }

    const groupIds = groupMemberships.map((gm) => gm.groupId)

    // Obtener todas las categorías a las que estos grupos tienen acceso
    const categoryAccesses = await prisma.groupCategoryAccess.findMany({
      where: {
        groupId: {
          in: groupIds,
        },
      },
      select: {
        categoryId: true,
      },
      distinct: ['categoryId'],
    })

    return categoryAccesses.map((ca) => ca.categoryId)
  } catch (error) {
    console.error('[CATEGORY-ACCESS] Error getting categories from groups:', error)
    return []
  }
}

/**
 * Verifica si un usuario puede acceder a una categoría específica.
 * 
 * @param userId - ID del usuario
 * @param organizationId - ID de la organización
 * @param categoryId - ID de la categoría
 * @returns true si el usuario tiene acceso, false en caso contrario
 */
export async function canUserAccessCategory(
  userId: string,
  organizationId: string,
  categoryId: string
): Promise<boolean> {
  try {
    // Verificar que la categoría pertenece a la organización
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        organizationId: true,
      },
    })

    if (!category || category.organizationId !== organizationId) {
      return false
    }

    // Obtener categorías accesibles
    const accessibleCategories = await getUserAccessibleCategories(userId, organizationId)

    return accessibleCategories.includes(categoryId)
  } catch (error) {
    console.error('[CATEGORY-ACCESS] Error checking category access:', error)
    return false
  }
}

/**
 * Verifica si un usuario puede acceder a al menos una de las categorías proporcionadas.
 * Útil para verificar acceso a documentos con múltiples categorías.
 * 
 * @param userId - ID del usuario
 * @param organizationId - ID de la organización
 * @param categoryIds - Array de IDs de categorías
 * @returns true si el usuario tiene acceso a al menos una categoría, false en caso contrario
 */
export async function canUserAccessAnyCategory(
  userId: string,
  organizationId: string,
  categoryIds: string[]
): Promise<boolean> {
  if (categoryIds.length === 0) {
    // Si no hay categorías, el documento es accesible (sin restricción)
    return true
  }

  try {
    const accessibleCategories = await getUserAccessibleCategories(userId, organizationId)

    // Si es OWNER/ADMIN, tiene acceso a todas las categorías
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: {
        role: true,
      },
    })

    if (membership && (membership.role === 'OWNER' || membership.role === 'ADMIN')) {
      return true
    }

    // Verificar si alguna de las categorías del documento está en las accesibles
    return categoryIds.some((catId) => accessibleCategories.includes(catId))
  } catch (error) {
    console.error('[CATEGORY-ACCESS] Error checking any category access:', error)
    return false
  }
}

