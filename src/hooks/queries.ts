import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  createImage,
  deleteCategory,
  deleteImage,
  fetchCategories,
  fetchGallery,
  fetchNewCount,
  fetchVotingQueue,
  rateImage,
  updateCategory,
  updateImage,
  updateImageNotes,
} from '@/lib/firestore'
import type { Category, InspirationImage, Rating } from '@/lib/types'

export const keys = {
  categories: ['categories'] as const,
  newCount: (categoryId: string) => ['newCount', categoryId] as const,
  queue: (categoryId: string) => ['queue', categoryId] as const,
  gallery: (categoryId: string) => ['gallery', categoryId] as const,
}

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: fetchCategories })
}

export function useNewCount(categoryId: string) {
  return useQuery({
    queryKey: keys.newCount(categoryId),
    queryFn: () => fetchNewCount(categoryId),
  })
}

export function useVotingQueue(categoryId: string) {
  return useQuery({
    queryKey: keys.queue(categoryId),
    queryFn: () => fetchVotingQueue(categoryId),
  })
}

export function useGallery(categoryId: string) {
  return useQuery({
    queryKey: keys.gallery(categoryId),
    queryFn: () => fetchGallery(categoryId),
  })
}

function invalidateImages(queryClient: ReturnType<typeof useQueryClient>, categoryId: string) {
  void queryClient.invalidateQueries({ queryKey: keys.queue(categoryId) })
  void queryClient.invalidateQueries({ queryKey: keys.gallery(categoryId) })
  void queryClient.invalidateQueries({ queryKey: keys.newCount(categoryId) })
}

/** Rate from the voting screen: optimistically pop the queue so the next image shows instantly. */
export function useRateFromQueue(categoryId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: Rating }) => rateImage(id, rating),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: keys.queue(categoryId) })
      const previous = queryClient.getQueryData<InspirationImage[]>(keys.queue(categoryId))
      queryClient.setQueryData<InspirationImage[]>(keys.queue(categoryId), (queue) =>
        (queue ?? []).filter((image) => image.id !== id),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(keys.queue(categoryId), context.previous)
    },
    onSettled: () => invalidateImages(queryClient, categoryId),
  })
}

/** Re-rate from the gallery: optimistic in-place update. */
export function useRateFromGallery(categoryId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: Rating | null }) => rateImage(id, rating),
    onMutate: async ({ id, rating }) => {
      await queryClient.cancelQueries({ queryKey: keys.gallery(categoryId) })
      const previous = queryClient.getQueryData<InspirationImage[]>(keys.gallery(categoryId))
      queryClient.setQueryData<InspirationImage[]>(keys.gallery(categoryId), (images) =>
        (images ?? []).map((image) => (image.id === id ? { ...image, rating } : image)),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(keys.gallery(categoryId), context.previous)
    },
    onSettled: () => invalidateImages(queryClient, categoryId),
  })
}

export function useUpdateNotes(categoryId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => updateImageNotes(id, notes),
    onSettled: () => invalidateImages(queryClient, categoryId),
  })
}

export function useUpdateImage(categoryId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<InspirationImage, 'title' | 'imageUrl' | 'sourceUrl' | 'archived' | 'categoryId'>>
    }) => updateImage(id, patch),
    onSettled: () => invalidateImages(queryClient, categoryId),
  })
}

export function useDeleteImage(categoryId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteImage(id),
    onSettled: () => invalidateImages(queryClient, categoryId),
  })
}

export function useCreateImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createImage,
    onSettled: (_data, _error, variables) => invalidateImages(queryClient, variables.categoryId),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCategory,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: keys.categories }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Omit<Category, 'id' | 'createdAt'>>
    }) => updateCategory(id, patch),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: keys.categories }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: keys.categories }),
  })
}
