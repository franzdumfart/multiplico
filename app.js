const setupScreen = document.getElementById('setup-screen');
const practiceScreen = document.getElementById('practice-screen');
const seriesContainer = document.getElementById('series-selection');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');
const btnShowMatrix = document.getElementById('btn-show-matrix');
const btnAbort = document.getElementById('btn-abort');
const scoreBoard = document.getElementById('score-board');
const scoreListTimed = document.getElementById('score-list-timed');
const scoreListCount = document.getElementById('score-list-count');
const tabBtns = document.querySelectorAll('.tab-btn');
const rankingPanes = document.querySelectorAll('.ranking-pane');

const questionText = document.getElementById('question-text');
const answerInput = document.getElementById('answer-input');
const currentScoreDisplay = document.getElementById('current-score-display');
const timerDisplay = document.getElementById('timer-display');
const questionCounter = document.getElementById('question-counter');
const feedback = document.getElementById('feedback');
const numBtns = document.querySelectorAll('.num-btn');

const resultModal = document.getElementById('result-modal');
const resultSummary = document.getElementById('result-summary');
const btnModalClose = document.getElementById('btn-modal-close');

const matrixModal = document.getElementById('matrix-modal');
const btnMatrixClose = document.getElementById('btn-matrix-close');
const progressMatrixTable = document.getElementById('progress-matrix');

let sessionScores = JSON.parse(localStorage.getItem('multiplico_scores')) || [];
let mistakes = JSON.parse(localStorage.getItem('multiplico_mistakes')) || [];
let solvedProblems = JSON.parse(localStorage.getItem('multiplico_solved')) || {};
let savedSeries = JSON.parse(localStorage.getItem('multiplico_selected_series')) || null;
let currentPoints = 0;
let selectedSeries = [];
let currentQuestion = { a: 0, b: 0, answer: 0 };
let currentGameMode = 'endless';
let questionsAnswered = 0;
let startTime = 0;
let timerInterval = null;
let isActive = false;
let questionPool = [];

// Tab switching logic
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        
        tabBtns.forEach(b => b.classList.remove('active'));
        rankingPanes.forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`ranking-${tabId}`).classList.add('active');
    });
});

// Initialize multiplication series 0 to 10
for (let i = 0; i <= 10; i++) {
    const item = document.createElement('div');
    item.className = 'checkbox-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'series-' + i;
    checkbox.value = i;
    
    // Set checked state: use saved selection or default to all true
    if (savedSeries === null) {
        checkbox.checked = true;
    } else {
        checkbox.checked = savedSeries.includes(i);
    }
    
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    label.htmlFor = 'series-' + i;
    label.textContent = i;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    seriesContainer.appendChild(item);
}

// Initialize score board
updateScoreBoard();
updateMistakesCount();

btnReset.addEventListener('click', () => {
    if (confirm('Möchtest du wirklich alle deine Punkte, Fehler und deinen Fortschritt löschen? Dies kann nicht rückgängig gemacht werden.')) {
        localStorage.removeItem('multiplico_scores');
        localStorage.removeItem('multiplico_mistakes');
        localStorage.removeItem('multiplico_solved');
        localStorage.removeItem('multiplico_selected_series');
        sessionScores = [];
        mistakes = [];
        solvedProblems = {};
        
        // Reset checkboxes to default (all checked)
        const checkboxes = seriesContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
        
        updateScoreBoard();
        updateMistakesCount();
    }
});

btnStart.addEventListener('click', () => {
    selectedSeries = Array.from(seriesContainer.querySelectorAll('input:checked'))
        .map(cb => parseInt(cb.value));
    
    // Save selection for next time
    localStorage.setItem('multiplico_selected_series', JSON.stringify(selectedSeries));
    
    currentGameMode = document.querySelector('input[name="game-mode"]:checked').value;

    if (currentGameMode !== 'mistakes' && selectedSeries.length === 0) {
        alert('Bitte wähle mindestens eine Reihe aus!');
        return;
    }

    if (currentGameMode === 'mistakes' && mistakes.length === 0) {
        alert('Du hast noch keine Fehler zum Üben!');
        return;
    }

    startPractice();
});

btnAbort.addEventListener('click', () => {
    endSession(true);
});

btnModalClose.addEventListener('click', () => {
    resultModal.classList.add('hidden');
    showSetup();
});

btnShowMatrix.addEventListener('click', () => {
    renderMatrix();
    matrixModal.classList.remove('hidden');
});

btnMatrixClose.addEventListener('click', () => {
    matrixModal.classList.add('hidden');
});

// Allow keyboard input and Enter key
answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});

function showSetup() {
    setupScreen.classList.remove('hidden');
    practiceScreen.classList.add('hidden');
    scoreBoard.classList.remove('hidden');
}

