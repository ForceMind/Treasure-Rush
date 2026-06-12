import { state } from './state.js';
import { CONFIG, GAME_WIDTH, GAME_HEIGHT, ENTRY_FEE, COLORS, NAMES } from './config.js';
import { Chest, Powerup, Actor } from './entities.js';
import { setupInput } from './input.js';
import { updateUI, showGameOver, updateWalletUI } from './ui.js';

let ctx;

export function initGame() {
    state.actors = [];
    state.chests = [];
    state.powerups = [];
    state.particles = [];
    state.emotes = [];
    state.timeRemaining = CONFIG.gameDuration;
    state.isFeverTime = false;
    state.tapTarget = null;
    
    const feverOverlay = document.getElementById('fever-overlay');
    const feverBanner = document.getElementById('fever-banner');
    if (feverOverlay) feverOverlay.classList.remove('active');
    if (feverBanner) feverBanner.classList.remove('show');

    state.actors.push(new Actor(0, true, COLORS[0], NAMES[0]));

    for (let i = 1; i < state.totalPlayers; i++) {
        state.actors.push(new Actor(i, false, COLORS[i % COLORS.length], NAMES[i]));
    }

    for (let i = 0; i < CONFIG.maxChests; i++) {
        spawnChest();
    }
    
    spawnPowerup();
}

export function spawnChest() {
    let x, y, valid;
    do {
        valid = true;
        x = 50 + Math.random() * (GAME_WIDTH - 100);
        y = 50 + Math.random() * (GAME_HEIGHT - 100);
        for(let a of state.actors) {
            if(Math.hypot(x - a.baseX, y - a.baseY) < 100) {
                valid = false;
                break;
            }
        }
    } while(!valid);

    state.chests.push(new Chest(x, y));
}

export function spawnPowerup() {
    let x = 50 + Math.random() * (GAME_WIDTH - 100);
    let y = 50 + Math.random() * (GAME_HEIGHT - 100);
    state.powerups.push(new Powerup(x, y));
}

