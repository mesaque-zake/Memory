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
        previewTime: 1000, // 1 segundo de espiadinha
        hasPreview: true,
        timeLimit: null,   // Cronômetro livre (crescente)
        images: [
            'saco.png', 'tablet.png', 'luva.png', 'alcool.png', 
            'celular.png', 'pead.png', 'caixa.png', 'carinho.png'
        ]
    },
    medio: {
        gridClass: 'grid-medio',
        totalCards: 30,
        pairs: 15,
        previewTime: 1000, // 1 segundo de espiadinha
        hasPreview: true,
        timeLimit: null,   // Cronômetro livre (crescente)
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
        previewTime: 0,    // SEM espiadinha! (Acordo blindado)
        hasPreview: false,
        timeLimit: 120,    // 2 minutos (120 segundos regressivos)
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
let lockBoard = true; // Começa travado até a intro/espiadinha terminar
let matchedPairs = 0;
let timerInterval = null;
let secondsElapsed = 0;
let isTimerRunning = false;
let rankingData = { facil: [], medio: [], dificil: [] };

// --- 3. INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initLobbyAnimation();
    loadRankingData();
    setupEventListeners();
});

// --- 4. ANIMAÇÃO DA TELA DE BOAS-VINDAS (LOBBY 2x2) ---
function initLobbyAnimation() {
    const grid = document.getElementById('logo-animation-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const logos = ['logo1.png', 'logo2.png', 'logo1.png', 'logo2.png'];
    
    logos.forEach((logo, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card w-full h-full';
        card.innerHTML = `
            <div class="memory-card-inner logo-card-inner">
                <div class="memory-card-back bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                    <i class="ti ti-question-mark text-slate-300 text-2xl font-bold"></i>
                </div>
                <div class="memory-card-front bg-white border-2 border-blue-400 shadow-md rounded-xl p-2 flex items-center justify-center">
                    <!-- Tenta carregar a logo, se der erro mostra um ícone elegante sem sujar o F12 -->
                    <img src="${logo}" alt="Logo" class="max-w-full max-h-full object-contain" onerror="this.outerHTML='<i class=\\'ti ti-brand-github text-blue-600 text-3xl\\'></i>'">
                </div>
            </div>
        `;
        grid.appendChild(card);

        // Animação coreografada das 4 cartas virando no lobby
        setTimeout(() => {
            card.classList.add('is-flipped');
        }, 300 + (index * 200));
    });
}

// --- 5. GESTÃO DE EVENTOS (CLIQUE NOS BOTÕES) ---
function setupEventListeners() {
    // Navegação entre telas
    document.getElementById('btn-show-difficulty')?.addEventListener('click', () => switchScreen('difficulty-screen'));
    document.getElementById('btn-back-lobby')?.addEventListener('click', () => switchScreen('lobby-screen'));
    document.getElementById('btn-back-from-game')?.addEventListener('click', returnToMenu);
    
    // Botões do Modal de Fim de Jogo
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

    // Ações Rápidas no Topo do Jogo
    document.getElementById('btn-restart-game')?.addEventListener('click', () => startNewGame(currentLevel));
    document.getElementById('btn-show-ranking-game')?.addEventListener('click', () => openRankingModal(currentLevel));
    document.getElementById('btn-show-ranking-lobby')?.addEventListener('click', () => openRankingModal('facil'));

    // Botões de Dificuldade
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const level = e.currentTarget.getAttribute('data-level');
            startNewGame(level);
        });
    });

    // Abas do Modal de Ranking
    document.querySelectorAll('.rank-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabLevel = e.currentTarget.getAttribute('data-rank-tab');
            renderRankingList(tabLevel);
            updateTabUI(tabLevel);
        });
    });

    // Fechar Ranking
    document.getElementById('btn-close-ranking')?.addEventListener('click', () => closeModal('ranking-modal'));

    // Salvar Recorde
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
            // Pequeno delay para acionar a transição suave do Tailwind
            setTimeout(() => el.classList.remove('opacity-0'), 10);
        } else {
            el.classList.add('hidden', 'opacity-0');
        }
    });
}

function returnToMenu() {
    stopTimer();
    switchScreen('lobby-screen');
    initLobbyAnimation(); // Reinicia o charme do Lobby 2x2
}

// --- 7. INICIALIZAÇÃO DE UMA NOVA PARTIDA ---
function startNewGame(level) {
    currentLevel = level;
    const config = LEVELS_CONFIG[level];
    
    // Atualiza a UI da Tela de Jogo
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
    
    // Esconde o deck de cartas conquistadas no início
    const deckContainer = document.getElementById('collected-deck-container');
    if (deckContainer) {
        deckContainer.classList.add('opacity-0', 'translate-y-10');
    }

    // Reseta variáveis globais da partida
    stopTimer();
    secondsElapsed = config.timeLimit ? config.timeLimit : 0;
    updateTimerDisplay();
    matchedPairs = 0;
    hasFlippedCard = false;
    firstCard = null;
    secondCard = null;
    lockBoard = true; // Trava o clique até as cartas serem distribuídas

    // Monta o Tabuleiro
    setupBoardGrid(config);
    switchScreen('game-screen');
}

