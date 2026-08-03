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

// Every image mutation carries categoryId in its variables. Deriving it from
// component props is unsafe: a dialog can close before the mutation settles,
// and the callbacks would then see a stale/empty category and refresh nothing.

/** Rate from the voting screen: optimistically pop the queue so the next image shows instantly. */
export function useRateFromQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; categoryId: string; rating: Rating }) =>
      rateImage(id, rating),
    onMutate: async ({ id, categoryId }) => {
      await queryClient.cancelQueries({ queryKey: keys.queue(categoryId) })
      const previous = queryClient.getQueryData<InspirationImage[]>(keys.queue(categoryId))
      queryClient.setQueryData<InspirationImage[]>(keys.queue(categoryId), (queue) =>
        (queue ?? []).filter((image) => image.id !== id),
      )
      return { previous }
    },
    onError: (_error, { categoryId }, context) => {
      if (context?.previous) queryClient.setQueryData(keys.queue(categoryId), context.previous)
    },
    onSettled: (_data, _error, { categoryId }) => invalidateImages(queryClient, categoryId),
  })
}

/** Re-rate from the gallery: optimistic in-place update. */
export function useRateFromGallery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; categoryId: string; rating: Rating | null }) =>
      rateImage(id, rating),
    onMutate: async ({ id, categoryId, rating }) => {
      await queryClient.cancelQueries({ queryKey: keys.gallery(categoryId) })
      const previous = queryClient.getQueryData<InspirationImage[]>(keys.gallery(categoryId))
      queryClient.setQueryData<InspirationImage[]>(keys.gallery(categoryId), (images) =>
        (images ?? []).map((image) => (image.id === id ? { ...image, rating } : image)),
      )
      return { previous }
    },
    onError: (_error, { categoryId }, context) => {
      if (context?.previous) queryClient.setQueryData(keys.gallery(categoryId), context.previous)
    },
    onSettled: (_data, _error, { categoryId }) => invalidateImages(queryClient, categoryId),
  })
}

export function useUpdateNotes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; categoryId: string; notes: string }) =>
      updateImageNotes(id, notes),
    onSettled: (_data, _error, { categoryId }) => invalidateImages(queryClient, categoryId),
  })
}

type ImagePatch = Partial<
  Pick<InspirationImage, 'title' | 'imageUrl' | 'sourceUrl' | 'archived' | 'categoryId'>
>

/** Optimistic in-place patch (archive toggles, URL/title edits show instantly). */
export function useUpdateImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; categoryId: string; patch: ImagePatch }) =>
      updateImage(id, patch),
    onMutate: async ({ id, categoryId, patch }) => {
      await queryClient.cancelQueries({ queryKey: keys.gallery(categoryId) })
      const previous = queryClient.getQueryData<InspirationImage[]>(keys.gallery(categoryId))
      queryClient.setQueryData<InspirationImage[]>(keys.gallery(categoryId), (images) =>
        (images ?? []).map((image) => (image.id === id ? { ...image, ...patch } : image)),
      )
      return { previous }
    },
    onError: (_error, { categoryId }, context) => {
      if (context?.previous) queryClient.setQueryData(keys.gallery(categoryId), context.previous)
    },
    onSettled: (_data, _error, { categoryId }) => invalidateImages(queryClient, categoryId),
  })
}

/** Optimistic removal from gallery and queue — the row disappears immediately. */
export function useDeleteImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; categoryId: string }) => deleteImage(id),
    onMutate: async ({ id, categoryId }) => {
      await queryClient.cancelQueries({ queryKey: keys.gallery(categoryId) })
      await queryClient.cancelQueries({ queryKey: keys.queue(categoryId) })
      const previousGallery = queryClient.getQueryData<InspirationImage[]>(keys.gallery(categoryId))
      const previousQueue = queryClient.getQueryData<InspirationImage[]>(keys.queue(categoryId))
      const drop = (images?: InspirationImage[]) => (images ?? []).filter((entry) => entry.id !== id)
      queryClient.setQueryData<InspirationImage[]>(keys.gallery(categoryId), drop)
      queryClient.setQueryData<InspirationImage[]>(keys.queue(categoryId), drop)
      return { previousGallery, previousQueue }
    },
    onError: (_error, { categoryId }, context) => {
      if (context?.previousGallery)
        queryClient.setQueryData(keys.gallery(categoryId), context.previousGallery)
      if (context?.previousQueue)
        queryClient.setQueryData(keys.queue(categoryId), context.previousQueue)
    },
    onSettled: (_data, _error, { categoryId }) => invalidateImages(queryClient, categoryId),
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
