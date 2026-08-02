# Inbi Decides ⭐

A tiny PWA for deciding together: one person (admin) collects inspiration images
(Pinterest, Google Images, any website), the other (Inbi) rates them 1–5 stars.

- **Zero hosting cost** — static site on GitHub Pages
- **Zero backend** — Firestore + Firebase Auth straight from the browser
- **Zero image storage** — only URLs and metadata are saved
- **Installable** — behaves like a native app on Android and iPhone

## Stack

React 19 · TypeScript · Vite · React Router · TanStack Query · TailwindCSS 4 ·
shadcn-style UI · React Hook Form · Zod · Firebase (Auth + Firestore) · vite-plugin-pwa

## One-time setup

### 1. Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and create a project
   (e.g. `inbi-decides`). Analytics not needed.
2. **Authentication → Sign-in method → Google → Enable.**
3. **Authentication → Settings → Authorized domains** — add `<your-user>.github.io`.
4. **Firestore Database → Create database** (production mode, any region).
5. **Project settings → Your apps → Web app (</>)** — register an app, copy the config values.

### 2. Firestore security rules and indexes

Either paste [firestore.rules](firestore.rules) into
**Firestore → Rules** in the console, or use the CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore --project <your-project-id>
```

This also creates the two composite indexes from
[firestore.indexes.json](firestore.indexes.json) (voting queue + gallery ordering).
If you skip the CLI, the app's first queries will fail with a link that creates
each index in one click — that works too.

### 3. User roles

Sign in to the app once with each Google account, then in
**Firestore → Data** create a collection `users` with one document per user:

- Document ID: the user's UID (visible under **Authentication → Users**)
- Field: `role` = `"admin"` (you) or `"voter"` (Inbi)

No role → the app shows a "waiting for role" screen after sign-in.

### 4. GitHub Pages + secrets

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Repo **Settings → Secrets and variables → Actions** — add the six values from step 1.5:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Every push to `main` builds and deploys automatically
([deploy.yml](.github/workflows/deploy.yml)).

## Local development

```bash
cp .env.example .env.local   # fill in the Firebase values
npm install
npm run dev
```

Add `localhost` to Firebase authorized domains (it is by default).

- `npm test` — unit tests (URL processing)
- `npm run build` — type-check + production build
- `npm run lint` — oxlint
- `node scripts/generate-icons.mjs` — regenerate PWA icons

## How it works

- **Home** lists categories with a "N new" badge (`rating == null` count).
- **Voting** shows exactly one image. Tapping a star saves and advances instantly
  (optimistic update, next image prefetched). Skip leaves `rating = null` so the
  image returns later. Keyboard: `1–5` to rate, `←`/`→` to skip.
- **Gallery** groups images by stars (5★ → 1★ → unrated) with search
  (title/notes) and filters (stars, unrated, archived). Tap an image to re-rate,
  edit notes, open the source, archive, or delete (admin).
- **Admin** creates categories and imports images by pasting one or many URLs.
  Direct image links and Google Images links resolve locally; other pages go
  through the free [microlink.io](https://microlink.io) API to read OpenGraph
  metadata (title + image). When extraction fails the URL is saved as-is and
  flagged so you can edit it later — nothing is lost.
- **Archive, never delete** — archived images disappear from voting but stay
  available in the gallery behind the "Archived" filter.

### Data model

```
users/{uid}          role: 'admin' | 'voter'
categories/{id}      name, emoji, createdAt, archived, order
images/{id}          categoryId, imageUrl, sourceUrl, title,
                     rating (null | 1-5), notes, createdAt, updatedAt, archived
```

Voters can only update `rating`, `notes` and `archived` on images —
enforced by [firestore.rules](firestore.rules).

## PWA install

- **Android/Chrome**: menu → *Add to home screen* (or the install prompt).
- **iPhone/Safari**: share sheet → *Add to Home Screen*.

The app shell works offline; already-viewed images are served from cache.

## Future ideas (not in MVP)

Browser extension, mobile share target, per-voter ratings, AI style tags,
finalists list, duplicate detection, side-by-side compare, stats dashboard.