// --- 8. GERADOR DE TABULEIRO E ALGORITMO DE EMBARALHAMENTO ---
function setupBoardGrid(config) {
    const board = document.getElementById('board-grid');
    if (!board) return;
    
    board.innerHTML = '';
    board.className = `grid gap-2 sm:gap-3 w-full flex-1 place-content-center perspective-1000 ${config.gridClass}`;

    // Duplica as imagens para formar os pares
    const pairsArray = [...config.images, ...config.images];
    
    // Algoritmo de Fisher-Yates (Embaralhamento científico e sem padrões)
    for (let i = pairsArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairsArray[i], pairsArray[j]] = [pairsArray[j], pairsArray[i]];
    }

    // Cria as cartas no DOM
    pairsArray.forEach((imgName, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card w-full h-full';
        card.dataset.image = imgName;
        card.dataset.index = index;

        card.innerHTML = `
            <div class="memory-card-inner">
                <div class="memory-card-back">
                    <i class="ti ti-brand-github text-slate-300 text-xl sm:text-2xl font-bold"></i>
                </div>
                <div class="memory-card-front">
                    <!-- Busca na pasta /assets/ criada por você -->
                    <img src="assets/${imgName}" alt="Carta" onerror="this.outerHTML='<i class=\\'ti ti-photo text-blue-400 text-2xl\\'></i>'">
                </div>
            </div>
        `;

        card.addEventListener('click', () => flipCard(card));
        board.appendChild(card);
    });

    // Lógica de "Espiadinha" (Apenas Fácil e Médio)
    const allCards = board.querySelectorAll('.memory-card');
    
    if (config.hasPreview) {
        // Mostra todas as cartas rapidamente
        setTimeout(() => {
            allCards.forEach(c => c.classList.add('is-flipped'));
        }, 300);

        // Vira de volta após 1 segundo e LIBERA o tabuleiro para jogar!
        setTimeout(() => {
            allCards.forEach(c => c.classList.remove('is-flipped'));
            lockBoard = false;
        }, 300 + config.previewTime);
    } else {
        // Modo Difícil: Libera o clique após 500ms da montagem sem espiadinha!
        setTimeout(() => {
            lockBoard = false;
        }, 500);
    }
}

