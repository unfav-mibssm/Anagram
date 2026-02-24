let dictionary = [];
let masterWordCandidates = [];
let currentMaster = "";
let foundWords = [];
let timeLeft = 300;
let timerInterval;
let masterFound = false;
let score = 0;
let highScore = localStorage.getItem('anagramHighScore') || 0;
let requiredWordsToWin = 0; 

const DICT_URL = 'words.txt';

// DOM Elements
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const jumbledContainer = document.getElementById('jumbled-container');
const gridContainer = document.getElementById('word-grid-container');
const inputField = document.getElementById('word-input');
const nextBtn = document.getElementById('next-level-btn');
const skipBtn = document.getElementById('skip-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const hintBtn = document.getElementById('hint-btn');
const statusMsg = document.getElementById('status-message');
const modal = document.getElementById('game-over-modal');
const reviewBtn = document.getElementById('review-btn');
const closeReviewBtn = document.getElementById('close-review-btn');

// --- Audio Logic ---
let audioCtx = null;

function initAudio() { 
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
}

function playSound(type) {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); 
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } 
    else if (type === 'error') {
        osc.type = 'square'; 
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } 
    else if (type === 'master') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    }
    else if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }
}

// --- Data Loading ---
shuffleBtn.disabled = true;

fetch(DICT_URL)
    .then(res => res.text())
    .then(data => {
        dictionary = data.split('\n')
            .map(w => w.toUpperCase().trim())
            .filter(w => w.length >= 3 && /^[A-Z]+$/.test(w));
        
        masterWordCandidates = dictionary.filter(w => w.length >= 6 && w.length <= 8);
        highScoreDisplay.innerText = highScore;
        statusMsg.innerText = "Ready! Tap Start.";
        shuffleBtn.disabled = false;
    })
    .catch(err => {
        statusMsg.innerText = "Error loading words!";
        console.error(err);
    });

// --- Game Functions ---

function initGame() { 
    if (masterWordCandidates.length === 0) return;
    initAudio(); 
    highScoreDisplay.innerText = localStorage.getItem('anagramHighScore') || 0;
    score = 0; 
    scoreDisplay.innerText = "0"; 
    modal.classList.add('hidden');
    nextLevel(); 
}

function nextLevel() {
    foundWords = []; 
    masterFound = false;
    requiredWordsToWin = 0;
    gridContainer.innerHTML = ""; 
    inputField.value = "";
    nextBtn.classList.add('hidden'); 
    skipBtn.classList.remove('hidden');
    closeReviewBtn.classList.add('hidden'); 
    modal.classList.add('hidden');
    shuffleBtn.innerText = "Shuffle"; 
    
    currentMaster = masterWordCandidates[Math.floor(Math.random() * masterWordCandidates.length)];
    displayJumbled(); 
    generateGrid(); 
    updateStatus(); // Initial progress display
    startTimer();
}

function displayJumbled() {
    let letters = currentMaster.split("");
    for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    jumbledContainer.innerText = letters.join("");
}

function generateGrid() {
    const possibleWords = dictionary.filter(w => isValidAnagram(w, currentMaster));
    const grouped = {};
    possibleWords.forEach(word => {
        if (!grouped[word.length]) grouped[word.length] = [];
        grouped[word.length].push(word);
    });

    requiredWordsToWin = 0;
    gridContainer.innerHTML = "";

    Object.keys(grouped).sort((a, b) => a - b).forEach(len => {
        let maxSlots = grouped[len].length;
        if (len == 3 && maxSlots > 15) maxSlots = 15;
        if (len == 4 && maxSlots > 10) maxSlots = 10;
        if (len == 5 && maxSlots > 8) maxSlots = 8;

        if (maxSlots > 0) {
            const section = document.createElement('div');
            section.className = 'length-section';
            section.innerHTML = `<span class="section-title">${len} LETTERS</span>`;
            const flex = document.createElement('div');
            flex.className = 'words-flex';
            
            for (let i = 0; i < maxSlots; i++) {
                requiredWordsToWin++;
                const div = document.createElement('div');
                div.className = 'word-row empty-slot';
                div.dataset.len = len; 
                for (let j = 0; j < len; j++) div.innerHTML += `<div class="char-box"></div>`;
                flex.appendChild(div);
            }
            section.appendChild(flex); 
            gridContainer.appendChild(section);
        }
    });
}

function isValidAnagram(guess, master) {
    let m = master.split("");
    for (let c of guess) {
        let i = m.indexOf(c); 
        if (i === -1) return false; 
        m.splice(i, 1);
    }
    return true;
}

function revealWord(word, isMissed = false) {
    document.querySelectorAll('.word-row').forEach(row => {
        if (row.dataset.word === word) {
            row.querySelectorAll('.char-box').forEach((box, i) => {
                box.innerText = word[i];
                box.classList.add(isMissed ? 'missed' : 'revealed');
            });
        }
    });
}

function updateStatus(customMsg = null) {
    if (customMsg) {
        statusMsg.innerText = customMsg;
    } else {
        statusMsg.innerText = `Progress: ${foundWords.length} / ${requiredWordsToWin}`;
    }
}