export function startGame() {
    if (state.playerWallet < ENTRY_FEE) {
        alert("金币不足！(请刷新页面重置金币)");
        return;
    }
    state.playerWallet -= ENTRY_FEE;
    updateWalletUI();

    initGame();
    state.gameState = 'STARTING';
    state.countdown = 3;
    
    const uiMainMenu = document.getElementById('main-menu');
    const uiGameOver = document.getElementById('game-over');
    const uiHud = document.getElementById('hud');
    const uiMobileControls = document.getElementById('mobile-controls');
    const joystickArea = document.getElementById('joystick-area');
    
    if (uiMainMenu) uiMainMenu.classList.add('hidden');
    if (uiGameOver) uiGameOver.classList.add('hidden');
    if (uiHud) uiHud.classList.remove('hidden');
    if (uiMobileControls) uiMobileControls.classList.remove('hidden');
    
    if (joystickArea) {
        if (state.controlMode === 'tap') {
            joystickArea.style.display = 'none';
            const btnToggle = document.getElementById('btn-toggle-mode');
            if (btnToggle) btnToggle.innerText = '操作: 点击';
        } else {
            // DON'T show it until touched
            if(joystickArea) joystickArea.style.display = 'none';
            const btnToggle = document.getElementById('btn-toggle-mode');
            if (btnToggle) btnToggle.innerText = '操作: 摇杆';
        }
    }

    state.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

export function resetGameToMenu() {
    state.gameState = 'MENU';
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('mobile-controls').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    
    const joystickArea = document.getElementById('joystick-area');
    if (joystickArea) joystickArea.style.display = 'flex';
}

function gameLoop(timestamp) {
    if (state.gameState !== 'PLAYING' && state.gameState !== 'STARTING') return;

    let dt = (timestamp - state.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; 
    state.lastTime = timestamp;

    if (state.gameState === 'STARTING') {
        state.countdown -= dt;
        if (state.countdown <= -1) {
            state.gameState = 'PLAYING';
        }
        draw();
        updateUI();
        requestAnimationFrame(gameLoop);
        return;
    }

    state.timeRemaining -= dt;
    if (state.timeRemaining <= 0) {
        state.timeRemaining = 0;
        state.gameState = 'GAMEOVER';
        showGameOver();
        return;
    }

    if (state.timeRemaining <= CONFIG.feverTimeThreshold && !state.isFeverTime) {
        state.isFeverTime = true;
        const feverOverlay = document.getElementById('fever-overlay');
        const feverBanner = document.getElementById('fever-banner');
        if (feverOverlay) feverOverlay.classList.add('active');
        if (feverBanner) {
            feverBanner.classList.add('show');
            setTimeout(() => feverBanner.classList.remove('show'), 3000);
        }
    }

    state.chestSpawnTimer += dt * 1000;
    if (state.chestSpawnTimer >= CONFIG.chestSpawnInterval) {
        state.chestSpawnTimer = 0;
        let uncarriedChests = state.chests.filter(c => !c.carriedBy).length;
        if (uncarriedChests < CONFIG.maxChests) {
            spawnChest();
        }
    }

    if (Math.random() < 0.005 * dt * 60 && state.powerups.length < CONFIG.maxPowerups) {
        spawnPowerup();
    }

    state.actors.forEach(a => a.update(dt));

    for (let i = 0; i < state.actors.length; i++) {
        for (let j = i + 1; j < state.actors.length; j++) {
            let a1 = state.actors[i];
            let a2 = state.actors[j];
            let dx = a2.x - a1.x;
            let dy = a2.y - a1.y;
            let dist = Math.hypot(dx, dy);
            let minDist = a1.radius + a2.radius;
            
            if (dist < minDist && dist > 0) {
                let overlap = minDist - dist;
                let nx = dx / dist;
                let ny = dy / dist;
                a1.x -= nx * overlap * 0.5;
                a1.y -= ny * overlap * 0.5;
                a2.x += nx * overlap * 0.5;
                a2.y += ny * overlap * 0.5;
            }
        }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
        let p = state.particles[i];
        if (p.type === 'shockwave') {
            p.radius += 300 * dt;
            p.alpha -= 2 * dt;
            if (p.alpha <= 0) state.particles.splice(i, 1);
        } else if (p.type === 'spark') {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 2;
            if (p.life <= 0) state.particles.splice(i, 1);
        }
    }

    for (let i = state.emotes.length - 1; i >= 0; i--) {
        let e = state.emotes[i];
        e.y += e.vy * dt;
        e.life -= dt;
        if (e.life <= 0) state.emotes.splice(i, 1);
    }

    draw();
    updateUI();

    requestAnimationFrame(gameLoop);
}

function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (state.gameState === 'STARTING') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let text = Math.ceil(state.countdown).toString();
        if (state.countdown <= 0) text = 'GO!';
        ctx.fillText(text, GAME_WIDTH/2, GAME_HEIGHT/2);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for(let i=0; i<GAME_WIDTH; i+=60) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, GAME_HEIGHT); ctx.stroke();
    }
    for(let i=0; i<GAME_HEIGHT; i+=60) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(GAME_WIDTH, i); ctx.stroke();
    }

    if (state.controlMode === 'tap' && state.tapTarget) {
        ctx.beginPath();
        ctx.arc(state.tapTarget.x, state.tapTarget.y, 10 + Math.sin(performance.now()/100)*5, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    state.powerups.forEach(p => p.draw(ctx));
    state.chests.forEach(c => c.draw(ctx));

    let sortedActorsForDraw = [...state.actors].sort((a,b) => a.y - b.y);
    sortedActorsForDraw.forEach(a => a.draw(ctx));

    state.particles.forEach(p => {
        if (p.type === 'shockwave') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, p.alpha)})`;
            ctx.lineWidth = 5;
            ctx.stroke();
        } else if (p.type === 'spark') {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    });

    state.emotes.forEach(e => {
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, Math.min(1, e.life));
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(e.x, e.y - 8, 16, 0, Math.PI*2);
        ctx.fill();
        ctx.fillText(e.text, e.x, e.y);
        ctx.globalAlpha = 1.0;
    });
}

window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        setupInput(canvas);
        
        // Setup initial events
        document.getElementById('player-count-group').addEventListener('click', (e) => {
            if(e.target.tagName === 'BUTTON') {
                document.querySelectorAll('#player-count-group .btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                state.totalPlayers = parseInt(e.target.dataset.count);
            }
        });

        document.getElementById('btn-toggle-mode').addEventListener('click', () => {
            const joystickArea = document.getElementById('joystick-area');
            const btnToggleMode = document.getElementById('btn-toggle-mode');
            if (state.controlMode === 'joystick') {
                state.controlMode = 'tap';
                if(btnToggleMode) btnToggleMode.innerText = '操作: 点击';
                if(joystickArea) joystickArea.style.display = 'none';
                state.joystickInput = {x: 0, y: 0};
            } else {
                state.controlMode = 'joystick';
                if(btnToggleMode) btnToggleMode.innerText = '操作: 摇杆';
                // DON'T show it until touched
                if(joystickArea) joystickArea.style.display = 'none';
                state.tapTarget = null;
            }
        });

        document.getElementById('btn-start-game').addEventListener('click', startGame);
        document.getElementById('btn-restart').addEventListener('click', resetGameToMenu);

        let scale = 1;
        function resizeCanvas() {
            const container = document.getElementById('game-container');
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const ratio = GAME_WIDTH / GAME_HEIGHT;
            if (vw / vh > ratio) {
                scale = vh / GAME_HEIGHT;
            } else {
                scale = vw / GAME_WIDTH;
            }
            if(container) {
                container.style.width = `${GAME_WIDTH}px`;
                container.style.height = `${GAME_HEIGHT}px`;
                container.style.transform = `scale(${scale})`;
            }
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        updateWalletUI();
    }
};
