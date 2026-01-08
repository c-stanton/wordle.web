<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useTheme } from 'vuetify'
import { getRandomWord, VALID_GUESSES } from './utils/wordlist'

// <><><><> Toggle Theme <><><><>
const theme = useTheme()

const themeIcon = computed(() => {
  return theme.global.name.value === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'
})

function toggleTheme() {
  const isDark = theme.global.name.value === 'dark'
  const newTheme = isDark ? 'light' : 'dark'
  theme.global.name.value = newTheme
  localStorage.setItem('user-theme', newTheme)
}

// <><><><> Board State <><><><>
const solution = ref(getRandomWord())
const board = ref(
  Array.from({ length: 6 }, () => 
    Array.from({ length: 5 }, () => ({ letter: '', status: 'default' }))
  )
)
const currentRow = ref(0)
const currentCol = ref(0)
const gameOver = ref(false)
const letterStates = ref({})

// <><><><> UI State <><><><>
const snackbar = ref(false)
const snackbarMsg = ref('')

const rows = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
]

// <><><><> Game Logic <><><><>
const resetGame = () => {
  solution.value = getRandomWord()
  board.value = Array.from({ length: 6 }, () => 
    Array.from({ length: 5 }, () => ({ letter: '', status: 'default' }))
  )
  letterStates.value = {}
  currentRow.value = 0
  currentCol.value = 0
  gameOver.value = false
  snackbar.value = false
}

const checkWord = () => {
  const currentGuess = board.value[currentRow.value]
  const guessString = currentGuess.map(cell => cell.letter).join('')
  
  // 1. Solution Letter Counts
  const solutionArray = solution.value.split('')
  const solutionCounts = {}
  solutionArray.forEach(l => solutionCounts[l] = (solutionCounts[l] || 0) + 1)

  // 2. Pass 1: Mark Correct (Green) on Board
  let tempCounts = { ...solutionCounts }
  currentGuess.forEach((cell, i) => {
    if (cell.letter === solution.value[i]) {
      cell.status = 'correct'
      tempCounts[cell.letter]--
    }
  })

  // 3. Pass 2: Mark Present (Yellow) or Absent (Grey) on Board
  currentGuess.forEach((cell, i) => {
    if (cell.status === 'correct') return
    if (solution.value.includes(cell.letter) && tempCounts[cell.letter] > 0) {
      cell.status = 'present'
      tempCounts[cell.letter]--
    } else {
      cell.status = 'absent'
    }
  })

  // 4. Keyboard Update with Exact Counts
  currentGuess.forEach((cell) => {
    const letter = cell.letter
    const totalNeeded = solutionCounts[letter] || 0
    
    const uniqueGreenPositions = new Set()
    board.value.forEach(row => {
      row.forEach((tile, index) => {
        if (tile.letter === letter && tile.status === 'correct') {
          uniqueGreenPositions.add(index)
        }
      })
    })

    if (uniqueGreenPositions.size === totalNeeded && totalNeeded > 0) {
      letterStates.value[letter] = 'correct'
    } else if (solution.value.includes(letter)) {
      if (letterStates.value[letter] !== 'correct') {
        letterStates.value[letter] = 'present'
      }
    } else {
      if (!letterStates.value[letter]) letterStates.value[letter] = 'absent'
    }
  })

  if (guessString === solution.value) {
    gameOver.value = true
    snackbarMsg.value = '🎉 You guessed the word! 🎉'
    snackbar.value = true
  } else if (currentRow.value === 5) {
    gameOver.value = true
    snackbarMsg.value = `💔 The word was ${solution.value}. 💔`
    snackbar.value = true
  } else {
    currentRow.value++
    currentCol.value = 0
  }
}

