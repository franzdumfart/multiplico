const setupScreen = document.getElementById('setup-screen');
const practiceScreen = document.getElementById('practice-screen');
const userSelectionScreen = document.getElementById('user-selection-screen');
const userListContainer = document.getElementById('user-list');
const newUserInput = document.getElementById('new-user-name');
const btnAddUser = document.getElementById('btn-add-user');
const btnSwitchUser = document.getElementById('btn-switch-user');
const btnEditUser = document.getElementById('btn-edit-user');
const displayUserName = document.getElementById('display-user-name');

const seriesContainer = document.getElementById('series-selection');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');
const btnShowMatrix = document.getElementById('btn-show-matrix');
const btnShowHistory = document.getElementById('btn-show-history');
const btnToggleRankings = document.getElementById('btn-toggle-rankings');
const btnExportCSV = document.getElementById('btn-export-csv');
const btnShowAbout = document.getElementById('btn-show-about');
const btnAbort = document.getElementById('btn-abort');
const scoreBoard = document.getElementById('score-board');
const btnRankingsClose = document.getElementById('btn-rankings-close');
const scoreListTimed = document.getElementById('score-list-timed');
const scoreListCount = document.getElementById('score-list-count');
const scoreListGlobal = document.getElementById('score-list-global');
const tabBtns = document.querySelectorAll('.tab-btn');
const rankingPanes = document.querySelectorAll('.ranking-pane');

const questionText = document.getElementById('question-text');
const answerInput = document.getElementById('answer-input');
const currentScoreDisplay = document.getElementById('current-score-display');
const timerDisplay = document.getElementById('timer-display');
const questionCounter = document.getElementById('question-counter');
const feedback = document.getElementById('feedback');
const numBtns = document.querySelectorAll('.num-btn');
const btnOk = document.getElementById('btn-ok');

const resultModal = document.getElementById('result-modal');
const resultSummary = document.getElementById('result-summary');
const btnModalClose = document.getElementById('btn-modal-close');

const matrixModal = document.getElementById('matrix-modal');
const btnMatrixClose = document.getElementById('btn-matrix-close');
const progressMatrixTable = document.getElementById('progress-matrix');

const historyModal = document.getElementById('history-modal');
const btnHistoryClose = document.getElementById('btn-history-close');
const historyList = document.getElementById('history-list');
const statTotalPlayed = document.getElementById('stat-total-played');
const statTotalCorrect = document.getElementById('stat-total-correct');
const statTotalWrong = document.getElementById('stat-total-wrong');
const aboutModal = document.getElementById('about-modal');
const btnAboutClose = document.getElementById('btn-about-close');

const headerUserInfo = document.getElementById('header-user-info');
const totalPointsDisplay = document.getElementById('total-points-display');
const totalPointsValue = document.getElementById('total-points-value');
const useCustomNumpadOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

let users = [];
let currentUser = null;

if (useCustomNumpadOnly) {
    answerInput.readOnly = true;
    answerInput.setAttribute('inputmode', 'none');
    answerInput.tabIndex = -1;
}

async function initApp() {
    await storage.init();
    
    // Load users from storage
    users = await storage.getItem('multiplico_users') || [];
    currentUser = await storage.getItem('multiplico_current_user') || null;

    // Simple migration for existing single user (from localStorage to IndexedDB or within IndexedDB)
    if (users.length === 0) {
        // Check localStorage for old data
        const localUsers = JSON.parse(localStorage.getItem('multiplico_users'));
        if (localUsers) {
            users = localUsers;
            await storage.setItem('multiplico_users', users);
            
            // Migrate each user's data
            for (const user of users) {
                const keys = ['scores', 'mistakes', 'solved', 'selected_series'];
                for (const suffix of keys) {
                    const oldKey = `multiplico_${user}_${suffix}`;
                    const data = localStorage.getItem(oldKey);
                    if (data) {
                        await storage.setItem(oldKey, JSON.parse(data));
                        // Keep localStorage as backup for now or remove? User asked for persistent, IndexedDB is better.
                    }
                }
            }
            const localCurrentUser = localStorage.getItem('multiplico_current_user');
            if (localCurrentUser) {
                currentUser = localCurrentUser;
                await storage.setItem('multiplico_current_user', currentUser);
            }
        } else {
            // Check for very old single-user data in localStorage
            const existingScores = localStorage.getItem('multiplico_scores');
            if (existingScores) {
                const defaultUser = 'Gast';
                users.push(defaultUser);
                await storage.setItem('multiplico_users', users);
                
                await storage.setItem(`multiplico_${defaultUser}_scores`, JSON.parse(existingScores));
                await storage.setItem(`multiplico_${defaultUser}_mistakes`, JSON.parse(localStorage.getItem('multiplico_mistakes') || '[]'));
                await storage.setItem(`multiplico_${defaultUser}_solved`, JSON.parse(localStorage.getItem('multiplico_solved') || '{}'));
                await storage.setItem(`multiplico_${defaultUser}_selected_series`, JSON.parse(localStorage.getItem('multiplico_selected_series') || 'null'));
                
                if (!currentUser) currentUser = defaultUser;
                await storage.setItem('multiplico_current_user', currentUser);
            }
        }
    }

    // Initialize User Management
    if (!currentUser && users.length === 0) {
        // First time user: create a "Gast" user and start with it
        const defaultUser = 'Gast';
        users.push(defaultUser);
        await storage.setItem('multiplico_users', users);
        currentUser = defaultUser;
        await storage.setItem('multiplico_current_user', defaultUser);
    }

    if (currentUser) {
        await selectUser(currentUser);
    } else {
        renderUserSelection();
    }
}

