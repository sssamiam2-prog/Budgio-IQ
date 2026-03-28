import type { ReactNode } from 'react'

type Props = {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, open, onClose, children }: Props) {
  if (!open) return null
  return (
    <div className="modal-root" role="dialog" aria-modal aria-labelledby="modal-title">
      <button
        type="button"
        className="modal-root__backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="modal-root__panel">
        <div className="modal-root__head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="modal-root__close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-root__body">{children}</div>
      </div>
    </div>
  )
}