function startPractice() {
    currentPoints = 0;
    questionsAnswered = 0;
    isActive = true;
    updateScoreDisplay();
    
    setupScreen.classList.add('hidden');
    scoreBoard.classList.add('hidden');
    practiceScreen.classList.remove('hidden');
    
    // Generate question pool for the session (only for normal modes)
    if (currentGameMode !== 'mistakes') {
        generateQuestionPool();
    }
    
    answerInput.focus();
    
    startTimer();
    nextQuestion();
}

function generateQuestionPool() {
    questionPool = [];
    selectedSeries.forEach(a => {
        for (let b = 0; b <= 10; b++) {
            questionPool.push({ a, b });
        }
    });
    // Shuffle the pool
    shuffleArray(questionPool);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function startTimer() {
    startTime = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        updateTimerDisplay();
        
        // Mode logic
        if (currentGameMode === 'timed') {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = 300 - elapsed;
            if (remaining <= 0) {
                endSession();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    if (currentGameMode === 'timed') {
        const remaining = Math.max(0, 300 - elapsed);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerDisplay.textContent = `Zeit: ${mins}:${secs.toString().padStart(2, '0')}`;
        timerDisplay.style.color = remaining < 30 ? '#ff5252' : '';
    } else {
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        timerDisplay.textContent = `Zeit: ${mins}:${secs.toString().padStart(2, '0')}`;
        timerDisplay.style.color = '';
    }
}

function nextQuestion() {
    if (!isActive) return;

    // Check if count mode is finished
    if (currentGameMode === 'count' && questionsAnswered >= 10) {
        endSession();
        return;
    }

    // Check if mistakes mode is finished
    if (currentGameMode === 'mistakes' && mistakes.length === 0) {
        endSession();
        return;
    }

    let a, b;
    if (currentGameMode === 'mistakes') {
        const mistake = mistakes[Math.floor(Math.random() * mistakes.length)];
        a = mistake.a;
        b = mistake.b;
    } else {
        if (questionPool.length === 0) {
            generateQuestionPool();
        }
        const next = questionPool.pop();
        a = next.a;
        b = next.b;
    }

    currentQuestion = { a, b, answer: a * b };
    questionText.textContent = `${a} × ${b} =`;
    answerInput.value = '';
    
    if (currentGameMode === 'count') {
        questionCounter.textContent = `Frage ${questionsAnswered + 1} von 10`;
    } else if (currentGameMode === 'mistakes') {
        questionCounter.textContent = `Fehler zum Üben: ${mistakes.length}`;
    } else {
        questionCounter.textContent = `Frage ${questionsAnswered + 1}`;
    }
    
    answerInput.focus();
}

function endSession(aborted = false) {
    isActive = false;
    clearInterval(timerInterval);
    
    if (!aborted && (currentPoints !== 0 || questionsAnswered > 0)) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
        
        saveScore({
            date: new Date().toLocaleTimeString(),
            points: currentPoints,
            series: selectedSeries.join(', '),
            mode: currentGameMode,
            time: timeStr
        });

        showResults(currentPoints, questionsAnswered, timeStr);
    } else {
        showSetup();
    }
}

function showResults(points, count, time) {
    let modeName = 'Endlos';
    if (currentGameMode === 'timed') modeName = '5 Minuten';
    if (currentGameMode === 'count') modeName = '10 Fragen';
    if (currentGameMode === 'mistakes') modeName = 'Fehler üben';

    let summary = `Du hast <strong>${points} Punkte</strong> erreicht!<br><br>`;
    summary += `Beantwortete Fragen: ${count}<br>`;
    summary += `Zeit: ${time}<br>`;
    summary += `Modus: ${modeName}`;
    
    resultSummary.innerHTML = summary;
    resultModal.classList.remove('hidden');
}

function updateScoreDisplay() {
    currentScoreDisplay.textContent = `Punkte: ${currentPoints}`;
}

numBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        if (val === 'clear') {
            answerInput.value = '';
        } else if (val === 'enter') {
            checkAnswer();
        } else {
            if (answerInput.value.length < 3) {
                answerInput.value += val;
            }
        }
        answerInput.focus();
    });
});

function checkAnswer() {
    if (!isActive) return;
    const userAnswer = parseInt(answerInput.value);
    if (isNaN(userAnswer)) return;

    questionsAnswered++;

    if (userAnswer === currentQuestion.answer) {
        currentPoints += 10;
        showFeedback('Richtig! +10', 'correct');
        
        trackAttempt(currentQuestion.a, currentQuestion.b, true);

        if (currentGameMode === 'mistakes') {
            removeMistake(currentQuestion.a, currentQuestion.b);
        }
        
        nextQuestion();
    } else {
        currentPoints = Math.max(-500, currentPoints - 10);
        showFeedback(`Falsch! ${currentQuestion.a} × ${currentQuestion.b} = ${currentQuestion.answer}`, 'wrong');
        
        trackAttempt(currentQuestion.a, currentQuestion.b, false);

        if (currentGameMode !== 'mistakes') {
            addMistake(currentQuestion.a, currentQuestion.b);
        }
        
        nextQuestion();
    }
    updateScoreDisplay();
}