initApp();

// Tab Switching Logic
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        
        // Update buttons
        tabBtns.forEach(b => b.classList.toggle('active', b === btn));
        
        // Update panes
        rankingPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `ranking-${target}`);
        });
    });
});

let sessionScores = [];
let mistakes = [];
let solvedProblems = {};
let savedSeries = null;

let currentPoints = 0;
let correctCount = 0;
let wrongCount = 0;
let selectedSeries = [];
let currentQuestion = { a: 0, b: 0, answer: 0 };
let currentGameMode = 'endless';
let questionsAnswered = 0;
let startTime = 0;
let timerInterval = null;
let isActive = false;
let questionPool = [];
let sessionQuestions = [];

// Initialize User Management (moved to initApp)

function renderUserSelection() {
    userSelectionScreen.classList.remove('hidden');
    setupScreen.classList.add('hidden');
    practiceScreen.classList.add('hidden');
    scoreBoard.classList.add('hidden');
    headerUserInfo.classList.add('hidden');
    
    userListContainer.innerHTML = '';
    if (users.length === 0) {
        const info = document.createElement('p');
        info.textContent = 'Noch kein User angelegt. Gib deinen Namen ein!';
        info.style.color = '#888';
        info.style.fontStyle = 'italic';
        userListContainer.appendChild(info);
    } else {
        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';

            const btn = document.createElement('button');
            btn.className = 'user-btn';
            btn.textContent = user;
            btn.addEventListener('click', () => selectUser(user));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-user';
            deleteBtn.innerHTML = '✖';
            deleteBtn.title = 'Benutzer löschen';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteUser(user);
            });

            userCard.appendChild(btn);
            userCard.appendChild(deleteBtn);
            userListContainer.appendChild(userCard);
        });
    }
}

async function deleteUser(userName) {
    if (confirm(`Möchtest du den Benutzer "${userName}" und alle seine Daten wirklich löschen?`)) {
        // Remove from users list
        users = users.filter(u => u !== userName);
        await storage.setItem('multiplico_users', users);

        // Delete namespaced data
        const prefix = `multiplico_${userName}_`;
        const keysToDelete = ['scores', 'mistakes', 'solved', 'selected_series'];
        for (const suffix of keysToDelete) {
            await storage.removeItem(prefix + suffix);
        }

        // If it was the current user, clear it
        if (currentUser === userName) {
            currentUser = null;
            await storage.removeItem('multiplico_current_user');
        }

        renderUserSelection();
    }
}

async function selectUser(userName) {
    currentUser = userName;
    await storage.setItem('multiplico_current_user', userName);
    await loadUserData(userName);
    showSetupScreen();
}

async function loadUserData(userName) {
    displayUserName.textContent = `Hallo ${userName}! 👋`;
    
    // Namespaced data loading
    sessionScores = await storage.getItem(`multiplico_${userName}_scores`) || [];
    mistakes = await storage.getItem(`multiplico_${userName}_mistakes`) || [];
    solvedProblems = await storage.getItem(`multiplico_${userName}_solved`) || {};
    savedSeries = await storage.getItem(`multiplico_${userName}_selected_series`) || null;
    
    // Refresh UI with user data
    initSeriesCheckboxes();
    updateScoreBoard();
    updateMistakesCount();
}