// --- 9. MECÂNICA DE VIRAR AS CARTAS E VERIFICAR PARES ---
function flipCard(card) {
    // Travas Anti-Bug blindadas:
    if (lockBoard) return;
    if (card === firstCard) return; // Impede clique duplo na mesma carta
    if (card.classList.contains('is-flipped') || card.classList.contains('is-matched')) return;

    // Inicia o cronômetro EXATAMENTE no primeiro clique bem-sucedido da partida!
    if (!isTimerRunning) {
        startTimer();
    }

    card.classList.add('is-flipped');

    if (!hasFlippedCard) {
        // Primeiro clique da rodada
        hasFlippedCard = true;
        firstCard = card;
        return;
    }

    // Segundo clique da rodada
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

// --- 10. CARTAS IGUAIS: ANIMAÇÃO DE VOO PARA O MONTE ---
function disableMatchedCards() {
    lockBoard = true; // Trava para evitar cliques durante a animação de voo
    matchedPairs++;
    
    // Atualiza o contador de pares na UI
    const counterEl = document.getElementById('matched-counter');
    if (counterEl) counterEl.textContent = matchedPairs;

    // Mostra o monte de cartas conquistadas no canto da tela
    const deckContainer = document.getElementById('collected-deck-container');
    const deckBox = document.getElementById('collected-deck');
    if (deckContainer) {
        deckContainer.classList.remove('opacity-0', 'translate-y-10');
        deckBox?.classList.add('animate-deck-pulse');
        setTimeout(() => deckBox?.classList.remove('animate-deck-pulse'), 400);
    }

    firstCard.classList.add('is-matched');
    secondCard.classList.add('is-matched');

    // Efeito de voo após 300ms de brilho dourado
    setTimeout(() => {
        firstCard.classList.add('is-flying');
        secondCard.classList.add('is-flying');

        setTimeout(() => {
            // A carta desaparece da visão, MAS SEU BURAKO ESPACIAL É MANTIDO!
            firstCard.classList.add('is-hidden-space');
            secondCard.classList.add('is-hidden-space');
            resetBoard();

            // Verifica se ganhou o jogo!
            if (matchedPairs === LEVELS_CONFIG[currentLevel].pairs) {
                handleGameWin();
            }
        }, 650); // Tempo da animação CSS flyToDeck
    }, 350);
}

// --- 11. CARTAS DIFERENTES: ESCONDE NOVAMENTE ---
function unflipCards() {
    lockBoard = true; // Impede o "Dedo Rápido" de clicar na 3ª carta
    
    setTimeout(() => {
        firstCard.classList.remove('is-flipped');
        secondCard.classList.remove('is-flipped');
        resetBoard();
    }, 1000); // 1 segundo exato para memorizar o erro
}

function resetBoard() {
    [hasFlippedCard, lockBoard] = [false, false];
    [firstCard, secondCard] = [null, null];
}

// --- 12. GESTÃO DO CRONÔMETRO (PROGRESSIVO / REGRESSIVO) ---
function startTimer() {
    stopTimer();
    isTimerRunning = true;
    const config = LEVELS_CONFIG[currentLevel];

    timerInterval = setInterval(() => {
        if (config.timeLimit) {
            // Modo Difícil (Regressivo)
            secondsElapsed--;
            updateTimerDisplay();

            if (secondsElapsed <= 0) {
                handleGameOver();
            }
        } else {
            // Modo Fácil e Médio (Progressivo)
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

    // Efeito de alerta vermelho quando restam 15 segundos no Modo Difícil
    if (LEVELS_CONFIG[currentLevel].timeLimit && secondsElapsed <= 15) {
        display.classList.add('bg-red-100', 'text-red-600', 'border-red-300', 'animate-pulse');
    } else {
        display.classList.remove('bg-red-100', 'text-red-600', 'border-red-300', 'animate-pulse');
    }
}

// --- 13. FIM DE JOGO: VITÓRIA & GAME OVER ---
function handleGameWin() {
    stopTimer();
    
    // Tempo final consumido para o cálculo de ranking
    const config = LEVELS_CONFIG[currentLevel];
    const finalTimeSeconds = config.timeLimit ? (config.timeLimit - secondsElapsed) : secondsElapsed;
    
    const mins = String(Math.floor(finalTimeSeconds / 60)).padStart(2, '0');
    const secs = String(finalTimeSeconds % 60).padStart(2, '0');
    const formattedTime = `${mins}:${secs}`;

    // Monta o Modal de Vitória
    document.getElementById('endgame-icon').className = 'ti ti-trophy text-5xl text-amber-500';
    document.getElementById('endgame-icon-container').className = 'w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center bg-amber-100 shadow-inner';
    document.getElementById('endgame-title').textContent = '🎉 Incrível, Você Venceu!';
    document.getElementById('endgame-message').textContent = `Você memorizou todos os ${config.pairs} pares em tempo recorde de ${formattedTime}!`;

    // Verifica se entrou no Top 10
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
    lockBoard = true; // Trava o tabuleiro imediatamente

    // Monta o Modal de Derrota (Exclusivo Modo Difícil)
    document.getElementById('endgame-icon').className = 'ti ti-alarm-off text-5xl text-red-500';
    document.getElementById('endgame-icon-container').className = 'w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-100 shadow-inner';
    document.getElementById('endgame-title').textContent = '💥 O Tempo Acabou!';
    document.getElementById('endgame-message').textContent = 'A grade de 42 cartas foi mais rápida desta vez. Respire fundo e tente novamente!';
    
    document.getElementById('record-section')?.classList.add('hidden');

    openModal('endgame-modal');
}

// --- 14. SISTEMA DE RANKING GLOBAL (COM FALLBACK EM LOCALSTORAGE) ---
async function loadRankingData() {
    try {
        // Tenta buscar do arquivo online no GitHub Pages
        const response = await fetch('ranking.json');
        if (response.ok) {
            const data = await response.json();
            rankingData = { ...rankingData, ...data };
        }
    } catch (e) {
        // Fallback silencioso sem sujar F12 se estiver jogando local
        console.info('Executando no modo offline/local. Carregando rankings do navegador.');
    }

    // Mescla com recordes salvos no LocalStorage para o próprio usuário não perder suas conquistas
    const localRanking = localStorage.getItem('memory_game_ranking');
    if (localRanking) {
        try {
            const parsed = JSON.parse(localRanking);
            // Combina sem duplicar
            ['facil', 'medio', 'dificil'].forEach(lvl => {
                rankingData[lvl] = [...(rankingData[lvl] || []), ...(parsed[lvl] || [])]
                    .sort((a, b) => a.tempoSegundos - b.tempoSegundos)
                    .slice(0, 10);
            });
        } catch (e) { /* Proteção contra JSON corrompido no navegador */ }
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

    // Insere no ranking da categoria atual e ordena do menor para o maior tempo
    rankingData[currentLevel].push(newRecord);
    rankingData[currentLevel].sort((a, b) => a.tempoSegundos - b.tempoSegundos);
    rankingData[currentLevel] = rankingData[currentLevel].slice(0, 10); // Mantém apenas o Top 10

    // Salva no LocalStorage permanentemente no navegador do usuário
    localStorage.setItem('memory_game_ranking', JSON.stringify(rankingData));

    // Desativa o botão de salvar para evitar duplo registro
    const btnSave = document.getElementById('btn-save-score');
    if (btnSave) {
        btnSave.textContent = 'Salvo! ✓';
        btnSave.disabled = true;
        btnSave.className = 'bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm opacity-80 cursor-not-allowed';
    }

    // Fecha modal de vitória e abre o Ranking celebrando o jogador!
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
        // Nossa regra de OURO: Sem dados fictícios!
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
