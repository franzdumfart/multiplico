const setupScreen = document.getElementById('setup-screen');
const practiceScreen = document.getElementById('practice-screen');
const userSelectionScreen = document.getElementById('user-selection-screen');
const userListContainer = document.getElementById('user-list');
const newUserInput = document.getElementById('new-user-name');
const btnAddUser = document.getElementById('btn-add-user');
const btnSwitchUser = document.getElementById('btn-switch-user');
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
const avatarModal = document.getElementById('avatar-modal');
const btnAvatarClose = document.getElementById('btn-avatar-close');
const avatarOptions = document.getElementById('avatar-options');
const avatarStagePreviewTitle = document.getElementById('avatar-stage-preview-title');
const avatarStagePreview = document.getElementById('avatar-stage-preview');
const aboutModal = document.getElementById('about-modal');
const btnAboutClose = document.getElementById('btn-about-close');

const headerUserInfo = document.getElementById('header-user-info');
const totalPointsDisplay = document.getElementById('total-points-display');
const totalPointsValue = document.getElementById('total-points-value');
const userAvatarIcon = document.getElementById('user-avatar-icon');
const userAvatarTitle = document.getElementById('user-avatar-title');
const userAvatarProgress = document.getElementById('user-avatar-progress');
const userAvatarBox = document.querySelector('.user-avatar-box');
const useCustomNumpadOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

let users = [];
let currentUser = null;
let currentAvatarProfile = 'lion';
const avatarStages = [
    { minPoints: 0, title: 'Starter' },
    { minPoints: 250, title: 'Neuling' },
    { minPoints: 1000, title: 'Schlaukopf' },
    { minPoints: 3000, title: 'Profi' },
    { minPoints: 6000, title: 'Champion' },
    { minPoints: 10000, title: 'Legende' }
];
const avatarProfiles = [
    { id: 'lion', name: 'Loewe' },
    { id: 'robot', name: 'Roboter' },
    { id: 'wizard', name: 'Magier' },
    { id: 'dragon', name: 'Drache' },
    { id: 'ninja', name: 'Ninja' },
    { id: 'fox', name: 'Fuchs' },
    { id: 'astronaut', name: 'Astronaut' },
    { id: 'pirate', name: 'Pirat' }
];

if (useCustomNumpadOnly) {
    answerInput.readOnly = true;
    answerInput.setAttribute('inputmode', 'none');
    answerInput.tabIndex = -1;
}

function setMobileScrollLock(locked) {
    if (!useCustomNumpadOnly) return;
    document.body.classList.toggle('mobile-no-scroll', locked);
}

function getAvatarProfileKey(userName) {
    return `multiplico_${userName}_avatar_profile`;
}

function getAvatarStageIndex(totalPoints) {
    let stageIndex = 0;
    for (let i = 0; i < avatarStages.length; i++) {
        if (totalPoints >= avatarStages[i].minPoints) stageIndex = i;
    }
    return stageIndex;
}

function getAvatarProfileById(profileId) {
    return avatarProfiles.find(p => p.id === profileId) || avatarProfiles[0];
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
    setMobileScrollLock(false);
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
        const keysToDelete = ['scores', 'mistakes', 'solved', 'selected_series', 'avatar_profile'];
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
    displayUserName.title = `Hallo ${userName}!`;
    
    // Namespaced data loading
    sessionScores = await storage.getItem(`multiplico_${userName}_scores`) || [];
    mistakes = await storage.getItem(`multiplico_${userName}_mistakes`) || [];
    solvedProblems = await storage.getItem(`multiplico_${userName}_solved`) || {};
    savedSeries = await storage.getItem(`multiplico_${userName}_selected_series`) || null;
    currentAvatarProfile = await storage.getItem(getAvatarProfileKey(userName)) || avatarProfiles[0].id;
    
    // Refresh UI with user data
    initSeriesCheckboxes();
    updateScoreBoard();
    updateMistakesCount();
}

