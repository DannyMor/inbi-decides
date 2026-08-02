import { z } from 'zod'

export const ratingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
])

export type Rating = z.infer<typeof ratingSchema>

export const roleSchema = z.enum(['admin', 'voter'])
export type Role = z.infer<typeof roleSchema>

export const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  emoji: z.string().default(''),
  createdAt: z.number(),
  archived: z.boolean().default(false),
  order: z.number().default(0),
})
export type Category = z.infer<typeof categorySchema>

export const imageSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  imageUrl: z.string().url(),
  sourceUrl: z.string().url(),
  title: z.string().default(''),
  rating: ratingSchema.nullable().default(null),
  notes: z.string().default(''),
  createdAt: z.number(),
  updatedAt: z.number(),
  archived: z.boolean().default(false),
})
export type InspirationImage = z.infer<typeof imageSchema>
