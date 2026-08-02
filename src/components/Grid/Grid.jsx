import { LETTERS } from '../../utils/bingoLogic'
import Cell from '../Cell/Cell'
import './Grid.css'

export default function Grid({
  grid,
  markedNumbers = [],
  struckLetters = [],
  isSelectable = false,
  onSelectNumber,
}) {
  return (
    <div className="bingo-grid-wrap">
      <div className="bingo-letters">
        {LETTERS.map((letter) => (
          <span
            key={letter}
            className={`bingo-letter ${struckLetters.includes(letter) ? 'bingo-letter-struck' : ''}`}
          >
            {letter}
          </span>
        ))}
      </div>
      <div className="bingo-grid">
        {grid.map((number, idx) => {
          const isMarked = markedNumbers.includes(number)
          return (
            <Cell
              key={`${number}-${idx}`}
              number={number}
              isMarked={isMarked}
              isClickable={isSelectable && !isMarked}
              onClick={() => onSelectNumber?.(number)}
            />
          )
        })}
      </div>
    </div>
  )
}
