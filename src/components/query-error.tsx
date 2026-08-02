import { buttonVariants } from '@/components/ui/button'

/**
 * Firestore's missing-index error embeds a console link that creates the
 * index in one click — surface it instead of hiding the failure.
 */
export function QueryError({ error }: { error: Error }) {
  const indexLink = error.message.match(/https:\/\/console\.firebase\.google\.com\S+/)?.[0]

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-4xl">⚠️</p>
      <p className="font-medium">Couldn&apos;t load images.</p>
      {indexLink ? (
        <>
          <p className="max-w-sm text-sm text-muted-foreground">
            Firestore needs a one-time index for this query. Create it (as the Firebase project
            owner), wait a minute, then refresh.
          </p>
          <a href={indexLink} target="_blank" rel="noreferrer" className={buttonVariants()}>
            Create index
          </a>
        </>
      ) : (
        <p className="max-w-sm break-words text-sm text-muted-foreground">{error.message}</p>
      )}
    </div>
  )
}
