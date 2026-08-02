import { X } from 'lucide-react'
import { useEffect, type ComponentProps, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/** Minimal accessible dialog: portal, backdrop click and Escape to close, body scroll lock. */
function Dialog({ open, onClose, children }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-background p-5 shadow-lg sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-sm p-2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>,
    document.body,
  )
}

function DialogTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('pr-10 text-lg font-semibold', className)} {...props} />
}

export { Dialog, DialogTitle }
