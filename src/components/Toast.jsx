import { IconCheck, IconWarning } from './Icons'

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.type}`}
          onClick={() => onDismiss(t.id)}
          title="Dismiss"
        >
          {t.type === 'error' ? <IconWarning size={17} /> : <IconCheck size={17} />}
          {t.message}
        </div>
      ))}
    </div>
  )
}
