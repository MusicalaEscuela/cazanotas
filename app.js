"use strict";

/* =========================================================
   Caza Notas · Musicala
   app.js
   Minijuego de entrenamiento auditivo con Web Audio API.
   ========================================================= */

/* -----------------------------
   Elementos del DOM
----------------------------- */

const gameContainer = document.querySelector(".game-container");

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const endScreen = document.getElementById("endScreen");

const startButton = document.getElementById("startGame");
const restartButton = document.getElementById("restartGame");
const playButton = document.getElementById("playNote");

const noteButtons = document.querySelectorAll(".note-btn");

const result = document.getElementById("result");
const scoreText = document.getElementById("score");
const levelText = document.getElementById("level");
const comboText = document.getElementById("combo");
const timeLeftText = document.getElementById("timeLeft");
const timeBarFill = document.getElementById("timeBarFill");

const livesContainer = document.getElementById("livesContainer");

const musiMessage = document.getElementById("musiMessage");
const hiddenNoteSymbol = document.getElementById("hiddenNoteSymbol");

const finalScoreText = document.getElementById("finalScore");
const bestScoreText = document.getElementById("bestScore");
const finalLevelText = document.getElementById("finalLevel");
const finalMessage = document.getElementById("finalMessage");

/* -----------------------------
   Configuración del juego
----------------------------- */

const GAME_DURATION = 60;
const MAX_LIVES = 3;
const BEST_SCORE_KEY = "musicala_caza_notas_best_score";

const NOTE_NAMES = {
  C: "Do",
  D: "Re",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si"
};

const NOTES = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.0,
  A: 440.0,
  B: 493.88
};

const NOTE_KEYS = Object.keys(NOTES);

const LEVELS = [
  {
    level: 1,
    minCorrect: 0,
    name: "Primeros pasos",
    notes: ["C", "D", "E"],
    octaveVariation: false,
    points: 10,
    message: "Nivel 1: Do, Re y Mi. Tranqui, hasta la escala empieza gateando."
  },
  {
    level: 2,
    minCorrect: 4,
    name: "Explorador musical",
    notes: ["C", "D", "E", "F", "G"],
    octaveVariation: false,
    points: 12,
    message: "Nivel 2: entran Fa y Sol. Musi ya se está poniendo serio."
  },
  {
    level: 3,
    minCorrect: 9,
    name: "Cazador de notas",
    notes: ["C", "D", "E", "F", "G", "A", "B"],
    octaveVariation: false,
    points: 15,
    message: "Nivel 3: escala completa. Ahora sí, oído fino activado."
  },
  {
    level: 4,
    minCorrect: 16,
    name: "Oído entrenado",
    notes: ["C", "D", "E", "F", "G", "A", "B"],
    octaveVariation: true,
    points: 18,
    message: "Nivel 4: aparecen notas graves y agudas. La nota se disfraza, qué descarada."
  },
  {
    level: 5,
    minCorrect: 24,
    name: "Maestro Musicala",
    notes: ["C", "D", "E", "F", "G", "A", "B"],
    octaveVariation: true,
    points: 22,
    message: "Nivel 5: modo reto Musicala. Aquí el oído viene a trabajar."
  }
];

const POSITIVE_MESSAGES = [
  "¡Correcto! Musi atrapó la nota. 🎉",
  "¡Eso! Oído afinado y dignidad intacta. ✨",
  "¡Bien! Esa nota no pudo esconderse. 🎵",
  "¡Perfecto! El oído está haciendo la tarea. 💜",
  "¡Qué nota tan bien cazada! 🐾"
];

const WRONG_MESSAGES = [
  "Casi, pero esa nota salió más escurridiza. 😅",
  "No era esa. La nota hizo trampa emocional. 🎧",
  "Ups, no fue esa. Musi igual no juzga... mucho. 🫠",
  "Fallaste esta, pero el oído aprende a punta de intentos. 🎵",
  "No era esa. Respira, escucha y vuelve a cazarla."
];