const handleInput = (e) => {
  if (gameOver.value) {
     return
  }

  if (e instanceof KeyboardEvent && e.key == 'Enter') {
    e.preventDefault()
  }

  const key = (typeof e === 'string' ? e : e.key).toUpperCase()
  
  if (key === 'ENTER') {
    if (currentCol.value === 5) checkWord()
  } else if (key === 'BACKSPACE' || key === 'DELETE') {
    if (currentCol.value > 0) {
      currentCol.value--
      board.value[currentRow.value][currentCol.value].letter = ''
    }
  } else if (/^[A-Z]$/.test(key) && currentCol.value < 5) {
    board.value[currentRow.value][currentCol.value].letter = key
    currentCol.value++
  }
}

// <><><><> Event Listeners <><><><>
onMounted(() => { 
  window.addEventListener('keydown', handleInput)

  const savedTheme = localStorage.getItem('user-theme')
  if (savedTheme) {
    theme.global.name.value = savedTheme
  }
})

onUnmounted(() => window.removeEventListener('keydown', handleInput))
</script>

<template>
  <v-app>
    <v-app-bar flat border>
      <v-app-bar-title class="wordle-title ml-4">Wordle</v-app-bar-title>
      <v-spacer></v-spacer>
      <client-only>
        <v-btn :icon="themeIcon" @click="toggleTheme" @mousedown.prevent></v-btn>
      </client-only>
      <v-btn icon="mdi-restart" @click="resetGame" @mousedown.prevent></v-btn>
    </v-app-bar>

    <v-main class="d-flex flex-column" style="height: calc(100vh - 64px); overflow: hidden;">
      <v-spacer></v-spacer>

      <v-container class="py-2">
        <div class="board-wrapper">
          <v-row v-for="(row, i) in board" :key="i" justify="center" no-gutters class="board-row mb-2" style="gap: 8px;">
            <v-col v-for="(cell, j) in row" :key="j" cols="auto">
              <v-sheet class="tile-sheet" :class="{ 'tile-active': cell.letter !== '', 'tile-flip': cell.status !== 'default' }" elevation="0" :style="{ transitionDelay: cell.status !== 'default' ? `${j * 150}ms` : '0ms' }">
                <div class="tile-inner">
                  <div class="tile-front d-flex align-center justify-center font-weight-bold">{{ cell.letter }}</div>
                  <div class="tile-back d-flex align-center justify-center font-weight-bold text-white" :class="cell.status">{{ cell.letter }}</div>
                </div>
              </v-sheet>
            </v-col>
          </v-row>
        </div>
      </v-container>

      <v-spacer></v-spacer>

      <v-container class="keyboard-container pb-8 px-1">
        <div v-for="(row, i) in rows" :key="i" class="keyboard-row">
          <div 
            v-for="key in row" 
            :key="key" 
            class="key-wrapper"
            :class="{ 'wide-wrapper': key.length > 1 }"
          >
            <v-btn 
              block
              class="keyboard-btn font-weight-bold" 
              :class="{ 'text-white': letterStates[key] }" 
              :color="letterStates[key] === 'correct' ? 'green' : letterStates[key] === 'present' ? 'yellow-darken-2' : letterStates[key] === 'absent' ? 'grey-darken-4' : 'grey-darken-2'" 
              @click="handleInput(key)" 
              @mousedown.prevent
            >
              <template v-if="key === 'BACKSPACE'"><v-icon icon="mdi-backspace-outline" size="16"></v-icon></template>
              <template v-else>{{ key }}</template>
            </v-btn>
          </div>
        </div>
      </v-container>

      <v-fade-transition>
        <div v-if="gameOver" class="glass-overlay"></div>
      </v-fade-transition>
    </v-main>

    <v-snackbar 
      v-model="snackbar" 
      location="center" 
      :timeout="gameOver ? -1 : 3000" 
      color="#212121"
      elevation="24"
      class="game-over-snackbar"
    >
      <div class="d-flex flex-column align-center pa-2">
        <div class="text-center font-weight-bold text-h6 mb-4">
          {{ snackbarMsg }}
        </div>
        <v-btn 
          v-if="gameOver" 
          class="play-again-btn px-10"
          variant="flat"
          rounded="xl"
          size="large"
          @click="resetGame"
        >
          Play Again
        </v-btn>
      </div>
    </v-snackbar>
  </v-app>