function triggerShake() {
    inputField.classList.add('shake');
    if ("vibrate" in navigator) navigator.vibrate(50);
    setTimeout(() => inputField.classList.remove('shake'), 400);
}

function giveHint() {
    if (score >= 20) {
        const emptyRows = Array.from(document.querySelectorAll('.word-row.empty-slot'));
        if (emptyRows.length > 0) {
            const rowToFill = emptyRows[Math.floor(Math.random() * emptyRows.length)];
            const targetLen = parseInt(rowToFill.dataset.len);
            const possible = dictionary.filter(w => w.length === targetLen && isValidAnagram(w, currentMaster) && !foundWords.includes(w));
            
            if (possible.length > 0) {
                const wordToReveal = possible[Math.floor(Math.random() * possible.length)];
                score -= 20; 
                scoreDisplay.innerText = score;
                foundWords.push(wordToReveal); 
                rowToFill.classList.remove('empty-slot');
                rowToFill.dataset.word = wordToReveal;
                revealWord(wordToReveal);
                playSound('correct'); 
                updateStatus();
                checkWinCondition();
            }
        }
    } else { 
        updateStatus("Need 20 pts!"); 
        playSound('error');
        triggerShake(); 
    }
}

function startTimer() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    clearInterval(timerInterval); 
    timeLeft = 300;
    timerInterval = setInterval(() => {
        timeLeft--;
        let m = Math.floor(timeLeft / 60), s = timeLeft % 60;
        timerDisplay.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (timeLeft <= 15 && timeLeft > 0) playSound('tick');
        if (timeLeft <= 0) endGame();
    }, 1000);
}

function endGame() {
    inputField.blur(); 
    clearInterval(timerInterval); 
    timerInterval = null; 
    shuffleBtn.innerText = "START GAME";
    
    let displayedMissed = [...foundWords];

    document.querySelectorAll('.word-row.empty-slot').forEach(row => {
        const len = parseInt(row.dataset.len);
        const missed = dictionary.find(w => 
            w.length === len && 
            isValidAnagram(w, currentMaster) && 
            !displayedMissed.includes(w)
        );

        if (missed) {
            displayedMissed.push(missed);
            row.dataset.word = missed;
            revealWord(missed, true);
        }
    });

    let currentBest = localStorage.getItem('anagramHighScore') || 0;
    if (score > currentBest) {
        localStorage.setItem('anagramHighScore', score);
        highScoreDisplay.innerText = score;
        updateStatus("NEW BEST SCORE!");
    }
    modal.classList.remove('hidden');
    document.getElementById('final-stats').innerText = `Score: ${score}. Word: ${currentMaster}`;
}

function checkWinCondition() {
    if (foundWords.length === requiredWordsToWin) {
        updateStatus("LEVEL CLEAR!");
        playSound('master');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        clearInterval(timerInterval);
        setTimeout(nextLevel, 1500);
    }
}

inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const guess = inputField.value.toUpperCase().trim();
        const isRealWord = dictionary.includes(guess);
        const isAnagram = isValidAnagram(guess, currentMaster);

        if (guess.length >= 3 && isRealWord && isAnagram) {
            if (!foundWords.includes(guess)) {
                const emptySlot = document.querySelector(`.word-row.empty-slot[data-len="${guess.length}"]`);
                
                if (emptySlot) {
                    foundWords.push(guess); 
                    emptySlot.classList.remove('empty-slot');
                    emptySlot.dataset.word = guess;
                    revealWord(guess);
                    score += (guess.length * 10); 
                    scoreDisplay.innerText = score;

                    if (guess.length === currentMaster.length) {
                        masterFound = true; 
                        nextBtn.classList.remove('hidden'); 
                        playSound('master');
                        updateStatus("MASTER WORD!");
                    } else {
                        playSound('correct');
                        updateStatus();
                    }
                    checkWinCondition();
                } else {
                    updateStatus(`Full for ${guess.length} letters!`);
                    playSound('error');
                    triggerShake();
                }
            } else { 
                triggerShake(); 
                playSound('error'); 
                updateStatus("Already found!");
            }
        } else { 
            triggerShake(); 
            playSound('error'); 
            updateStatus("Invalid word!");
        }
        inputField.value = "";
    }
});

shuffleBtn.addEventListener('click', () => {
    if (timerInterval) {
        displayJumbled();
        playSound('correct');
    } else {
        initGame();
    }
});

skipBtn.addEventListener('click', () => {
    if (score >= 50) { 
        score -= 50; 
        scoreDisplay.innerText = score; 
        playSound('correct');
        nextLevel(); 
    } else {
        updateStatus("Need 50 pts!");
        playSound('error');
    }
});

hintBtn.addEventListener('click', giveHint);
nextBtn.addEventListener('click', nextLevel);
document.getElementById('modal-next-btn').addEventListener('click', initGame);

reviewBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    closeReviewBtn.classList.remove('hidden');
    gridContainer.scrollTo({ top: 0, behavior: 'smooth' });
});

closeReviewBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    closeReviewBtn.classList.add('hidden');
});

inputField.addEventListener('focus', () => {
    setTimeout(() => jumbledContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js")
    .then(() => console.log("Offline system active!"))
    .catch(err => console.error("SW Error:", err));
}
