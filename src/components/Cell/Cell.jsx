import './Cell.css'

export default function Cell({ number, isMarked, isClickable, onClick }) {
  return (
    <button
      type="button"
      className={`bingo-cell ${isMarked ? 'bingo-cell-marked' : ''} ${
        isClickable ? 'bingo-cell-clickable' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
    >
      {number ?? ''}
    </button>
  )
}
