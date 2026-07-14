/* ==========================================================================
   MEMORY GAME - ENGINE PRINCIPAL (by Mesaque)
   Arquitetura: Vanilla JS + Tailwind CSS + Tabler Icons
   ========================================================================== */

// --- 1. CONFIGURAÇÕES DOS NÍVEIS E ASSETS ---
const LEVELS_CONFIG = {
    facil: {
        gridClass: 'grid-facil',
        totalCards: 16,
        pairs: 8,
        previewTime: 1000,
        hasPreview: true,
        timeLimit: null,
        images: [
            'saco.png', 'tablet.png', 'luva.png', 'alcool.png', 
            'celular.png', 'pead.png', 'caixa.png', 'carinho.png'
        ]
    },
    medio: {
        gridClass: 'grid-medio',
        totalCards: 30,
        pairs: 15,
        previewTime: 1000,
        hasPreview: true,
        timeLimit: null,
        images: [
            'saco.png', 'tablet.png', 'luva.png', 'alcool.png', 
            'celular.png', 'pead.png', 'caixa.png', 'carinho.png',
            'cabo.png', 'calibrador.png', 'termo.png', 'ovos.png', 
            'papel.png', 'sabao.png', 'recibo.png'
        ]
    },
    dificil: {
        gridClass: 'grid-dificil',
        totalCards: 42,
        pairs: 21,
        previewTime: 0,
        hasPreview: false,
        timeLimit: 120,
        images: [
            'saco.png', 'tablet.png', 'luva.png', 'alcool.png', 
            'celular.png', 'pead.png', 'caixa.png', 'carinho.png',
            'cabo.png', 'calibrador.png', 'termo.png', 'ovos.png', 
            'papel.png', 'sabao.png', 'recibo.png',
            'capa.png', 'carregador.png', 'chuva.png', 'cinta.png', 
            'gel.png', 'japona.png'
        ]
    }
};

// --- 2. ESTADO GLOBAL DO JOGO ---
let currentLevel = 'facil';
let cardsArray = [];
let firstCard = null;
let secondCard = null;
let hasFlippedCard = false;
let lockBoard = true;
let matchedPairs = 0;
let timerInterval = null;
let secondsElapsed = 0;
let isTimerRunning = false;
let rankingData = { facil: [], medio: [], dificil: [] };
let lobbyAnimationTimers = [];

// --- 3. INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initLobbyAnimation();
    loadRankingData();
    setupEventListeners();
});

// --- 4. ANIMAÇÃO DO LOBBY (MINI-GAMA DIAGONAL 1-2 / 2-1) ---
function initLobbyAnimation() {
    const grid = document.getElementById('logo-animation-grid');
    if (!grid) return;
    
    // Limpa timers anteriores caso o jogador navegue rápido pelo menu
    lobbyAnimationTimers.forEach(t => clearTimeout(t));
    lobbyAnimationTimers = [];
    
    grid.innerHTML = '';
    grid.className = 'grid grid-cols-2 gap-2 w-48 h-48 mb-8 relative transition-all duration-500';

    // Matriz Diagonal exata que concordamos: 1, 2 no topo / 2, 1 na base
    const logos = ['logo1.png', 'logo2.png', 'logo2.png', 'logo1.png'];
    const cardElements = [];
    
    logos.forEach((logo, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card w-full h-full pointer-events-none';
        card.innerHTML = `
            <div class="memory-card-inner">
                <!-- VERSO: Marca d'água cinza e quase transparente da logo1 -->
                <div class="memory-card-back">
                    <img src="logo1.png" alt="watermark" class="w-3/5 h-3/5 object-contain opacity-20 grayscale" onerror="this.outerHTML='<i class=\\'ti ti-brand-github text-slate-300 text-2xl\\'></i>'">
                </div>
                <!-- FRENTE: A logo correspondente da matriz -->
                <div class="memory-card-front p-2">
                    <img src="${logo}" alt="Logo" class="max-w-full max-h-full object-contain" onerror="this.outerHTML='<i class=\\'ti ti-brand-github text-blue-600 text-3xl\\'></i>'">
                </div>
            </div>
        `;
        grid.appendChild(card);
        cardElements.push(card);
    });

    // COREOGRAFIA DO MINI-JOGO DE BOAS-VINDAS:
    // Passo 1: Vira a carta 0 e a carta 3 (Os pares de Logo 1)
    lobbyAnimationTimers.push(setTimeout(() => {
        if (!grid.contains(cardElements[0])) return;
        cardElements[0].classList.add('is-flipped');
        cardElements[3].classList.add('is-flipped');
    }, 400));

    // Passo 2: Eles brilham dourado (deu par!) e a carta de baixo se funde na de cima
    lobbyAnimationTimers.push(setTimeout(() => {
        if (!grid.contains(cardElements[0])) return;
        cardElements[0].classList.add('is-matched');
        cardElements[3].classList.add('is-matched', 'animate-merge-1');
    }, 1100));

    // Passo 3: Vira a carta 1 e a carta 2 (Os pares de Logo 2)
    lobbyAnimationTimers.push(setTimeout(() => {
        if (!grid.contains(cardElements[1])) return;
        cardElements[1].classList.add('is-flipped');
        cardElements[2].classList.add('is-flipped');
    }, 1700));

    // Passo 4: Brilham dourado e a Logo 2 de baixo se funde na Logo 2 de cima
    lobbyAnimationTimers.push(setTimeout(() => {
        if (!grid.contains(cardElements[1])) return;
        cardElements[1].classList.add('is-matched');
        cardElements[2].classList.add('is-matched', 'animate-merge-2');
    }, 2400));

    // Passo 5: As duas cartas de baixo desaparecem do DOM, deixando [ Logo 1 ] [ Logo 2 ] perfeitas no topo!
    lobbyAnimationTimers.push(setTimeout(() => {
        if (!grid.contains(cardElements[2])) return;
        cardElements[2].style.visibility = 'hidden';
        cardElements[3].style.visibility = 'hidden';
        // Encolhe a grade suavemente para abraçar as duas logos que restaram lado a lado
        grid.classList.remove('h-48');
        grid.classList.add('h-24');
    }, 3000));
}