function showSetupScreen() {
    userSelectionScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
    practiceScreen.classList.add('hidden');
    setRankingsVisibility(false);
    headerUserInfo.classList.remove('hidden');
}

btnAddUser.addEventListener('click', async () => {
    const name = newUserInput.value.trim();
    if (name && !users.includes(name)) {
        users.push(name);
        await storage.setItem('multiplico_users', users);
        newUserInput.value = '';
        renderUserSelection();
    } else if (users.includes(name)) {
        alert('Dieser Name existiert bereits!');
    }
});

btnSwitchUser.addEventListener('click', async () => {
    currentUser = null;
    await storage.removeItem('multiplico_current_user');
    renderUserSelection();
});

btnEditUser.addEventListener('click', async () => {
    const newName = prompt('Wie möchtest du heißen?', currentUser);
    if (newName && newName.trim() !== '' && newName !== currentUser) {
        const trimmedName = newName.trim();
        if (users.includes(trimmedName)) {
            alert('Dieser Name existiert bereits!');
            return;
        }

        // Update users list
        const index = users.indexOf(currentUser);
        if (index !== -1) {
            users[index] = trimmedName;
            await storage.setItem('multiplico_users', users);
        }

        // Migrate data to new name
        const oldPrefix = `multiplico_${currentUser}_`;
        const newPrefix = `multiplico_${trimmedName}_`;

        const keysToMigrate = ['scores', 'mistakes', 'solved', 'selected_series'];
        for (const suffix of keysToMigrate) {
            const data = await storage.getItem(oldPrefix + suffix);
            if (data) {
                await storage.setItem(newPrefix + suffix, data);
                await storage.removeItem(oldPrefix + suffix);
            }
        }

        currentUser = trimmedName;
        await storage.setItem('multiplico_current_user', trimmedName);
        await loadUserData(trimmedName);
    }
});

function initSeriesCheckboxes() {
    seriesContainer.innerHTML = '';
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
}

btnReset.addEventListener('click', async () => {
    if (confirm('Möchtest du wirklich alle deine Punkte, Fehler und deinen Fortschritt löschen? Dies kann nicht rückgängig gemacht werden.')) {
        await storage.removeItem(`multiplico_${currentUser}_scores`);
        await storage.removeItem(`multiplico_${currentUser}_mistakes`);
        await storage.removeItem(`multiplico_${currentUser}_solved`);
        await storage.removeItem(`multiplico_${currentUser}_selected_series`);
        sessionScores = [];
        mistakes = [];
        solvedProblems = {};
        
        initSeriesCheckboxes();
        updateScoreBoard();
        updateMistakesCount();
    }
});

btnStart.addEventListener('click', async () => {
    selectedSeries = Array.from(seriesContainer.querySelectorAll('input:checked'))
        .map(cb => parseInt(cb.value));
    
    // Save selection for next time
    await storage.setItem(`multiplico_${currentUser}_selected_series`, selectedSeries);
    
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

btnShowHistory.addEventListener('click', () => {
    renderHistory();
    historyModal.classList.remove('hidden');
});

btnToggleRankings.addEventListener('click', () => {
    setRankingsVisibility(true);
});

btnRankingsClose.addEventListener('click', () => {
    setRankingsVisibility(false);
});

btnMatrixClose.addEventListener('click', () => {
    matrixModal.classList.add('hidden');
});

btnHistoryClose.addEventListener('click', () => {
    historyModal.classList.add('hidden');
});

btnShowAbout.addEventListener('click', () => {
    aboutModal.classList.remove('hidden');
});

btnAboutClose.addEventListener('click', () => {
    aboutModal.classList.add('hidden');
});

aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
        aboutModal.classList.add('hidden');
    }
});

scoreBoard.addEventListener('click', (e) => {
    if (e.target === scoreBoard) {
        setRankingsVisibility(false);
    }
});

btnExportCSV.addEventListener('click', () => {
    exportToCSV();
});

