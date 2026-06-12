import { state } from './state.js';
import { ENTRY_FEE } from './config.js';

export function updateWalletUI() {
    let el = document.getElementById('ui-wallet');
    if (el) el.innerText = state.playerWallet;
}

export function updateUI() {
    if (state.actors.length === 0) return;
    const player = state.actors[0];
    
    let mins = Math.floor(state.timeRemaining / 60);
    let secs = Math.floor(state.timeRemaining % 60);
    let timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    const timeEl = document.getElementById('hud-time');
    if (timeEl) {
        timeEl.innerText = timeStr;
        if (state.isFeverTime) {
            timeEl.classList.add('fever');
        } else {
            timeEl.classList.remove('fever');
        }
    }

    const hudGold = document.getElementById('hud-gold');
    if (hudGold) hudGold.innerText = player.beans;
    
    let sortedActors = [...state.actors].sort((a, b) => b.beans - a.beans);
    let playerRank = sortedActors.indexOf(player) + 1;
    const hudRank = document.getElementById('hud-rank');
    if (hudRank) hudRank.innerText = playerRank;

    const lbEl = document.getElementById('hud-leaderboard');
    if (lbEl) {
        lbEl.innerHTML = '';
        sortedActors.forEach((a, i) => {
            let div = document.createElement('div');
            div.className = `leaderboard-item ${a.isPlayer ? 'is-player' : ''}`;
            div.innerHTML = `<span>${i+1}. ${a.name}</span> <span>${a.beans}</span>`;
            lbEl.appendChild(div);
        });
    }

    const cdDash = document.getElementById('cd-dash');
    const cdBomb = document.getElementById('cd-bomb');
    if (cdDash) {
        if (player.dashCooldown > 0) {
            cdDash.classList.remove('hidden');
            cdDash.innerText = Math.ceil(player.dashCooldown);
        } else {
            cdDash.classList.add('hidden');
        }
    }
    if (cdBomb) {
        if (player.bombCooldown > 0) {
            cdBomb.classList.remove('hidden');
            cdBomb.innerText = Math.ceil(player.bombCooldown);
        } else {
            cdBomb.classList.add('hidden');
        }
    }
}

export function showGameOver() {
    const uiHud = document.getElementById('hud');
    const uiMobileControls = document.getElementById('mobile-controls');
    const uiGameOver = document.getElementById('game-over');
    
    if (uiHud) uiHud.classList.add('hidden');
    if (uiMobileControls) uiMobileControls.classList.add('hidden');
    if (uiGameOver) uiGameOver.classList.remove('hidden');
    
    state.actors.sort((a, b) => b.beans - a.beans);
    
    let totalPool = state.totalPlayers * ENTRY_FEE;
    let platformFee = Math.floor(totalPool * 0.2);
    let rewardPool = totalPool - platformFee;
    let totalWeights = (state.totalPlayers * (state.totalPlayers - 1)) / 2;
    
    let distributed = 0;
    for (let i = 1; i < state.totalPlayers; i++) {
        let weight = state.totalPlayers - 1 - i;
        let reward = Math.floor(rewardPool * (weight / totalWeights));
        state.actors[i].rewardCoins = reward;
        distributed += reward;
    }
    state.actors[0].rewardCoins = rewardPool - distributed;

    const poolEl = document.getElementById('game-over-pool');
    if (poolEl) {
        poolEl.innerHTML = `总奖池: <span style="color:#FFD700">${totalPool}</span> | 平台抽成(20%): <span style="color:#FF6347">${platformFee}</span> | 实际发放: <span style="color:#00FF00">${rewardPool}</span>`;
    }

    const list = document.getElementById('game-over-list');
    if (list) {
        list.innerHTML = '';
        state.actors.forEach((a, index) => {
            if (a.isPlayer) {
                state.playerWallet += a.rewardCoins;
                updateWalletUI();
            }

            let li = document.createElement('li');
            if (a.isPlayer) {
                li.className = 'is-player';
                const title = document.getElementById('game-over-title');
                if (title) title.innerText = index === 0 ? '你赢了！' : `你获得了第 ${index+1} 名`;
            }
            
            let rewardText = a.rewardCoins > 0 ? `<span style="color:#00FF00;">+${a.rewardCoins} 金币</span>` : `<span style="color:#888;">无奖励</span>`;
            li.innerHTML = `<span>#${index+1} ${a.name}</span> <span style="color:#FFD700;">${a.beans} 豆</span> <span style="font-size:1rem;">${rewardText}</span>`;
            list.appendChild(li);
        });
    }
}
