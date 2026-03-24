const playButton = document.getElementById("playNote")
const noteButtons = document.querySelectorAll(".note-btn")
const result = document.getElementById("result")
const scoreText = document.getElementById("score")

let score = 0
let currentNote = null

const notes = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.00,
  A: 440.00,
  B: 493.88
}

const noteKeys = Object.keys(notes)

function playFrequency(freq) {
  
  const audioCtx = new(window.AudioContext || window.webkitAudioContext)()
  
  const osc = audioCtx.createOscillator()
  osc.type = "sine"
  osc.frequency.value = freq
  
  osc.connect(audioCtx.destination)
  
  osc.start()
  
  setTimeout(() => {
    osc.stop()
  }, 800)
  
}

playButton.addEventListener("click", () => {
  
  const randomIndex = Math.floor(Math.random() * noteKeys.length)
  
  currentNote = noteKeys[randomIndex]
  
  playFrequency(notes[currentNote])
  
  result.textContent = "¿Qué nota fue?"
  
})

noteButtons.forEach(btn => {
  
  btn.addEventListener("click", () => {
    
    if (!currentNote) {
      result.textContent = "Primero escucha la nota"
      return
    }
    
    const selected = btn.dataset.note
    
    if (selected === currentNote) {
      
      score++
      scoreText.textContent = score
      result.textContent = "¡Correcto! 🎉"
      
    } else {
      
      result.textContent = "No era esa 😅"
      
    }
    
  })
  
})