const START_MESSAGES = [
  "Escucha con atención. Las notas se esconden, pero no son tan brillantes.",
  "Musi está listo. Tú solo no pelees con el botón de escuchar.",
  "Concéntrate: primero escucha, luego responde. La civilización depende de esto."
];

const COMBO_MESSAGES = [
  "¡Combo musical! Esto ya parece entrenamiento serio. 🔥",
  "¡Racha bonita! Musi está aplaudiendo con sus patitas imaginarias. 🎶",
  "¡Combo activo! El oído está despertando, milagro educativo. ✨"
];

/* -----------------------------
   Estado del juego
----------------------------- */

let score = 0;
let combo = 0;
let lives = MAX_LIVES;
let timeLeft = GAME_DURATION;

let totalCorrect = 0;
let totalAnswers = 0;

let currentNote = null;
let currentFrequency = null;
let currentLevel = 1;

let timerId = null;
let isPlaying = false;
let isRoundLocked = false;

let recentNotes = [];

/* -----------------------------
   Audio
----------------------------- */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  return audioCtx;
}

function createEnvelope(ctx, options = {}) {
  const {
    startTime = ctx.currentTime,
    attack = 0.012,
    decay = 0.08,
    sustain = 0.4,
    release = 0.18,
    duration = 0.55,
    volume = 0.18
  } = options;

  const gain = ctx.createGain();
  const safeVolume = Math.max(volume, 0.0001);
  const sustainVolume = Math.max(safeVolume * sustain, 0.0001);

  gain.gain.cancelScheduledValues(startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(safeVolume, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(sustainVolume, startTime + attack + decay);
  gain.gain.setValueAtTime(sustainVolume, startTime + duration);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + release);

  return gain;
}

function playTone(freq, options = {}) {
  const ctx = getAudioContext();

  const {
    delay = 0,
    duration = 0.55,
    release = 0.18,
    volume = 0.16,
    type = "sine",
    detune = 0,
    attack = 0.012,
    decay = 0.08,
    sustain = 0.45
  } = options;

  const startTime = ctx.currentTime + delay;
  const stopTime = startTime + duration + release + 0.05;

  const osc = ctx.createOscillator();
  const gain = createEnvelope(ctx, {
    startTime,
    attack,
    decay,
    sustain,
    release,
    duration,
    volume
  });

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  osc.detune.setValueAtTime(detune, startTime);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(stopTime);
}

function playPrettyNote(freq) {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime;
  const duration = 0.7;
  const release = 0.28;

  const output = createEnvelope(ctx, {
    startTime,
    attack: 0.015,
    decay: 0.12,
    sustain: 0.34,
    release,
    duration,
    volume: 0.2
  });

  output.connect(ctx.destination);

  const voices = [
    {
      frequency: freq,
      type: "triangle",
      gain: 0.78,
      detune: 0
    },
    {
      frequency: freq * 2,
      type: "sine",
      gain: 0.18,
      detune: 4
    },
    {
      frequency: freq * 3,
      type: "sine",
      gain: 0.06,
      detune: -6
    }
  ];

  voices.forEach((voice) => {
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();

    osc.type = voice.type;
    osc.frequency.setValueAtTime(voice.frequency, startTime);
    osc.detune.setValueAtTime(voice.detune, startTime);

    voiceGain.gain.setValueAtTime(voice.gain, startTime);

    osc.connect(voiceGain);
    voiceGain.connect(output);

    osc.start(startTime);
    osc.stop(startTime + duration + release + 0.08);
  });
}

function playStartSound() {
  playTone(523.25, {
    delay: 0,
    duration: 0.14,
    release: 0.1,
    volume: 0.11,
    type: "triangle"
  });

  playTone(659.25, {
    delay: 0.11,
    duration: 0.14,
    release: 0.1,
    volume: 0.11,
    type: "triangle"
  });

  playTone(783.99, {
    delay: 0.22,
    duration: 0.2,
    release: 0.16,
    volume: 0.12,
    type: "triangle"
  });
}

function playCorrectSound() {
  playTone(659.25, {
    delay: 0,
    duration: 0.11,
    release: 0.08,
    volume: 0.11,
    type: "triangle"
  });

  playTone(783.99, {
    delay: 0.08,
    duration: 0.12,
    release: 0.08,
    volume: 0.11,
    type: "triangle"
  });

  playTone(1046.5, {
    delay: 0.17,
    duration: 0.16,
    release: 0.12,
    volume: 0.1,
    type: "sine"
  });
}

function playWrongSound() {
  playTone(246.94, {
    delay: 0,
    duration: 0.16,
    release: 0.08,
    volume: 0.08,
    type: "sawtooth"
  });

  playTone(196.0, {
    delay: 0.13,
    duration: 0.18,
    release: 0.12,
    volume: 0.07,
    type: "triangle"
  });
}

function playComboSound() {
  playTone(523.25, {
    delay: 0,
    duration: 0.09,
    release: 0.08,
    volume: 0.1,
    type: "triangle"
  });

  playTone(659.25, {
    delay: 0.07,
    duration: 0.09,
    release: 0.08,
    volume: 0.1,
    type: "triangle"
  });

  playTone(783.99, {
    delay: 0.14,
    duration: 0.09,
    release: 0.08,
    volume: 0.1,
    type: "triangle"
  });

  playTone(1046.5, {
    delay: 0.21,
    duration: 0.16,
    release: 0.14,
    volume: 0.11,
    type: "sine"
  });
}

function playEndSound() {
  playTone(783.99, {
    delay: 0,
    duration: 0.14,
    release: 0.1,
    volume: 0.09,
    type: "triangle"
  });

  playTone(659.25, {
    delay: 0.13,
    duration: 0.14,
    release: 0.1,
    volume: 0.09,
    type: "triangle"
  });

  playTone(523.25, {
    delay: 0.26,
    duration: 0.28,
    release: 0.2,
    volume: 0.1,
    type: "sine"
  });
}

/* -----------------------------
   Utilidades
----------------------------- */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getBestScore() {
  const value = Number(localStorage.getItem(BEST_SCORE_KEY));
  return Number.isFinite(value) ? value : 0;
}

function setBestScore(value) {
  localStorage.setItem(BEST_SCORE_KEY, String(value));
}

function getLevelConfig() {
  let activeLevel = LEVELS[0];

  for (const level of LEVELS) {
    if (totalCorrect >= level.minCorrect) {
      activeLevel = level;
    }
  }

  return activeLevel;
}

function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function updateMusiMessage(message) {
  if (!musiMessage) return;
  musiMessage.textContent = message;
}

function setResult(message, type = "neutral") {
  if (!result) return;

  result.textContent = message;
  result.classList.remove("is-success", "is-error", "is-combo");

  if (type === "success") {
    result.classList.add("is-success");
  }

  if (type === "error") {
    result.classList.add("is-error");
  }

  if (type === "combo") {
    result.classList.add("is-combo");
  }
}

function showScreen(screenToShow) {
  [startScreen, gameScreen, endScreen].forEach((screen) => {
    if (!screen) return;
    screen.classList.remove("is-active");
  });

  if (screenToShow) {
    screenToShow.classList.add("is-active");
  }
}

function clearButtonStates() {
  noteButtons.forEach((button) => {
    button.classList.remove("is-correct", "is-wrong");
  });
}

function setNoteButtonsDisabled(disabled) {
  noteButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function setPlayButtonDisabled(disabled) {
  if (!playButton) return;
  playButton.disabled = disabled;
}

function updateLives() {
  if (!livesContainer) return;

  const icons = Array.from(livesContainer.querySelectorAll("span"));

  icons.forEach((icon, index) => {
    icon.classList.toggle("is-lost", index >= lives);
    icon.textContent = index < lives ? "💜" : "🤍";
  });
}

function updateTimeBar() {
  if (!timeBarFill) return;

  const percentage = clamp((timeLeft / GAME_DURATION) * 100, 0, 100);
  timeBarFill.style.width = `${percentage}%`;

  if (gameContainer) {
    gameContainer.classList.toggle("is-danger", timeLeft <= 10 && isPlaying);
  }
}

function updateHUD() {
  if (scoreText) scoreText.textContent = String(score);
  if (levelText) levelText.textContent = String(currentLevel);
  if (comboText) comboText.textContent = `x${combo}`;
  if (timeLeftText) timeLeftText.textContent = String(timeLeft);

  updateLives();
  updateTimeBar();
}

function resetHUD() {
  score = 0;
  combo = 0;
  lives = MAX_LIVES;
  timeLeft = GAME_DURATION;
  totalCorrect = 0;
  totalAnswers = 0;
  currentNote = null;
  currentFrequency = null;
  currentLevel = 1;
  recentNotes = [];
  isRoundLocked = false;

  if (hiddenNoteSymbol) {
    hiddenNoteSymbol.textContent = "?";
  }

  clearButtonStates();
  setResult("Presiona escuchar para comenzar.", "neutral");
  updateMusiMessage("¡Hola! Soy Musi. Escucha la nota y elige la respuesta correcta.");
  updateHUD();
}

function calculateRoundPoints() {
  const levelConfig = getLevelConfig();
  const comboBonus = Math.min(combo, 8) * 2;
  const timeBonus = timeLeft > 30 ? 2 : 0;

  return levelConfig.points + comboBonus + timeBonus;
}

function calculateFrequency(noteKey) {
  const baseFrequency = NOTES[noteKey];
  const levelConfig = getLevelConfig();

  if (!levelConfig.octaveVariation) {
    return baseFrequency;
  }

  const octaveOptions = currentLevel >= 5 ? [0.5, 1, 2] : [1, 2];
  const multiplier = getRandomItem(octaveOptions);

  return baseFrequency * multiplier;
}

function pickNextNote() {
  const levelConfig = getLevelConfig();
  const pool = levelConfig.notes;

  let possibleNotes = pool.filter((note) => {
    const recentSameCount = recentNotes.filter((recent) => recent === note).length;
    return recentSameCount < 2;
  });

  if (possibleNotes.length === 0) {
    possibleNotes = pool;
  }

  let picked = getRandomItem(possibleNotes);

  if (pool.length > 1 && picked === currentNote) {
    const alternatives = possibleNotes.filter((note) => note !== currentNote);
    if (alternatives.length > 0) {
      picked = getRandomItem(alternatives);
    }
  }

  recentNotes.push(picked);

  if (recentNotes.length > 4) {
    recentNotes.shift();
  }

  return picked;
}

function updateLevelIfNeeded() {
  const levelConfig = getLevelConfig();
  const previousLevel = currentLevel;

  currentLevel = levelConfig.level;

  if (currentLevel !== previousLevel) {
    updateMusiMessage(levelConfig.message);
    playComboSound();

    if (gameContainer) {
      gameContainer.classList.add("is-celebrating");

      window.setTimeout(() => {
        gameContainer.classList.remove("is-celebrating");
      }, 650);
    }
  }
}

function prepareNextRound(options = {}) {
  const { autoplay = false, delay = 0 } = options;

  window.setTimeout(() => {
    if (!isPlaying) return;

    clearButtonStates();
    setNoteButtonsDisabled(false);
    setPlayButtonDisabled(false);

    currentNote = pickNextNote();
    currentFrequency = calculateFrequency(currentNote);

    if (hiddenNoteSymbol) {
      hiddenNoteSymbol.textContent = "?";
    }

    setResult("¿Qué nota fue?", "neutral");
    isRoundLocked = false;

    if (autoplay) {
      playCurrentNote();
    }
  }, delay);
}

function playCurrentNote() {
  if (!isPlaying) {
    setResult("Primero inicia el juego.", "neutral");
    return;
  }

  if (!currentNote || !currentFrequency) {
    prepareNextRound({ autoplay: true });
    return;
  }

  playPrettyNote(currentFrequency);

  if (hiddenNoteSymbol) {
    hiddenNoteSymbol.textContent = "♪";
  }

  window.setTimeout(() => {
    if (!isPlaying || isRoundLocked) return;

    if (hiddenNoteSymbol) {
      hiddenNoteSymbol.textContent = "?";
    }
  }, 550);

  setResult("Escucha y elige la nota correcta.", "neutral");
}

/* -----------------------------
   Lógica principal
----------------------------- */

function startGame() {
  getAudioContext();
  playStartSound();

  resetHUD();

  isPlaying = true;

  if (gameContainer) {
    gameContainer.classList.remove("is-finished");
    gameContainer.classList.add("is-playing");
  }

  showScreen(gameScreen);
  updateMusiMessage(getRandomMessage(START_MESSAGES));
  setResult("Prepárate...", "neutral");

  setNoteButtonsDisabled(false);
  setPlayButtonDisabled(false);

  startTimer();

  prepareNextRound({
    autoplay: true,
    delay: 450
  });
}

function endGame(reason = "time") {
  if (!isPlaying) return;

  isPlaying = false;
  isRoundLocked = true;

  stopTimer();
  clearButtonStates();
  setNoteButtonsDisabled(true);
  setPlayButtonDisabled(true);

  if (gameContainer) {
    gameContainer.classList.remove("is-playing", "is-danger", "is-celebrating");
    gameContainer.classList.add("is-finished");
  }

  const previousBest = getBestScore();
  const newBest = Math.max(previousBest, score);

  if (newBest > previousBest) {
    setBestScore(newBest);
  }

  const accuracy = totalAnswers > 0
    ? Math.round((totalCorrect / totalAnswers) * 100)
    : 0;

  if (finalScoreText) finalScoreText.textContent = String(score);
  if (bestScoreText) bestScoreText.textContent = String(newBest);
  if (finalLevelText) finalLevelText.textContent = String(currentLevel);

  if (finalMessage) {
    finalMessage.textContent = buildFinalMessage(reason, accuracy, newBest > previousBest);
  }

  if (hiddenNoteSymbol) {
    hiddenNoteSymbol.textContent = "🏆";
  }

  updateMusiMessage("Ronda terminada. Musi ya guardó el marcador, porque alguien aquí sí es organizado.");

  playEndSound();
  updateHUD();
  showScreen(endScreen);
}

function buildFinalMessage(reason, accuracy, hasNewRecord) {
  if (hasNewRecord) {
    return `¡Nuevo récord! Lograste ${score} puntos con ${accuracy}% de precisión. Musi está fingiendo calma, pero está feliz.`;
  }

  if (reason === "lives") {
    return `Te quedaste sin vidas con ${score} puntos y ${accuracy}% de precisión. Las notas estuvieron intensas, las muy descaradas.`;
  }

  if (score >= 260) {
    return `¡Tremendo resultado! Hiciste ${score} puntos con ${accuracy}% de precisión. Ese oído vino afinado.`;
  }

  if (score >= 140) {
    return `Buen juego: ${score} puntos y ${accuracy}% de precisión. Ya se siente progreso musical.`;
  }

  return `Hiciste ${score} puntos con ${accuracy}% de precisión. Buen inicio: el oído mejora jugando, no mirando el techo.`;
}

function startTimer() {
  stopTimer();

  timerId = window.setInterval(() => {
    if (!isPlaying) return;

    timeLeft -= 1;

    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHUD();
      endGame("time");
      return;
    }

    updateHUD();
  }, 1000);
}

function stopTimer() {
  if (!timerId) return;

  window.clearInterval(timerId);
  timerId = null;
}

function handleAnswer(button) {
  if (!isPlaying) {
    setResult("Primero inicia el juego.", "neutral");
    return;
  }

  if (isRoundLocked) return;

  if (!currentNote) {
    setResult("Primero escucha la nota.", "neutral");
    updateMusiMessage("Primero hay que escuchar. Es un juego musical, no adivinación con WiFi.");
    return;
  }

  const selectedNote = button.dataset.note;

  if (!selectedNote) return;

  isRoundLocked = true;
  totalAnswers += 1;

  setNoteButtonsDisabled(true);
  setPlayButtonDisabled(true);

  const isCorrect = selectedNote === currentNote;
  const correctButton = document.querySelector(`.note-btn[data-note="${currentNote}"]`);

  if (isCorrect) {
    handleCorrectAnswer(button);
  } else {
    handleWrongAnswer(button, correctButton);
  }

  updateLevelIfNeeded();
  updateHUD();

  if (lives <= 0) {
    window.setTimeout(() => {
      endGame("lives");
    }, 900);
    return;
  }

  prepareNextRound({
    autoplay: true,
    delay: isCorrect ? 820 : 1100
  });
}

function handleCorrectAnswer(button) {
  combo += 1;
  totalCorrect += 1;

  const gainedPoints = calculateRoundPoints();
  score += gainedPoints;

  button.classList.add("is-correct");

  if (hiddenNoteSymbol) {
    hiddenNoteSymbol.textContent = NOTE_NAMES[currentNote] || currentNote;
  }

  if (combo >= 3 && combo % 3 === 0) {
    score += 8;
    setResult(`¡Combo x${combo}! +${gainedPoints + 8} puntos 🔥`, "combo");
    updateMusiMessage(getRandomMessage(COMBO_MESSAGES));
    playComboSound();
  } else {
    setResult(`${getRandomMessage(POSITIVE_MESSAGES)} +${gainedPoints} puntos`, "success");
    updateMusiMessage(`Era ${NOTE_NAMES[currentNote]}. ¡Bien cazada!`);
    playCorrectSound();
  }

  if (gameContainer) {
    gameContainer.classList.add("is-celebrating");

    window.setTimeout(() => {
      gameContainer.classList.remove("is-celebrating");
    }, 520);
  }
}

function handleWrongAnswer(button, correctButton) {
  combo = 0;
  lives -= 1;

  button.classList.add("is-wrong");

  if (correctButton) {
    correctButton.classList.add("is-correct");
  }

  if (hiddenNoteSymbol) {
    hiddenNoteSymbol.textContent = NOTE_NAMES[currentNote] || currentNote;
  }

  setResult(`${getRandomMessage(WRONG_MESSAGES)} Era ${NOTE_NAMES[currentNote]}.`, "error");
  updateMusiMessage(`Era ${NOTE_NAMES[currentNote]}. Escúchala de nuevo mentalmente, como si el cerebro colaborara.`);
  playWrongSound();
}

/* -----------------------------
   Eventos
----------------------------- */

if (startButton) {
  startButton.addEventListener("click", startGame);
}

if (restartButton) {
  restartButton.addEventListener("click", startGame);
}

if (playButton) {
  playButton.addEventListener("click", () => {
    getAudioContext();

    if (!isPlaying) {
      setResult("Primero inicia el juego.", "neutral");
      updateMusiMessage("Dale a iniciar primero. La nota no va a salir sola, aunque sería cómodo.");
      return;
    }

    playCurrentNote();
  });
}

noteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    getAudioContext();
    handleAnswer(button);
  });
});

/* -----------------------------
   Inicio visual
----------------------------- */

function init() {
  resetHUD();
  showScreen(startScreen);

  setNoteButtonsDisabled(true);
  setPlayButtonDisabled(true);

  const best = getBestScore();

  if (bestScoreText) {
    bestScoreText.textContent = String(best);
  }

  updateMusiMessage("¡Hola! Soy Musi. Escucha las notas y ayúdame a cazarlas antes de que se acabe el tiempo.");
}

init();