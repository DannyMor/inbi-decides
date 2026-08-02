import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Category, InspirationImage, Rating, Role } from './types'

const CATEGORIES = 'categories'
const IMAGES = 'images'
const USERS = 'users'

function millis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return Date.now()
}

function toCategory(snap: QueryDocumentSnapshot<DocumentData>): Category {
  const data = snap.data()
  return {
    id: snap.id,
    name: String(data.name ?? ''),
    emoji: String(data.emoji ?? ''),
    createdAt: millis(data.createdAt),
    archived: Boolean(data.archived),
    order: Number(data.order ?? 0),
  }
}

function toImage(snap: QueryDocumentSnapshot<DocumentData>): InspirationImage {
  const data = snap.data()
  return {
    id: snap.id,
    categoryId: String(data.categoryId ?? ''),
    imageUrl: String(data.imageUrl ?? ''),
    sourceUrl: String(data.sourceUrl ?? ''),
    title: String(data.title ?? ''),
    rating: (data.rating ?? null) as Rating | null,
    notes: String(data.notes ?? ''),
    createdAt: millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
    archived: Boolean(data.archived),
  }
}

// --- roles ---

export async function fetchRole(uid: string): Promise<Role | null> {
  const snap = await getDoc(doc(db(), USERS, uid))
  const role = snap.data()?.role
  return role === 'admin' || role === 'voter' ? role : null
}

// --- categories ---

export async function fetchCategories(): Promise<Category[]> {
  const snap = await getDocs(query(collection(db(), CATEGORIES), orderBy('order', 'asc')))
  return snap.docs.map(toCategory)
}

export async function createCategory(input: { name: string; emoji: string; order: number }) {
  await addDoc(collection(db(), CATEGORIES), {
    ...input,
    archived: false,
    createdAt: serverTimestamp(),
  })
}

export async function updateCategory(id: string, patch: Partial<Omit<Category, 'id' | 'createdAt'>>) {
  await updateDoc(doc(db(), CATEGORIES, id), patch)
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(db(), CATEGORIES, id))
}

// --- images ---

export async function fetchVotingQueue(categoryId: string, take = 5): Promise<InspirationImage[]> {
  const snap = await getDocs(
    query(
      collection(db(), IMAGES),
      where('categoryId', '==', categoryId),
      where('rating', '==', null),
      where('archived', '==', false),
      orderBy('createdAt', 'asc'),
      limit(take),
    ),
  )
  return snap.docs.map(toImage)
}

export async function fetchNewCount(categoryId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(
      collection(db(), IMAGES),
      where('categoryId', '==', categoryId),
      where('rating', '==', null),
      where('archived', '==', false),
    ),
  )
  return snap.data().count
}

export async function fetchGallery(categoryId: string): Promise<InspirationImage[]> {
  const snap = await getDocs(
    query(
      collection(db(), IMAGES),
      where('categoryId', '==', categoryId),
      orderBy('rating', 'desc'),
      orderBy('createdAt', 'desc'),
    ),
  )
  return snap.docs.map(toImage)
}

export async function createImage(input: {
  categoryId: string
  imageUrl: string
  sourceUrl: string
  title: string
}) {
  await addDoc(collection(db(), IMAGES), {
    ...input,
    rating: null,
    notes: '',
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function rateImage(id: string, rating: Rating | null) {
  await updateDoc(doc(db(), IMAGES, id), { rating, updatedAt: serverTimestamp() })
}

export async function updateImageNotes(id: string, notes: string) {
  await updateDoc(doc(db(), IMAGES, id), { notes, updatedAt: serverTimestamp() })
}

export async function updateImage(
  id: string,
  patch: Partial<Pick<InspirationImage, 'title' | 'imageUrl' | 'sourceUrl' | 'archived' | 'categoryId'>>,
) {
  await updateDoc(doc(db(), IMAGES, id), { ...patch, updatedAt: serverTimestamp() })
}

export async function deleteImage(id: string) {
  await deleteDoc(doc(db(), IMAGES, id))
}