// --- 5. GESTÃO DE EVENTOS (CLIQUE NOS BOTÕES) ---
function setupEventListeners() {
    document.getElementById('btn-show-difficulty')?.addEventListener('click', () => switchScreen('difficulty-screen'));
    document.getElementById('btn-back-lobby')?.addEventListener('click', () => switchScreen('lobby-screen'));
    document.getElementById('btn-back-from-game')?.addEventListener('click', returnToMenu);
    
    document.getElementById('btn-endgame-menu')?.addEventListener('click', () => {
        closeModal('endgame-modal');
        returnToMenu();
    });
    document.getElementById('btn-endgame-retry')?.addEventListener('click', () => {
        closeModal('endgame-modal');
        startNewGame(currentLevel);
    });
    document.getElementById('btn-endgame-ranking')?.addEventListener('click', () => {
        closeModal('endgame-modal');
        openRankingModal(currentLevel);
    });

    document.getElementById('btn-restart-game')?.addEventListener('click', () => startNewGame(currentLevel));
    document.getElementById('btn-show-ranking-game')?.addEventListener('click', () => openRankingModal(currentLevel));
    document.getElementById('btn-show-ranking-lobby')?.addEventListener('click', () => openRankingModal('facil'));

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const level = e.currentTarget.getAttribute('data-level');
            startNewGame(level);
        });
    });

    document.querySelectorAll('.rank-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabLevel = e.currentTarget.getAttribute('data-rank-tab');
            renderRankingList(tabLevel);
            updateTabUI(tabLevel);
        });
    });

    document.getElementById('btn-close-ranking')?.addEventListener('click', () => closeModal('ranking-modal'));
    document.getElementById('btn-save-score')?.addEventListener('click', handleSaveScore);
}

// --- 6. CONTROLE DE TELAS ---
function switchScreen(screenId) {
    const screens = ['lobby-screen', 'difficulty-screen', 'game-screen'];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === screenId) {
            el.classList.remove('hidden');
            setTimeout(() => el.classList.remove('opacity-0'), 10);
        } else {
            el.classList.add('hidden', 'opacity-0');
        }
    });
}

function returnToMenu() {
    stopTimer();
    switchScreen('lobby-screen');
    initLobbyAnimation(); // Reinicia o espetáculo da fusão do Lobby
}