function showSetupScreen() {
    setMobileScrollLock(false);
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

async function renameCurrentUser() {
    if (!currentUser) return;
    const newName = prompt('Wie möchtest du heißen?', currentUser);
    if (newName && newName.trim() !== '' && newName !== currentUser) {
        const trimmedName = newName.trim();
        if (users.includes(trimmedName)) {
            alert('Dieser Name existiert bereits!');
            return false;
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

        const keysToMigrate = ['scores', 'mistakes', 'solved', 'selected_series', 'avatar_profile'];
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
        return true;
    }
    return false;
}

displayUserName.addEventListener('click', () => {
    renameCurrentUser();
});

displayUserName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        renameCurrentUser();
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

userAvatarBox.addEventListener('click', () => {
    const totalPoints = sessionScores.reduce((sum, s) => sum + (s.points || 0), 0);
    renderAvatarOptions(totalPoints);
    renderAvatarStagePreview();
    avatarModal.classList.remove('hidden');
});

btnAvatarClose.addEventListener('click', () => {
    avatarModal.classList.add('hidden');
});

avatarModal.addEventListener('click', (e) => {
    if (e.target === avatarModal) {
        avatarModal.classList.add('hidden');
    }
});

avatarOptions.addEventListener('click', async (e) => {
    const optionBtn = e.target.closest('.avatar-option-btn');
    if (!optionBtn || !currentUser) return;

    currentAvatarProfile = optionBtn.dataset.profile;
    await storage.setItem(getAvatarProfileKey(currentUser), currentAvatarProfile);
    const totalPoints = sessionScores.reduce((sum, s) => sum + (s.points || 0), 0);
    updateUserAvatar(totalPoints);
    renderAvatarOptions(totalPoints);
    renderAvatarStagePreview();
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
    setMobileScrollLock(false);
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
    setMobileScrollLock(true);
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

function getPointsPerCorrectAnswer() {
    const selectedCount = selectedSeries.length;
    // Scale rewards by selected rows: 1 row => 1 point, ... 10 rows => 10 points.
    return Math.max(1, Math.min(10, selectedCount));
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
        const pointsForCorrect = getPointsPerCorrectAnswer();
        currentPoints += pointsForCorrect;
        correctCount++;
        showFeedback(`Richtig! +${pointsForCorrect}`, 'correct');
        
        await trackAttempt(currentQuestion.a, currentQuestion.b, true);

        if (currentGameMode === 'mistakes') {
            await removeMistake(currentQuestion.a, currentQuestion.b);
        }
        
        nextQuestion();
    } else {
        const pointsForWrong = getPointsPerCorrectAnswer();
        currentPoints = Math.max(-500, currentPoints - pointsForWrong);
        wrongCount++;
        showFeedback(`Falsch! -${pointsForWrong} · ${currentQuestion.a} × ${currentQuestion.b} = ${currentQuestion.answer}`, 'wrong');
        
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
    updateUserAvatar(totalPoints);

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

function renderAvatarOptions(totalPoints) {
    const stageIndex = getAvatarStageIndex(totalPoints);
    avatarOptions.innerHTML = '';

    avatarProfiles.forEach(profile => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `avatar-option-btn${profile.id === currentAvatarProfile ? ' active' : ''}`;
        btn.dataset.profile = profile.id;
        btn.innerHTML = `
            <div class="avatar-option-icon">${renderAvatarSvg(profile.id, stageIndex)}</div>
            <div class="avatar-option-label">${profile.name}</div>
        `;
        avatarOptions.appendChild(btn);
    });
}

function renderAvatarStagePreview() {
    avatarStagePreview.innerHTML = '';
    const profile = getAvatarProfileById(currentAvatarProfile);
    avatarStagePreviewTitle.textContent = `Evolution: ${profile.name}`;

    avatarStages.forEach((stage, stageIndex) => {
        const card = document.createElement('div');
        card.className = 'avatar-stage-card';
        card.innerHTML = `
            <div class="avatar-option-icon">${renderAvatarSvg(profile.id, stageIndex)}</div>
            <div class="avatar-option-label">L${stageIndex + 1}</div>
        `;
        avatarStagePreview.appendChild(card);
    });
}

function renderAvatarSvg(profileId, stageIndex) {
    const accents = ['#90a4ae', '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043', '#fbc02d'];
    const accent = accents[Math.min(stageIndex, accents.length - 1)];
    const auraOpacity = [0.05, 0.09, 0.14, 0.2, 0.27, 0.35][stageIndex];
    const powerLevel = stageIndex + 1;
    const crown = stageIndex >= 5
        ? "<path d='M33 26l8-10 9 8 9-8 8 10-4 8H37z' fill='#ffd54f' stroke='#f9a825' stroke-width='2'/>"
        : '';
    const sparkles = stageIndex >= 3
        ? "<circle cx='20' cy='28' r='2' fill='#fff'/><circle cx='80' cy='30' r='2' fill='#fff'/>"
        : '';
    const badge = "<circle cx='78' cy='78' r='12' fill='#102a43' opacity='0.9'/><text x='78' y='82' font-size='11' text-anchor='middle' fill='#fff' font-family='Arial, sans-serif'>" + powerLevel + "</text>";

    const l2 = stageIndex >= 1;
    const l3 = stageIndex >= 2;
    const l4 = stageIndex >= 3;
    const l5 = stageIndex >= 4;
    const l6 = stageIndex >= 5;
    let art = '';
    switch (profileId) {
        case 'robot':
            art = `
                <rect x='24' y='28' width='52' height='44' rx='10' fill='#b0bec5'/>
                <rect x='36' y='42' width='10' height='8' rx='3' fill='#263238'/>
                <rect x='54' y='42' width='10' height='8' rx='3' fill='#263238'/>
                <rect x='42' y='57' width='16' height='6' rx='3' fill='#455a64'/>
                <circle cx='50' cy='24' r='4' fill='#90a4ae'/>
                ${l2 ? "<rect x='22' y='47' width='4' height='10' rx='2' fill='#78909c'/><rect x='74' y='47' width='4' height='10' rx='2' fill='#78909c'/>" : ''}
                ${l3 ? "<rect x='44' y='30' width='12' height='4' rx='2' fill='#546e7a'/>" : ''}
                ${l4 ? "<rect x='34' y='64' width='32' height='5' rx='2.5' fill='#455a64'/>" : ''}
                ${l5 ? "<path d='M18 40l8 4-8 4z' fill='#ff7043'/><path d='M82 40l-8 4 8 4z' fill='#ff7043'/>" : ''}
                ${l6 ? "<circle cx='50' cy='22' r='3.5' fill='#ffeb3b'/><path d='M50 14l2 4h-4z' fill='#ffeb3b'/>" : ''}
            `;
            break;
        case 'wizard':
            art = `
                <circle cx='50' cy='58' r='20' fill='#ffe0b2'/>
                <path d='M28 42l22-24 22 24z' fill='#5e35b1'/>
                <rect x='32' y='42' width='36' height='5' fill='#7e57c2'/>
                <circle cx='42' cy='56' r='3' fill='#3e2723'/>
                <circle cx='58' cy='56' r='3' fill='#3e2723'/>
                <path d='M42 66h16' stroke='#3e2723' stroke-width='2.5' stroke-linecap='round'/>
                ${l2 ? "<circle cx='50' cy='30' r='3' fill='#ffeb3b'/>" : ''}
                ${l3 ? "<path d='M22 70h56l-4 8H26z' fill='#7e57c2'/>" : ''}
                ${l4 ? "<rect x='70' y='46' width='3' height='20' fill='#6d4c41'/><circle cx='71.5' cy='43' r='3.5' fill='#ffee58'/>" : ''}
                ${l5 ? "<path d='M35 23l4-6 4 6z' fill='#ffca28'/><path d='M57 23l4-6 4 6z' fill='#ffca28'/>" : ''}
                ${l6 ? "<circle cx='50' cy='30' r='7' fill='none' stroke='#fff176' stroke-width='2'/>" : ''}
            `;
            break;
        case 'dragon':
            art = `
                <path d='M28 66c0-20 12-30 22-30s22 10 22 30z' fill='#66bb6a'/>
                <circle cx='43' cy='54' r='3' fill='#1b5e20'/>
                <circle cx='57' cy='54' r='3' fill='#1b5e20'/>
                <path d='M44 63h12' stroke='#1b5e20' stroke-width='2.5' stroke-linecap='round'/>
                <path d='M34 38l6-10 6 8' fill='#81c784'/>
                <path d='M54 36l8-10 6 12' fill='#81c784'/>
                ${l2 ? "<path d='M30 66l-8 6h10z' fill='#43a047'/><path d='M70 66l8 6H68z' fill='#43a047'/>" : ''}
                ${l3 ? "<path d='M44 42h12l-2 6h-8z' fill='#aed581'/>" : ''}
                ${l4 ? "<path d='M50 64l3 6h-6z' fill='#ffa000'/>" : ''}
                ${l5 ? "<path d='M50 58l16 4-16 4z' fill='#ff7043' opacity='0.85'/>" : ''}
                ${l6 ? "<path d='M24 50h52' stroke='#fff176' stroke-width='2' stroke-dasharray='3 2'/>" : ''}
            `;
            break;
        case 'ninja':
            art = `
                <circle cx='50' cy='56' r='22' fill='#37474f'/>
                <rect x='30' y='46' width='40' height='12' rx='6' fill='#eceff1'/>
                <circle cx='43' cy='52' r='3' fill='#263238'/>
                <circle cx='57' cy='52' r='3' fill='#263238'/>
                <path d='M34 64h32' stroke='#263238' stroke-width='2.5' stroke-linecap='round'/>
                <rect x='26' y='34' width='48' height='8' rx='4' fill='#263238'/>
                ${l2 ? "<path d='M25 70l8-6v10z' fill='#607d8b'/><path d='M75 70l-8-6v10z' fill='#607d8b'/>" : ''}
                ${l3 ? "<rect x='46' y='28' width='8' height='6' rx='2' fill='#90a4ae'/>" : ''}
                ${l4 ? "<path d='M32 40l-8 8' stroke='#90caf9' stroke-width='2'/><path d='M68 40l8 8' stroke='#90caf9' stroke-width='2'/>" : ''}
                ${l5 ? "<rect x='40' y='66' width='20' height='4' rx='2' fill='#263238'/>" : ''}
                ${l6 ? "<circle cx='50' cy='52' r='18' fill='none' stroke='#80deea' stroke-width='2'/>" : ''}
            `;
            break;
        case 'fox':
            art = `
                <circle cx='50' cy='58' r='21' fill='#ffb74d'/>
                <path d='M34 40l-5-14 14 7z' fill='#ff9800'/>
                <path d='M66 40l5-14-14 7z' fill='#ff9800'/>
                <circle cx='43' cy='56' r='3' fill='#3e2723'/>
                <circle cx='57' cy='56' r='3' fill='#3e2723'/>
                <path d='M46 64l4 3 4-3' fill='#fff3e0'/>
                ${l2 ? "<path d='M30 66l-6 8 10-3z' fill='#ff9800'/><path d='M70 66l6 8-10-3z' fill='#ff9800'/>" : ''}
                ${l3 ? "<path d='M50 68l6 4-6 4-6-4z' fill='#fff8e1'/>" : ''}
                ${l4 ? "<path d='M38 46h24' stroke='#ffe082' stroke-width='2'/>" : ''}
                ${l5 ? "<circle cx='32' cy='50' r='2.5' fill='#fff176'/><circle cx='68' cy='50' r='2.5' fill='#fff176'/>" : ''}
                ${l6 ? "<path d='M28 36l6-10 6 10' fill='#ffd54f'/><path d='M72 36l-6-10-6 10' fill='#ffd54f'/>" : ''}
            `;
            break;
        case 'astronaut':
            art = `
                <circle cx='50' cy='56' r='24' fill='#cfd8dc'/>
                <circle cx='50' cy='54' r='15' fill='#bbdefb'/>
                <circle cx='45' cy='53' r='2.5' fill='#263238'/>
                <circle cx='55' cy='53' r='2.5' fill='#263238'/>
                <rect x='42' y='65' width='16' height='5' rx='2.5' fill='#90a4ae'/>
                <rect x='36' y='30' width='28' height='6' rx='3' fill='#eceff1'/>
                ${l2 ? "<rect x='22' y='50' width='8' height='5' rx='2' fill='#90a4ae'/><rect x='70' y='50' width='8' height='5' rx='2' fill='#90a4ae'/>" : ''}
                ${l3 ? "<circle cx='50' cy='54' r='18' fill='none' stroke='#90caf9' stroke-width='2'/>" : ''}
                ${l4 ? "<path d='M50 22l4 8h-8z' fill='#26c6da'/>" : ''}
                ${l5 ? "<path d='M30 72h40' stroke='#26a69a' stroke-width='3'/>" : ''}
                ${l6 ? "<circle cx='50' cy='54' r='22' fill='none' stroke='#80deea' stroke-width='2' stroke-dasharray='4 2'/>" : ''}
            `;
            break;
        case 'pirate':
            art = `
                <circle cx='50' cy='58' r='21' fill='#ffcc80'/>
                <path d='M30 46h40v-8c-6-5-12-7-20-7s-14 2-20 7z' fill='#212121'/>
                <rect x='30' y='46' width='40' height='6' fill='#f44336'/>
                <circle cx='44' cy='58' r='3' fill='#3e2723'/>
                <path d='M52 58h8' stroke='#3e2723' stroke-width='2.5' stroke-linecap='round'/>
                <path d='M44 66h12' stroke='#3e2723' stroke-width='2.5' stroke-linecap='round'/>
                ${l2 ? "<circle cx='56' cy='58' r='4' fill='none' stroke='#212121' stroke-width='2'/>" : ''}
                ${l3 ? "<path d='M72 56l8 0-6 4z' fill='#424242'/>" : ''}
                ${l4 ? "<rect x='28' y='40' width='44' height='4' fill='#b71c1c'/>" : ''}
                ${l5 ? "<path d='M26 62l6-3v6z' fill='#616161'/>" : ''}
                ${l6 ? "<path d='M50 24l4 7h-8z' fill='#ffd54f'/>" : ''}
            `;
            break;
        default:
            art = `
                <circle cx='50' cy='58' r='20' fill='#ffcc80'/>
                <circle cx='35' cy='44' r='9' fill='#f4a261'/>
                <circle cx='65' cy='44' r='9' fill='#f4a261'/>
                <circle cx='43' cy='57' r='3' fill='#5d4037'/>
                <circle cx='57' cy='57' r='3' fill='#5d4037'/>
                <path d='M44 66h12' stroke='#5d4037' stroke-width='2.5' stroke-linecap='round'/>
                ${l2 ? "<path d='M30 58h6' stroke='#f57c00' stroke-width='2'/>" : ''}
                ${l3 ? "<path d='M64 58h6' stroke='#f57c00' stroke-width='2'/>" : ''}
                ${l4 ? "<rect x='44' y='68' width='12' height='3' fill='#ffca28'/>" : ''}
                ${l5 ? "<circle cx='50' cy='50' r='18' fill='none' stroke='#ffe082' stroke-width='2'/>" : ''}
                ${l6 ? "<path d='M50 26l4 6h-8z' fill='#ffd54f'/>" : ''}
            `;
            break;
    }

    return `<svg viewBox="0 0 100 100" role="img" aria-label="avatar">
        <circle cx="50" cy="50" r="46" fill="${accent}" opacity="${auraOpacity}"></circle>
        <circle cx="50" cy="50" r="40" fill="#ffffff" opacity="0.95"></circle>
        ${sparkles}
        ${crown}
        ${art}
        ${badge}
    </svg>`;
}

function updateUserAvatar(totalPoints) {
    const stageIndex = getAvatarStageIndex(totalPoints);
    const stage = avatarStages[stageIndex];
    const nextStage = avatarStages[stageIndex + 1];
    const level = stageIndex + 1;
    const profile = getAvatarProfileById(currentAvatarProfile);

    userAvatarIcon.innerHTML = renderAvatarSvg(profile.id, stageIndex);
    userAvatarTitle.textContent = `Level ${level} · ${stage.title}`;
    userAvatarProgress.textContent = nextStage
        ? `${profile.name} · ${totalPoints.toLocaleString('de-DE')} / ${nextStage.minPoints.toLocaleString('de-DE')}`
        : `${profile.name} · MAX`;
}
