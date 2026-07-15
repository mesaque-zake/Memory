/* ==========================================================================
   MEMORY GAME - ENGINE PRINCIPAL (by Mesaque)
   Arquitetura: Vanilla JS + Tailwind CSS + Tabler Icons + Confetti
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
let currentCombo = 0; // Motor de Combo 🔥
let rankingData = { facil: [], medio: [], dificil: [] };
let lobbyAnimationTimers = [];

// --- 3. INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initLobbyAnimation();
    loadRankingData();
    setupEventListeners();
});

// --- 4. ANIMAÇÃO DO LOBBY (MATRIZ DIAGONAL EM "X") ---
function initLobbyAnimation() {
    const grid = document.getElementById('logo-animation-grid');
    if (!grid) return;
    
    lobbyAnimationTimers.forEach(t => clearTimeout(t));
    lobbyAnimationTimers = [];
    
    grid.innerHTML = '';
    grid.className = 'grid grid-cols-2 gap-2 w-48 h-48 mb-6 relative transition-all duration-500';

    // Matriz Diagonal em X: 1, 2 no topo / 2, 1 na base
    const logos = ['logo1.png', 'logo2.png', 'logo2.png', 'logo1.png'];
    const cardElements = [];
    
    logos.forEach((logo, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card w-full h-full pointer-events-none';
        card.innerHTML = `
            <div class="memory-card-inner">
                <div class="memory-card-back">
                    <img src="logo1.png" alt="watermark" class="w-3/5 h-3/5 object-contain opacity-20 grayscale pointer-events-none select-none" onerror="this.outerHTML='<i class=\\'ti ti-brand-github text-slate-300 text-2xl\\'></i>'">
                </div>
                <div class="memory-card-front p-2">
                    <img src="${logo}" alt="Logo" class="max-w-full max-h-full object-contain" onerror="this.outerHTML='<i class=\\'ti ti-brand-github text-blue-600 text-3xl\\'></i>'">
                </div>
            </div>
        `;
        grid.appendChild(card);
        cardElements.push(card);
    });

    // Passo 1: Vira os pares da Logo 1 (Índice 0 superior-esq e 3 inferior-dir)
    lobbyAnimationTimers.push(setTimeout(() => {
        if (!grid.contains(cardElements[0])) return;
        cardElements[0].classList.add('is-flipped');
        cardElements[3].classList.add('is-flipped');
    }, 400));

    // Passo 2: Carta 3 salta na DIAGONAL EM X para se unir à Carta 0
    lobbyAnimationTimers.push(setTimeout(() => {
        if (!grid.contains(cardElements[0])) return;
        cardElements[0].classList.add('is-matched');
        cardElements[3].classList.add('is-matched', 'animate-merge-diagonal-1');
    }, 1100));

    // Passo 3: Vira os pares da Logo 2 (Índice 1 superior-dir e 2 inferior-esq)
    lobbyAnimationTimers.push(setTimeout(() => {
        if (!grid.contains(cardElements[1])) return;
        cardElements[1].classList.add('is-flipped');
        cardElements[2].classList.add('is-flipped');
    }, 1700));

    // Passo 4: Carta 2 salta na DIAGONAL EM X para se unir à Carta 1
    lobbyAnimationTimers.push(setTimeout(() => {
        if (!grid.contains(cardElements[1])) return;
        cardElements[1].classList.add('is-matched');
        cardElements[2].classList.add('is-matched', 'animate-merge-diagonal-2');
    }, 2400));

    // Passo 5: Restam apenas [ Logo 1 ] [ Logo 2 ] perfeitas lado a lado!
    lobbyAnimationTimers.push(setTimeout(() => {
        if (!grid.contains(cardElements[2])) return;
        cardElements[2].style.visibility = 'hidden';
        cardElements[3].style.visibility = 'hidden';
        grid.classList.remove('h-48');
        grid.classList.add('h-24');
    }, 3050));
}

// --- 5. GESTÃO DE EVENTOS ---
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

// --- 6. CONTROLE DE TELAS (COM ISOLAMENTO DO RODAPÉ) ---
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

    // REGRA DO RODAPÉ: Só aparece na tela do Lobby!
    const footer = document.getElementById('footer');
    if (footer) {
        if (screenId === 'lobby-screen') {
            footer.classList.remove('opacity-0', 'pointer-events-none');
            footer.style.display = 'flex';
        } else {
            footer.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => { if (screenId !== 'lobby-screen') footer.style.display = 'none'; }, 300);
        }
    }
}

function returnToMenu() {
    stopTimer();
    switchScreen('lobby-screen');
    initLobbyAnimation();
}

// --- 7. INICIALIZAÇÃO DE UMA NOVA PARTIDA ---
function startNewGame(level) {
    currentLevel = level;
    const config = LEVELS_CONFIG[level];
    
    const badge = document.getElementById('game-level-badge');
    if (badge) {
        badge.textContent = level.toUpperCase();
        badge.className = `uppercase text-[10px] sm:text-xs font-extrabold tracking-wider px-2.5 py-1 rounded-full border ${
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

    // Reseta cronômetro e motor de COMBO
    stopTimer();
    currentCombo = 0;
    updateComboUI();
    
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

// --- 8. GERADOR DE TABULEIRO ---
function setupBoardGrid(config) {
    const board = document.getElementById('board-grid');
    if (!board) return;
    
    board.innerHTML = '';
    board.className = `grid gap-2 sm:gap-3 w-full flex-1 place-content-center perspective-1000 ${config.gridClass}`;

    const pairsArray = [...config.images, ...config.images];
    
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
                <div class="memory-card-back">
                    <img src="logo1.png" alt="watermark" class="w-3/5 h-3/5 object-contain opacity-20 grayscale pointer-events-none select-none" onerror="this.outerHTML='<i class=\\'ti ti-brand-github text-slate-300 text-2xl\\'></i>'">
                </div>
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
        handleComboSuccess();
        disableMatchedCards();
    } else {
        handleComboBreak();
        unflipCards();
    }
}

// --- 10. MOTOR DE COMBO 🔥 ---
function handleComboSuccess() {
    currentCombo++;
    updateComboUI();

    // Se estiver no Modo Difícil, COMBO ganha +3 SEGUNDOS de bônus no relógio!
    if (LEVELS_CONFIG[currentLevel].timeLimit && currentCombo >= 2) {
        secondsElapsed += 3;
        updateTimerDisplay();
        
        // Efeito visual no relógio mostrando que ganhou tempo
        const display = document.getElementById('timer-display');
        display?.classList.add('bg-green-100', 'text-green-600', 'border-green-400');
        setTimeout(() => display?.classList.remove('bg-green-100', 'text-green-600', 'border-green-400'), 600);
    }
}

function handleComboBreak() {
    currentCombo = 0;
    updateComboUI();
}

function updateComboUI() {
    const badge = document.getElementById('combo-badge');
    const text = document.getElementById('combo-text');
    if (!badge || !text) return;

    if (currentCombo >= 2) {
        text.textContent = `${currentCombo}x COMBO!`;
        badge.classList.remove('hidden');
        badge.classList.add('flex');
    } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
    }
}

// --- 11. CARTAS IGUAIS: VOO PARA O MONTE ---
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

// --- 12. CARTAS DIFERENTES ---
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

// --- 13. GESTÃO DO CRONÔMETRO ---
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

// --- 14. FIM DE JOGO COM CHUVA DE CONFETES 🎉 ---
function handleGameWin() {
    stopTimer();
    const config = LEVELS_CONFIG[currentLevel];
    const finalTimeSeconds = config.timeLimit ? (config.timeLimit - secondsElapsed) : secondsElapsed;
    
    const mins = String(Math.floor(finalTimeSeconds / 60)).padStart(2, '0');
    const secs = String(finalTimeSeconds % 60).padStart(2, '0');
    const formattedTime = `${mins}:${secs}`;

    const isMobile = window.innerWidth < 640; // Detecta se é celular

    // 1. REMOVE O BLUR NO CELULAR E ESCURECE O FUNDO (Mata o clarão branco da GPU na hora!)
    const endgameModal = document.getElementById('endgame-modal');
    if (isMobile && endgameModal) {
        endgameModal.classList.remove('backdrop-blur-md', 'backdrop-blur-sm');
        endgameModal.classList.add('bg-slate-900/95'); // Fundo sólido escurinho para compensar sem pesar
    }

    // 2. DISPARA A CHUVA DE CONFETES (1 SEGUNDO DE DELAY NO MOBILE + 80 CONFETES)
    if (typeof confetti === 'function') {
        const delay = isMobile ? 1000 : 500; // 1 seg no celular, 0.5 seg no PC
        
        setTimeout(() => {
            if (isMobile) {
                // Modo Celular: 80 confetes após 1 seg exato, com a tela já aberta e leve!
                confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            } else {
                // Modo Desktop: Show completo em 3 ondas
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                setTimeout(() => {
                    confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
                    confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
                }, 400);
            }
        }, delay);
    }

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

// --- 15. RANKING GLOBAL E LOCALSTORAGE ---
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