// --- 7. INICIALIZAÇÃO DE UMA NOVA PARTIDA ---
function startNewGame(level) {
    currentLevel = level;
    const config = LEVELS_CONFIG[level];
    
    const badge = document.getElementById('game-level-badge');
    if (badge) {
        badge.textContent = level.toUpperCase();
        badge.className = `uppercase text-xs font-extrabold tracking-wider px-3 py-1 rounded-full border ${
            level === 'facil' ? 'bg-green-100 text-green-700 border-green-200' :
            level === 'medio' ? 'bg-blue-100 text-blue-700 border-blue-200' :
            'bg-red-100 text-red-700 border-red-200'
        }`;
    }

    document.getElementById('total-pairs-counter').textContent = config.pairs;
    document.getElementById('matched-counter').textContent = '0';
    
    const deckContainer = document.getElementById('collected-deck-container');
    if (deckContainer) {
        deckContainer.classList.add('opacity-0', 'translate-y-10');
    }

    stopTimer();
    secondsElapsed = config.timeLimit ? config.timeLimit : 0;
    updateTimerDisplay();
    matchedPairs = 0;
    hasFlippedCard = false;
    firstCard = null;
    secondCard = null;
    lockBoard = true;

    setupBoardGrid(config);
    switchScreen('game-screen');
}

// --- 8. GERADOR DE TABULEIRO E EMBARALHAMENTO ---
function setupBoardGrid(config) {
    const board = document.getElementById('board-grid');
    if (!board) return;
    
    board.innerHTML = '';
    board.className = `grid gap-2 sm:gap-3 w-full flex-1 place-content-center perspective-1000 ${config.gridClass}`;

    const pairsArray = [...config.images, ...config.images];
    
    // Algoritmo de Fisher-Yates
    for (let i = pairsArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairsArray[i], pairsArray[j]] = [pairsArray[j], pairsArray[i]];
    }

    pairsArray.forEach((imgName, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card w-full h-full';
        card.dataset.image = imgName;
        card.dataset.index = index;

        card.innerHTML = `
            <div class="memory-card-inner">
                <!-- VERSO: A logo1 em cinza marca d'água de 20% opacidade -->
                <div class="memory-card-back">
                    <img src="logo1.png" alt="watermark" class="w-3/5 h-3/5 object-contain opacity-20 grayscale pointer-events-none select-none" onerror="this.outerHTML='<i class=\\'ti ti-brand-github text-slate-300 text-2xl\\'></i>'">
                </div>
                <!-- FRENTE: A imagem ocupando 100% (edge-to-edge / sangria total) -->
                <div class="memory-card-front">
                    <img src="assets/${imgName}" alt="Carta" class="card-image-full" onerror="this.outerHTML='<i class=\\'ti ti-photo text-blue-400 text-2xl\\'></i>'">
                </div>
            </div>
        `;

        card.addEventListener('click', () => flipCard(card));
        board.appendChild(card);
    });

    const allCards = board.querySelectorAll('.memory-card');
    
    if (config.hasPreview) {
        setTimeout(() => {
            allCards.forEach(c => c.classList.add('is-flipped'));
        }, 300);

        setTimeout(() => {
            allCards.forEach(c => c.classList.remove('is-flipped'));
            lockBoard = false;
        }, 300 + config.previewTime);
    } else {
        setTimeout(() => {
            lockBoard = false;
        }, 500);
    }
}

// --- 9. MECÂNICA DE VIRAR AS CARTAS ---
function flipCard(card) {
    if (lockBoard) return;
    if (card === firstCard) return;
    if (card.classList.contains('is-flipped') || card.classList.contains('is-matched')) return;

    if (!isTimerRunning) {
        startTimer();
    }

    card.classList.add('is-flipped');

    if (!hasFlippedCard) {
        hasFlippedCard = true;
        firstCard = card;
        return;
    }

    secondCard = card;
    checkForMatch();
}

function checkForMatch() {
    const isMatch = firstCard.dataset.image === secondCard.dataset.image;

    if (isMatch) {
        disableMatchedCards();
    } else {
        unflipCards();
    }
}