function addMistake(a, b) {
    const exists = mistakes.some(m => m.a === a && m.b === b);
    if (!exists) {
        mistakes.push({ a, b });
        saveMistakes();
    }
}

function removeMistake(a, b) {
    mistakes = mistakes.filter(m => !(m.a === a && m.b === b));
    saveMistakes();
}

function saveMistakes() {
    localStorage.setItem('multiplico_mistakes', JSON.stringify(mistakes));
    updateMistakesCount();
}

function updateMistakesCount() {
    const countLabel = document.getElementById('mistakes-count-label');
    if (mistakes.length === 0) {
        countLabel.textContent = 'Bisher keine Fehler';
    } else {
        countLabel.textContent = `${mistakes.length} Fehler zu üben`;
    }
}

function showFeedback(text, type) {
    feedback.textContent = text;
    feedback.className = `feedback ${type}`;
}

function saveScore(score) {
    sessionScores.push(score);
    localStorage.setItem('multiplico_scores', JSON.stringify(sessionScores));
    updateScoreBoard();
}

function trackAttempt(a, b, isCorrect) {
    // Store both directions (a*b and b*a) as they are the same calculation
    const key1 = `${a}x${b}`;
    const key2 = `${b}x${a}`;
    const attemptData = {
        status: isCorrect ? 'correct' : 'wrong',
        date: new Date().toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        a: a,
        b: b,
        answer: a * b
    };
    solvedProblems[key1] = attemptData;
    solvedProblems[key2] = attemptData;
    localStorage.setItem('multiplico_solved', JSON.stringify(solvedProblems));
}

function renderMatrix() {
    progressMatrixTable.innerHTML = '';
    
    // Header row
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')); // Empty corner
    for (let i = 0; i <= 10; i++) {
        const th = document.createElement('th');
        th.textContent = i;
        headerRow.appendChild(th);
    }
    progressMatrixTable.appendChild(headerRow);
    
    // Data rows
    for (let i = 0; i <= 10; i++) {
        const row = document.createElement('tr');
        
        // Row header
        const rowHeader = document.createElement('th');
        rowHeader.textContent = i;
        row.appendChild(rowHeader);
        
        for (let j = 0; j <= 10; j++) {
            const td = document.createElement('td');
            const attempt = solvedProblems[`${i}x${j}`];
            
            // Support both old (boolean) and new (object) data format
            const isSolved = attempt === true || (attempt && attempt.status === 'correct');
            const isWrong = attempt && attempt.status === 'wrong';
            
            if (isSolved) {
                td.className = 'solved';
                td.textContent = '✓';
            } else if (isWrong) {
                td.className = 'wrong-cell';
                td.textContent = '✗';
            } else {
                td.className = 'unsolved';
                td.textContent = '';
            }

            // Tooltip data
            let tooltipContent = '';
            if (attempt && typeof attempt === 'object') {
                tooltipContent = `${i} × ${j} = ${i*j}<br>Geübt am: ${attempt.date}<br>Status: ${attempt.status === 'correct' ? 'Richtig' : 'Falsch'}`;
            } else if (attempt === true) {
                tooltipContent = `${i} × ${j} = ${i*j}<br>Status: Richtig`;
            } else {
                tooltipContent = `${i} × ${j} = ?`;
            }
            td.setAttribute('data-tippy-content', tooltipContent);
            
            row.appendChild(td);
        }
        progressMatrixTable.appendChild(row);
    }

    // Initialize Tippy tooltips
    tippy('#progress-matrix td', {
        allowHTML: true,
        animation: 'fade',
        theme: 'light-border',
        touch: ['hold', 100], // Optimized for mobile
    });
}

function updateScoreBoard() {
    scoreListTimed.innerHTML = '';
    scoreListCount.innerHTML = '';
    
    // Filter scores: only show top 5 for each mode
    const timedScores = sessionScores.filter(s => s.mode === 'timed')
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);
    
    const countScores = sessionScores.filter(s => s.mode === 'count')
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

    timedScores.forEach(s => {
        const li = document.createElement('li');
        li.className = 'score-item';
        li.innerHTML = `<span>${s.date} (${s.time})</span> <strong>${s.points} Pkt</strong>`;
        scoreListTimed.appendChild(li);
    });

    countScores.forEach(s => {
        const li = document.createElement('li');
        li.className = 'score-item';
        li.innerHTML = `<span>${s.date} (${s.time})</span> <strong>${s.points} Pkt</strong>`;
        scoreListCount.appendChild(li);
    });

    if (timedScores.length === 0) {
        scoreListTimed.innerHTML = '<li class="score-empty">Noch keine Ergebnisse da. Leg gleich los und hol dir deine ersten Punkte! 🚀</li>';
    }
    if (countScores.length === 0) {
        scoreListCount.innerHTML = '<li class="score-empty">Hier ist es noch leer. Schaffst du es unter die Top 5? Probier es aus! 🌟</li>';
    }
}
