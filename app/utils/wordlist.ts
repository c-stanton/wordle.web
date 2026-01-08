export const VALID_GUESSES = [
  'APPLE', 'STIFF', 'ERASE', 'COCOA', 'MUMMY', 
  'PAPER', 'GEESE', 'SASSY', 'LULLS', 'EERIE',
  'BEACH', 'BRAIN', 'BREAD', 'BRUSH', 'CHAIR', 
  'CHEST', 'CHORD', 'CLICK', 'CLOCK', 'CLOUD'
]

export const getRandomWord = () => {
  return VALID_GUESSES[Math.floor(Math.random() * VALID_GUESSES.length)]
}