// --- 10. CARTAS IGUAIS: VOO PARA O MONTE ---
function disableMatchedCards() {
    lockBoard = true;
    matchedPairs++;
    
    const counterEl = document.getElementById('matched-counter');
    if (counterEl) counterEl.textContent = matchedPairs;

    const deckContainer = document.getElementById('collected-deck-container');
    const deckBox = document.getElementById('collected-deck');
    if (deckContainer) {
        deckContainer.classList.remove('opacity-0', 'translate-y-10');
        deckBox?.classList.add('animate-deck-pulse');
        setTimeout(() => deckBox?.classList.remove('animate-deck-pulse'), 400);
    }

    firstCard.classList.add('is-matched');
    secondCard.classList.add('is-matched');

    setTimeout(() => {
        firstCard.classList.add('is-flying');
        secondCard.classList.add('is-flying');

        setTimeout(() => {
            firstCard.classList.add('is-hidden-space');
            secondCard.classList.add('is-hidden-space');
            resetBoard();

            if (matchedPairs === LEVELS_CONFIG[currentLevel].pairs) {
                handleGameWin();
            }
        }, 650);
    }, 350);
}

// --- 11. CARTAS DIFERENTES: ESCONDE NOVAMENTE ---
function unflipCards() {
    lockBoard = true;
    setTimeout(() => {
        firstCard.classList.remove('is-flipped');
        secondCard.classList.remove('is-flipped');
        resetBoard();
    }, 1000);
}

function resetBoard() {
    [hasFlippedCard, lockBoard] = [false, false];
    [firstCard, secondCard] = [null, null];
}

