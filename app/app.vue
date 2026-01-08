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
    snackbarMsg.value = `👎The word was ${solution.value}. 👎`
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
      <v-app-bar-title class="wordle-title ml-5">
        Wordle
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <client-only>
        <v-btn 
          :icon="themeIcon" 
          @click="toggleTheme" 
          @mousedown.prevent
        ></v-btn>
      </client-only>
      <v-btn 
        icon="mdi-restart"
        @click="resetGame"
        @mousedown.prevent
      ></v-btn>
    </v-app-bar>

    <v-main>
      <v-container class="py-8">
        <div style="max-width: 330px; margin: 0 auto;">
          <v-row 
            v-for="(row, i) in board" 
            :key="i" 
            justify="center" 
            no-gutters 
            style="gap: 8px;" 
            class="mb-2"
          >
            <v-col 
              v-for="(cell, j) in row" 
              :key="j" 
              cols="auto"
            >
              <v-sheet
                height="58"
                width="58"
                class="tile-sheet"
                :class="{ 
                  'tile-active': cell.letter !== '',
                  'tile-flip': cell.status !== 'default' 
                }"
                elevation="0"
                :style="{ transitionDelay: cell.status !== 'default' ? `${j * 150}ms` : '0ms' }"
              >
                <div class="tile-inner">
                  <div class="tile-front d-flex align-center justify-center text-h4 font-weight-bold">
                    {{ cell.letter }}
                  </div>
                  <div 
                    class="tile-back d-flex align-center justify-center text-h4 font-weight-bold text-white"
                    :class="cell.status"
                  >
                    {{ cell.letter }}
                  </div>
                </div>
              </v-sheet>
            </v-col>
          </v-row>
        </div>
      </v-container>

      <v-container style="max-width: 600px;">
        <v-row v-for="(row, i) in rows" :key="i" justify="center" dense>
          <v-col v-for="key in row" :key="key" cols="auto" class="pa-1">
            <v-btn
              :min-width="key.length > 1 ? '65' : '40'"
              height="58"
              class="text-caption font-weight-bold px-2"
              :class="{ 'text-white': letterStates[key] }" 
              :color="letterStates[key] === 'correct' ? 'green' : letterStates[key] === 'present' ? 'yellow-darken-2' : letterStates[key] === 'absent' ? 'grey-darken-4' : 'grey-darken-2'"
              @click="handleInput(key)"
              @mousedown.prevent
            >
              <template v-if="key === 'BACKSPACE'">
                <v-icon icon="mdi-backspace-outline" size="20"></v-icon>
              </template>
              <template v-else>{{ key }}</template>
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar v-model="snackbar" location="top" :timeout="gameOver ? -1 : 3000" color="grey-darken-4">
      <div class="text-center font-weight-bold mb-2">{{ snackbarMsg }}</div>
      <template v-if="gameOver" v-slot:actions>
        <v-btn color="primary" variant="elevated" @click="resetGame">New Game</v-btn>
      </template>
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
  font-family: 'Libre Franklin', sans-serif !important;
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

/* Colors */
.correct { background-color: #4caf50; }
.present { background-color: #fbc02d; }
.absent  { background-color: #424242; }
</style>