// 1. GLOBAL SETTINGS & DATA
let dictionary = [];
let currentLevel = 0;
let foundWords = [];
let timeLeft = 120;
let timerInterval;

const DICT_URL = 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt';

// The Level List - The game moves through these one by one
const gameLevels = [
    { master: "PLANET" },
    { master: "GARDEN" },
    { master: "THUNDER" },
    { master: "BRIGHT" },
    { master: "MOUNTAIN" },
    { master: "UNIVERSE" },
    { master: "KITCHEN" }
];

// 2. ELEMENT SELECTORS
const jumbledDisplay = document.getElementById('jumbled-container');
const gridContainer = document.getElementById('word-grid-container');
const inputField = document.getElementById('word-input');
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');
const nextBtn = document.getElementById('next-level-btn');
const shuffleBtn = document.getElementById('shuffle-btn');

// 3. DICTIONARY LOADER (Starts the game automatically when done)
fetch(DICT_URL)
    .then(response => response.text())
    .then(data => {
        dictionary = data.toUpperCase().split('\n').map(w => w.trim());
        console.log("Dictionary Loaded! Starting Game...");
        initGame(); 
    });

// 4. GAME ENGINE (The Fix for the Planet Loop)
function initGame() {
    // If we reach the end of the list, restart from the beginning
    if (currentLevel >= gameLevels.length) {
        alert("You've finished all levels! Restarting from Level 1.");
        currentLevel = 0;
    }

    // Reset all game states for the NEW word
    foundWords = [];
    inputField.value = "";
    inputField.disabled = false;
    inputField.placeholder = "Type word & press Enter";
    
    // UI Cleanup
    nextBtn.classList.add('hidden');
    gridContainer.innerHTML = `<p style='color: #aaa;'>Level ${currentLevel + 1}: Find words!</p>`;
    scoreDisplay.innerText = "0"; 

    // Hide modal if it's visible
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.classList.add('hidden');

    // Load the NEW jumbled letters
    shuffleLetters();
    startTimer();
}

function shuffleLetters() {
    // This looks at currentLevel (0, 1, 2...) to pick the word
    const master = gameLevels[currentLevel].master;
    const scrambled = master.split('').sort(() => Math.random() - 0.5).join(' ');
    jumbledDisplay.innerText = scrambled;
}

// 5. SCORE LOGIC
function updateScore(wordLength) {
    let currentScore = parseInt(scoreDisplay.innerText) || 0;
    let points = 10;
    if (wordLength === 4) points = 20;
    if (wordLength === 5) points = 40;
    if (wordLength >= 6) points = 100;
    
    scoreDisplay.innerText = currentScore + points;
}

// 6. UI & VALIDATION
function addWordToUI(word) {
    if (foundWords.length === 1) gridContainer.innerHTML = "";
    const row = document.createElement('div');
    row.className = "word-row";
    for (let char of word) {
        const slot = document.createElement('div');
        slot.className = "letter-slot revealed";
        slot.innerText = char;
        row.appendChild(slot);
    }
    gridContainer.appendChild(row);
    gridContainer.scrollTop = gridContainer.scrollHeight;
}

function isValidAnagram(guess, master) {
    let masterLetters = master.split('');
    for (let char of guess.split('')) {
        let index = masterLetters.indexOf(char);
        if (index === -1) return false; 
        masterLetters.splice(index, 1); 
    }
    return true;
}

// 7. INTERACTION (Enter Key)
inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const guess = inputField.value.toUpperCase().trim();
        const master = gameLevels[currentLevel].master;

        if (guess.length >= 3 && dictionary.includes(guess) && isValidAnagram(guess, master)) {
            if (!foundWords.includes(guess)) {
                foundWords.push(guess);
                addWordToUI(guess);
                updateScore(guess.length); // Update the score here
                inputField.value = "";
            } else {
                inputField.value = "";
            }
        } else {
            // Visual feedback for wrong word
            inputField.style.backgroundColor = "#ffcccc";
            setTimeout(() => inputField.style.backgroundColor = "white", 300);
            inputField.value = "";
        }
    }
});

shuffleBtn.addEventListener('click', shuffleLetters);

// 8. THE LOOP KILLER (Next Level Button)
nextBtn.addEventListener('click', () => {
    currentLevel++; // Increment level: 0 becomes 1, 1 becomes 2...
    console.log("Button Clicked. Moving to Level: " + currentLevel);
    initGame();     // Re-run the engine with the NEW level index
});

// 9. TIMER & END GAME
function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 120;
    timerInterval = setInterval(() => {
        timeLeft--;
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        timerDisplay.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (timeLeft <= 0) endGame();
    }, 1000);
}

function endGame() {
    clearInterval(timerInterval);
    inputField.disabled = true;
    
    // Change button text and show it
    nextBtn.innerText = "Next Level";
    nextBtn.classList.remove('hidden');
    
    const modal = document.getElementById('game-over-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('final-stats').innerText = `Level Complete! Final Score: ${scoreDisplay.innerText}`;
    }
}