function exportToCSV() {
    if (sessionScores.length === 0) {
        alert('Keine Daten zum Exportieren vorhanden!');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Datum,Zeit,Modus,Punkte,Reihen\r\n";

    sessionScores.forEach(s => {
        const row = [s.date, s.time, s.mode, s.points, `"${s.series}"`].join(",");
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `multiplico_${currentUser}_ergebnisse.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Allow keyboard input and Enter key
answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});

answerInput.addEventListener('input', () => {
    updateOkButtonState();
});

function updateOkButtonState() {
    btnOk.disabled = (answerInput.value.trim() === '');
}

function showSetup() {
    setupScreen.classList.remove('hidden');
    practiceScreen.classList.add('hidden');
    setRankingsVisibility(false);
    if (currentUser) {
        headerUserInfo.classList.remove('hidden');
    }
}

function setRankingsVisibility(visible) {
    scoreBoard.classList.toggle('hidden', !visible);
    if (visible) {
        updateScoreBoard();
    }
}

function focusAnswerInput() {
    if (!useCustomNumpadOnly) {
        answerInput.focus();
    }
}

function startPractice() {
    currentPoints = 0;
    questionsAnswered = 0;
    correctCount = 0;
    wrongCount = 0;
    sessionQuestions = [];
    isActive = true;
    updateScoreDisplay();
    
    setupScreen.classList.add('hidden');
    scoreBoard.classList.add('hidden');
    headerUserInfo.classList.add('hidden');
    practiceScreen.classList.remove('hidden');
    
    // Generate question pool for the session (only for normal modes)
    if (currentGameMode !== 'mistakes') {
        generateQuestionPool();
    }
    
    focusAnswerInput();
    
    updateOkButtonState();
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
    updateOkButtonState();
    
    if (currentGameMode === 'count') {
        questionCounter.textContent = `Frage ${questionsAnswered + 1} von 10`;
    } else if (currentGameMode === 'mistakes') {
        questionCounter.textContent = `Fehler zum Üben: ${mistakes.length}`;
    } else {
        questionCounter.textContent = `Frage ${questionsAnswered + 1}`;
    }
    
    focusAnswerInput();
}

function endSession(aborted = false) {
    isActive = false;
    clearInterval(timerInterval);

    const hasProgress = (currentPoints !== 0 || questionsAnswered > 0);
    const shouldSaveScore = hasProgress && (!aborted || currentGameMode === 'endless');

    if (shouldSaveScore) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
        
        saveScore({
            date: new Date().toLocaleTimeString(),
            points: currentPoints,
            series: selectedSeries.join(', '),
            mode: currentGameMode,
            time: timeStr,
            correct: correctCount,
            wrong: wrongCount,
            questions: sessionQuestions
        });

        if (aborted) {
            showSetup();
        } else {
            showResults(currentPoints, questionsAnswered, timeStr);
        }
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
        updateOkButtonState();
        focusAnswerInput();
    });
});

async function checkAnswer() {
    if (!isActive) return;
    const userAnswer = parseInt(answerInput.value);
    if (isNaN(userAnswer)) return;

    questionsAnswered++;
    const isCorrect = (userAnswer === currentQuestion.answer);
    
    // Log question for history
    sessionQuestions.push({
        q: `${currentQuestion.a} × ${currentQuestion.b}`,
        a: currentQuestion.answer,
        user: userAnswer,
        correct: isCorrect
    });

    if (isCorrect) {
        currentPoints += 10;
        correctCount++;
        showFeedback('Richtig! +10', 'correct');
        
        await trackAttempt(currentQuestion.a, currentQuestion.b, true);

        if (currentGameMode === 'mistakes') {
            await removeMistake(currentQuestion.a, currentQuestion.b);
        }
        
        nextQuestion();
    } else {
        currentPoints = Math.max(-500, currentPoints - 10);
        wrongCount++;
        showFeedback(`Falsch! ${currentQuestion.a} × ${currentQuestion.b} = ${currentQuestion.answer}`, 'wrong');
        
        await trackAttempt(currentQuestion.a, currentQuestion.b, false);

        if (currentGameMode !== 'mistakes') {
            await addMistake(currentQuestion.a, currentQuestion.b);
        }
        
        nextQuestion();
    }
    updateScoreDisplay();
}

async function addMistake(a, b) {
    const exists = mistakes.some(m => m.a === a && m.b === b);
    if (!exists) {
        mistakes.push({ a, b });
        await saveMistakes();
    }
}

async function removeMistake(a, b) {
    mistakes = mistakes.filter(m => !(m.a === a && m.b === b));
    await saveMistakes();
}

async function saveMistakes() {
    await storage.setItem(`multiplico_${currentUser}_mistakes`, mistakes);
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

async function saveScore(score) {
    sessionScores.push(score);
    await storage.setItem(`multiplico_${currentUser}_scores`, sessionScores);
    updateScoreBoard();
}

async function trackAttempt(a, b, isCorrect) {
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
    await storage.setItem(`multiplico_${currentUser}_solved`, solvedProblems);
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

function renderHistory() {
    historyList.innerHTML = '';
    
    let totalPlayed = 0;
    let totalCorrect = 0;
    let totalWrong = 0;

    // We use all recorded scores for stats (reverse order to show newest first)
    [...sessionScores].reverse().forEach((s, index) => {
        totalCorrect += (s.correct || 0);
        totalWrong += (s.wrong || 0);
        totalPlayed += ((s.correct || 0) + (s.wrong || 0));
        
        const li = document.createElement('li');
        li.className = 'score-item-history';
        
        let modeName = 'Endlos';
        if (s.mode === 'timed') modeName = '5 Min';
        if (s.mode === 'count') modeName = '10 Fragen';
        if (s.mode === 'mistakes') modeName = 'Fehler';

        let questionsHtml = '';
        if (s.questions && s.questions.length > 0) {
            questionsHtml = `
                <div class="history-details hidden" id="history-details-${index}">
                    <div class="details-grid">
                        ${s.questions.map(q => `
                            <div class="detail-q ${q.correct ? 'q-right' : 'q-wrong'}">
                                <span>${q.q} = ${q.user}</span>
                                <span>${q.correct ? '✓' : `✗ (${q.a})`}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        li.innerHTML = `
            <div class="history-main" onclick="toggleHistoryDetails(${index})">
                <div style="flex: 1;">
                    <strong>${s.date}</strong> (${modeName})<br>
                    <small>${s.series}</small>
                </div>
                <div style="text-align: right; display: flex; align-items: center; gap: 10px;">
                    <div style="text-align: right;">
                        <strong>${s.points} Pkt</strong><br>
                        <small>${s.correct || 0} ✓ / ${s.wrong || 0} ✗</small>
                    </div>
                    ${s.questions ? '<span class="expand-icon">▼</span>' : ''}
                </div>
            </div>
            ${questionsHtml}
        `;
        historyList.appendChild(li);
    });

    statTotalPlayed.textContent = totalPlayed;
    statTotalCorrect.textContent = totalCorrect;
    statTotalWrong.textContent = totalWrong;

    if (sessionScores.length === 0) {
        historyList.innerHTML = '<li class="score-empty">Noch kein Quiz-Verlauf vorhanden. Spiel eine Runde!</li>';
    }
}

function toggleHistoryDetails(index) {
    const details = document.getElementById(`history-details-${index}`);
    if (details) {
        details.classList.toggle('hidden');
        const icon = details.previousElementSibling.querySelector('.expand-icon');
        if (icon) {
            icon.style.transform = details.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    }
}

async function updateScoreBoard() {
    scoreListTimed.innerHTML = '';
    scoreListCount.innerHTML = '';
    scoreListGlobal.innerHTML = '';
    
    // Calculate and display total points
    const totalPoints = sessionScores.reduce((sum, s) => sum + (s.points || 0), 0);
    totalPointsValue.textContent = totalPoints.toLocaleString('de-DE');

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

    // Global Ranking Logic
    const allGlobalScores = [];
    for (const user of users) {
        const uScores = await storage.getItem(`multiplico_${user}_scores`) || [];
        uScores.forEach(s => {
            allGlobalScores.push({
                ...s,
                userName: user
            });
        });
    }

    const topGlobalScores = allGlobalScores
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);

    topGlobalScores.forEach(s => {
        const li = document.createElement('li');
        li.className = 'score-item';
        let modeLabel = 'Endlos';
        if (s.mode === 'timed') modeLabel = '5 Minuten';
        if (s.mode === 'count') modeLabel = '10 Fragen';
        if (s.mode === 'mistakes') modeLabel = 'Fehler üben';
        li.innerHTML = `<span><strong>${s.userName}</strong>: ${s.points} Pkt (${modeLabel})</span>`;
        scoreListGlobal.appendChild(li);
    });

    if (topGlobalScores.length === 0) {
        scoreListGlobal.innerHTML = '<li class="score-empty">Noch keine globalen Ergebnisse. Wer wird der erste Champion? 🏆</li>';
    }
}