// --- 12. GESTÃO DO CRONÔMETRO ---
function startTimer() {
    stopTimer();
    isTimerRunning = true;
    const config = LEVELS_CONFIG[currentLevel];

    timerInterval = setInterval(() => {
        if (config.timeLimit) {
            secondsElapsed--;
            updateTimerDisplay();

            if (secondsElapsed <= 0) {
                handleGameOver();
            }
        } else {
            secondsElapsed++;
            updateTimerDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerRunning = false;
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    if (!display) return;

    const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    
    display.querySelector('span').textContent = `${mins}:${secs}`;

    if (LEVELS_CONFIG[currentLevel].timeLimit && secondsElapsed <= 15) {
        display.classList.add('bg-red-100', 'text-red-600', 'border-red-300', 'animate-pulse');
    } else {
        display.classList.remove('bg-red-100', 'text-red-600', 'border-red-300', 'animate-pulse');
    }
}

// --- 13. FIM DE JOGO ---
function handleGameWin() {
    stopTimer();
    const config = LEVELS_CONFIG[currentLevel];
    const finalTimeSeconds = config.timeLimit ? (config.timeLimit - secondsElapsed) : secondsElapsed;
    
    const mins = String(Math.floor(finalTimeSeconds / 60)).padStart(2, '0');
    const secs = String(finalTimeSeconds % 60).padStart(2, '0');
    const formattedTime = `${mins}:${secs}`;

    document.getElementById('endgame-icon').className = 'ti ti-trophy text-5xl text-amber-500';
    document.getElementById('endgame-icon-container').className = 'w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center bg-amber-100 shadow-inner';
    document.getElementById('endgame-title').textContent = '🎉 Incrível, Você Venceu!';
    document.getElementById('endgame-message').textContent = `Você memorizou todos os ${config.pairs} pares em tempo recorde de ${formattedTime}!`;

    const isTop10 = checkIfTop10(currentLevel, finalTimeSeconds);
    const recordSection = document.getElementById('record-section');
    
    if (isTop10) {
        recordSection?.classList.remove('hidden');
        recordSection.dataset.score = finalTimeSeconds;
        recordSection.dataset.timeStr = formattedTime;
    } else {
        recordSection?.classList.add('hidden');
    }

    openModal('endgame-modal');
}

function handleGameOver() {
    stopTimer();
    lockBoard = true;

    document.getElementById('endgame-icon').className = 'ti ti-alarm-off text-5xl text-red-500';
    document.getElementById('endgame-icon-container').className = 'w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-100 shadow-inner';
    document.getElementById('endgame-title').textContent = '💥 O Tempo Acabou!';
    document.getElementById('endgame-message').textContent = 'A grade de 42 cartas foi mais rápida desta vez. Respire fundo e tente novamente!';
    
    document.getElementById('record-section')?.classList.add('hidden');

    openModal('endgame-modal');
}

// --- 14. RANKING GLOBAL E LOCALSTORAGE ---
async function loadRankingData() {
    try {
        const response = await fetch('ranking.json');
        if (response.ok) {
            const data = await response.json();
            rankingData = { ...rankingData, ...data };
        }
    } catch (e) {
        console.info('Executando no modo offline/local.');
    }

    const localRanking = localStorage.getItem('memory_game_ranking');
    if (localRanking) {
        try {
            const parsed = JSON.parse(localRanking);
            ['facil', 'medio', 'dificil'].forEach(lvl => {
                rankingData[lvl] = [...(rankingData[lvl] || []), ...(parsed[lvl] || [])]
                    .sort((a, b) => a.tempoSegundos - b.tempoSegundos)
                    .slice(0, 10);
            });
        } catch (e) {}
    }
}

function checkIfTop10(level, timeSeconds) {
    const list = rankingData[level] || [];
    if (list.length < 10) return true;
    return timeSeconds < list[list.length - 1].tempoSegundos;
}

function handleSaveScore() {
    const input = document.getElementById('player-name-input');
    const name = input?.value.trim() || 'Anônimo @Dev';
    const recordSection = document.getElementById('record-section');
    
    const timeSeconds = parseInt(recordSection.dataset.score, 10);
    const timeStr = recordSection.dataset.timeStr;

    const newRecord = {
        nome: name,
        tempoSegundos: timeSeconds,
        tempoFormatado: timeStr,
        data: new Date().toLocaleDateString('pt-BR')
    };

    rankingData[currentLevel].push(newRecord);
    rankingData[currentLevel].sort((a, b) => a.tempoSegundos - b.tempoSegundos);
    rankingData[currentLevel] = rankingData[currentLevel].slice(0, 10);

    localStorage.setItem('memory_game_ranking', JSON.stringify(rankingData));

    const btnSave = document.getElementById('btn-save-score');
    if (btnSave) {
        btnSave.textContent = 'Salvo! ✓';
        btnSave.disabled = true;
        btnSave.className = 'bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm opacity-80 cursor-not-allowed';
    }

    setTimeout(() => {
        closeModal('endgame-modal');
        openRankingModal(currentLevel);
    }, 800);
}

function renderRankingList(level) {
    const listContainer = document.getElementById('ranking-list');
    if (!listContainer) return;

    const list = rankingData[level] || [];
    listContainer.innerHTML = '';

    if (list.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <i class="ti ti-trophy-off text-4xl text-slate-300 mb-2 block"></i>
                <p class="font-bold text-slate-600 text-sm">Aguardando o primeiro campeão!</p>
                <p class="text-xs text-slate-400 mt-0.5">Jogue no nível ${level.toUpperCase()} e registre seu nome no placar.</p>
            </div>
        `;
        return;
    }

    list.forEach((item, idx) => {
        const isTop3 = idx < 3;
        const medalIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;
        
        const row = document.createElement('div');
        row.className = `flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all ${
            idx === 0 ? 'bg-amber-50/80 border-amber-200 shadow-sm' :
            idx === 1 ? 'bg-slate-100 border-slate-300' :
            idx === 2 ? 'bg-orange-50/50 border-orange-200' :
            'bg-white border-slate-100 hover:border-slate-200'
        }`;

        row.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="w-7 text-center font-extrabold ${isTop3 ? 'text-base' : 'text-xs text-slate-400'}">${medalIcon}</span>
                <div>
                    <h4 class="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        ${item.nome}
                        ${idx === 0 ? '<i class="ti ti-crown text-amber-500 text-sm"></i>' : ''}
                    </h4>
                    <span class="text-[10px] font-semibold text-slate-400 block">${item.data || 'Hoje'}</span>
                </div>
            </div>
            <div class="font-mono font-extrabold text-sm sm:text-base ${idx === 0 ? 'text-amber-700' : 'text-slate-700'} bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/60">
                ⏱️ ${item.tempoFormatado}
            </div>
        `;
        listContainer.appendChild(row);
    });
}

// --- 15. UTILS E MODAIS ---
function openRankingModal(defaultLevel = 'facil') {
    renderRankingList(defaultLevel);
    updateTabUI(defaultLevel);
    openModal('ranking-modal');
}

function updateTabUI(activeLevel) {
    document.querySelectorAll('.rank-tab-btn').forEach(btn => {
        const tabLevel = btn.getAttribute('data-rank-tab');
        if (tabLevel === activeLevel) {
            btn.className = 'rank-tab-btn flex-1 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-white text-blue-600 shadow-sm transition-all';
        } else {
            btn.className = 'rank-tab-btn flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 transition-all';
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div')?.classList.remove('scale-95');
    }, 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('opacity-0');
    modal.querySelector('div')?.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}
