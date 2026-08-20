import { useQuery } from '@tanstack/react-query'

export interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  _count: {
    memberships: number
    knowledgeSources: number
  }
}

const fetchOrganization = async (slug: string): Promise<Organization> => {
  const response = await fetch(`/api/organizations/by-slug/${slug}`)
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Organization not found')
    }
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    throw new Error('Failed to fetch organization')
  }
  
  return response.json()
}

export const useOrganization = (slug: string) => {
  return useQuery({
    queryKey: ['organization', slug],
    queryFn: () => fetchOrganization(slug),
    enabled: !!slug,
    retry: (failureCount, error) => {
      // No retry for 404 or 401 errors
      if (error.message === 'Organization not found' || error.message === 'Unauthorized') {
        return false
      }
      return failureCount < 3
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