</template>

<style>
.wordle-title {
  font-family: 'Grand Hotel', cursive !important;
  text-transform: none !important; 
  font-size: 3.2rem !important;   
  letter-spacing: 0.5px !important;
  line-height: 1 !important;
  font-weight: 400 !important;
}

.v-application,
.v-btn,
.tile-front, 
.tile-back {
  font-family: 'Libre Franklin', sans-serif !important;
}

.tile-sheet {
  perspective: 1000px;
  background: transparent !important;
  border: none !important;
  width: 58px;
  height: 58px;
}

.tile-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.45, 0.05, 0.55, 0.95);
  transform-style: preserve-3d;
}

.tile-flip .tile-inner {
  transform: rotateX(180deg);
}

.tile-front, .tile-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 4px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-front {
  border: 2px solid #3a3a3c;
}

.v-theme--light .tile-front {
  border-color: #d3d6da;
}

.tile-active .tile-front {
  border-color: #818384;
}

.tile-back {
  transform: rotateX(180deg);
}

/* --- Wordle Colors --- */
.correct { background-color: #4caf50; }
.present { background-color: #fbc02d; }
.absent  { background-color: #424242; }

.glass-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 5;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.3);
  pointer-events: none;
  transition: opacity 0.6s ease;
}

.v-theme--dark .glass-overlay {
  background: rgba(18, 18, 18, 0.5);
  backdrop-filter: blur(12px) brightness(0.8);
  -webkit-backdrop-filter: blur(12px) brightness(0.8);
}

.play-again-btn {
  background-color: rgb(76, 175, 80) !important; 
  color: white !important;
  font-weight: 700 !important;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.play-again-btn:hover {
  background-color: rgb(67, 160, 71) !important;
  transform: translateY(-2px);
  letter-spacing: 2px;
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

.play-again-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 10px rgba(76, 175, 80, 0.3);
}

.game-over-snackbar :deep(.v-snackbar__content) {
  padding: 24px !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* --- Desktop & Mobile Shared Base --- */
.keyboard-row {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 500px; /* Essential for Desktop */
  margin: 0 auto 8px auto !important;
  touch-action: none;
}

.key-wrapper {
  /* Default Desktop Width */
  flex: 0 0 44px; 
  height: 58px;
  margin: 0 3px;
}

.wide-wrapper {
  flex: 0 0 65px; /* Enter/Backspace size */
}

.keyboard-btn {
  height: 100% !important;
  width: 100% !important;
  min-width: 0 !important;
  padding: 0 !important;
  text-transform: uppercase;
}

/* --- Mobile Fix --- */
@media (max-width: 600px) {
  .keyboard-row {
    max-width: 100%;
    margin-bottom: 5px !important;
    padding: 0 2px;
  }

  .key-wrapper {
    /* Magic Math: 10% width minus the 2px margin */
    flex: 1 1 calc(10% - 2px) !important;
    margin: 0 1px !important;
    height: 45px;
  }

  .wide-wrapper {
    /* Enter/Backspace take up 1.5x the space of a letter */
    flex: 1.5 1 0 !important;
  }

  .keyboard-btn {
    font-size: 0.70rem !important;
  }
}

/* iOS Home Bar spacing */
.pb-8 {
    padding-bottom: calc(32px + env(safe-area-inset-bottom)) !important;
}

.game-over-snackbar :deep(.v-snackbar__content) {
  padding: 40px 24px !important;
  border-radius: 24px !important;
  border: 1px solid rgba(76, 175, 80, 0.4) !important;
  background: #121212 !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7) !important;
  max-width: 90vw !important;
  width: 340px !important;
}

.text-overline {
  font-family: 'Libre Franklin', sans-serif !important;
  font-size: 0.75rem !important;
  text-transform: uppercase;
}
</style>