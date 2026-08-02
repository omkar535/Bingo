export const LETTERS = ['B', 'I', 'N', 'G', 'O']

// Fisher-Yates shuffle of 1-25
export function generateRandomGrid() {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1)
  for (let i = numbers.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
  }
  return numbers
}

// Each column of the 5x5 grid (rendered row-major) maps to a letter.
// index % 5 === 0 -> B column, 1 -> I, 2 -> N, 3 -> G, 4 -> O
function rowsOf(grid) {
  const rows = []
  for (let r = 0; r < 5; r += 1) {
    rows.push(grid.slice(r * 5, r * 5 + 5))
  }
  return rows
}

function colsOf(grid) {
  const cols = []
  for (let c = 0; c < 5; c += 1) {
    cols.push([grid[c], grid[c + 5], grid[c + 10], grid[c + 15], grid[c + 20]])
  }
  return cols
}

function diagonalsOf(grid) {
  const main = [grid[0], grid[6], grid[12], grid[18], grid[24]]
  const anti = [grid[4], grid[8], grid[12], grid[16], grid[20]]
  return [main, anti]
}

function isLineComplete(line, marked) {
  return line.every((n) => marked.includes(n))
}

/**
 * Determine which BINGO letters should be struck given the player's
 * grid and the set of numbers they've marked. A letter is struck
 * when at least one completed line (row, column, or diagonal)
 * "belongs" to that letter's position, OR when any line at all is
 * completed we strike letters left-to-right in order of completion
 * count. To keep it intuitive: each completed row/column/diagonal
 * strikes one new letter, in B-I-N-G-O order, until all completed
 * lines are accounted for.
 */
export function computeStruckLetters(grid, markedNumbers) {
  const rows = rowsOf(grid)
  const cols = colsOf(grid)
  const diags = diagonalsOf(grid)

  const completedLines = [...rows, ...cols, ...diags].filter((line) =>
    isLineComplete(line, markedNumbers)
  )

  const struckCount = Math.min(completedLines.length, LETTERS.length)
  return LETTERS.slice(0, struckCount)
}

export function hasFullBingo(struckLetters) {
  return struckLetters.length === LETTERS.length
}

export function rankLabel(rank) {
  if (rank === 1) return 'Gold'
  if (rank === 2) return 'Silver'
  if (rank === 3) return 'Bronze'
  return `${rank}th`
}
