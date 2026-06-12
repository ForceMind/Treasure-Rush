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
    
    // Reward distribution based on player count
    const rewardsMap = {
        6: [200, 150, 130],
        5: [160, 130, 110],
        4: [180, 140],
        3: [130, 110],
        2: [160]
    };
    
    let currentRewards = rewardsMap[state.totalPlayers] || [0];
    
    state.actors.forEach((a, index) => {
        a.rewardCoins = index < currentRewards.length ? currentRewards[index] : 0;
    });

    const poolEl = document.getElementById('game-over-pool');
    if (poolEl) {
        poolEl.innerHTML = `比赛结算完毕！前 ${currentRewards.length} 名将获得奖金`;
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
