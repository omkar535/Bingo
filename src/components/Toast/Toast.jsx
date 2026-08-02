import './Toast.css'

export default function Toast({ message, type = 'info', onClose }) {
  return (
    <div className={`toast toast-${type}`} role="alert">
      <span>{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss">
        &times;
      </button>
    </div>
  )
}
