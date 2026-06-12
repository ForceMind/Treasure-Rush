import { state } from './state.js';
import { CONFIG, GAME_WIDTH, GAME_HEIGHT, CHEST_PROBS, POWERUP_TYPES } from './config.js';

export function spawnParticle(x, y, color, count) {
    for(let i=0; i<count; i++) {
        state.particles.push({
            type: 'spark',
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 100,
            vy: (Math.random() - 0.5) * 100,
            life: 1,
            color: color
        });
    }
}

export function spawnEmote(x, y, text) {
    state.emotes.push({
        x: x,
        y: y,
        text: text,
        life: 1.5,
        vy: -20
    });
}

export function drawChestShape(ctx, chest, time) {
    if (chest.multiplier >= 10) {
        ctx.shadowBlur = 15 + Math.sin(time*2)*5;
        ctx.shadowColor = chest.color;
    }
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-12, -10, 24, 20);
    ctx.strokeStyle = chest.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(-12, -10, 24, 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${chest.multiplier}x`, 0, 0);
}

export class Chest {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.carriedBy = null;
        let r = Math.random();
        let cumulative = 0;
        let selectedProb = CHEST_PROBS[0];
        for (let prob of CHEST_PROBS) {
            cumulative += prob.prob;
            if (r <= cumulative) {
                selectedProb = prob;
                break;
            }
        }
        if (state.isFeverTime && selectedProb.mult < 5) {
            selectedProb = CHEST_PROBS.find(p => p.mult === 5) || CHEST_PROBS[3];
        }
        this.multiplier = selectedProb.mult;
        this.color = selectedProb.color;
        this.time = Math.random() * 100;
    }
    draw(ctx) {
        if (this.carriedBy) return;
        this.time += 0.05;
        let scale = 1 + Math.sin(this.time) * 0.1;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        drawChestShape(ctx, this, this.time);
        ctx.restore();
    }
}

export class Powerup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        let typeObj = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        this.type = typeObj.type;
        this.color = typeObj.color;
        this.icon = typeObj.icon;
        this.time = Math.random() * 100;
    }
    draw(ctx) {
        this.time += 0.05;
        let yOffset = Math.sin(this.time) * 5;
        ctx.beginPath();
        ctx.arc(this.x, this.y + yOffset, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFF';
        ctx.stroke();
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y + yOffset + 1);
    }
}

export class Actor {
    constructor(id, isPlayer, color, name) {
        this.id = id;
        this.isPlayer = isPlayer;
        this.color = color;
        this.name = name;
        this.radius = 20;
        const angle = (Math.PI * 2 / state.totalPlayers) * id;
        const dist = 220;
        this.baseX = GAME_WIDTH / 2 + Math.cos(angle) * dist;
        this.baseY = GAME_HEIGHT / 2 + Math.sin(angle) * dist;
        this.x = this.baseX;
        this.y = this.baseY;
        this.vx = 0;
        this.vy = 0;
        this.beans = 0;
        this.carryingChest = null;
        this.rewardCoins = 0;
        this.frozenTime = 0;
        this.shield = false;
        this.speedBuffTime = 0;
        this.dashTime = 0;
        this.dashCooldown = 0;
        this.bombCooldown = 0;
        this.aiTarget = null;
        this.aiState = 'SEARCH';
        this.aiThinkTimer = 0;
    }

    getSpeed() {
        let speed = this.isPlayer ? CONFIG.playerSpeed : CONFIG.aiSpeed;
        if (this.speedBuffTime > 0) speed *= 1.5;
        if (this.carryingChest) speed *= CONFIG.carrySpeedMultiplier;
        if (this.dashTime > 0) speed *= CONFIG.dashMultiplier;
        if (state.isFeverTime) speed *= 1.2;
        return speed;
    }

    update(dt) {
        if (this.dashTime > 0) this.dashTime -= dt;
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.bombCooldown > 0) this.bombCooldown -= dt;
        if (this.speedBuffTime > 0) this.speedBuffTime -= dt;
        if (this.frozenTime > 0) {
            this.frozenTime -= dt;
            return;
        }

        if (Math.abs(this.vx) > 10 || Math.abs(this.vy) > 10) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.vx *= 0.85;
            this.vy *= 0.85;
        } else {
            this.vx = 0;
            this.vy = 0;
            if (this.isPlayer) {
                this.updatePlayerMovement(dt);
            } else {
                this.updateAIMovement(dt);
            }
        }

        this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));

        const distToBase = Math.hypot(this.x - this.baseX, this.y - this.baseY);
        if (distToBase < 40 && this.carryingChest) {
            let reward = CONFIG.baseChestValue * this.carryingChest.multiplier;
            this.beans += reward;
            spawnEmote(this.x, this.y - 40, '💰');
            if (this.carryingChest.multiplier >= 10) spawnEmote(this.x, this.y - 60, '😎');
            this.carryingChest = null;
        }

        if (!this.carryingChest) {
            for (let i = 0; i < state.chests.length; i++) {
                let chest = state.chests[i];
                if (!chest.carriedBy) {
                    let dist = Math.hypot(this.x - chest.x, this.y - chest.y);
                    if (dist < this.radius + chest.radius) {
                        chest.carriedBy = this;
                        this.carryingChest = chest;
                        break;
                    }
                }
            }
        }

        for (let i = state.powerups.length - 1; i >= 0; i--) {
            let p = state.powerups[i];
            let dist = Math.hypot(this.x - p.x, this.y - p.y);
            if (dist < this.radius + p.radius) {
                if (p.type === 'SPEED') this.speedBuffTime = 5;
                if (p.type === 'SHIELD') this.shield = true;
                if (p.type === 'FREEZE') {
                    state.actors.forEach(a => {
                        if (a !== this && Math.hypot(this.x - a.x, this.y - a.y) < 200) {
                            if (a.shield) {
                                a.shield = false;
                            } else {
                                a.frozenTime = 2;
                                spawnEmote(a.x, a.y - 30, '🥶');
                            }
                        }
                    });
                }
                state.powerups.splice(i, 1);
            }
        }
    }

    updatePlayerMovement(dt) {
        let moveX = 0;
        let moveY = 0;

        if (state.controlMode === 'joystick') {
            if (state.keys.w || state.keys.ArrowUp) moveY -= 1;
            if (state.keys.s || state.keys.ArrowDown) moveY += 1;
            if (state.keys.a || state.keys.ArrowLeft) moveX -= 1;
            if (state.keys.d || state.keys.ArrowRight) moveX += 1;

            if (state.joystickInput.x !== 0 || state.joystickInput.y !== 0) {
                moveX = state.joystickInput.x;
                moveY = state.joystickInput.y;
            }
        } else if (state.controlMode === 'tap' && state.tapTarget) {
            let dx = state.tapTarget.x - this.x;
            let dy = state.tapTarget.y - this.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 5) {
                moveX = dx / dist;
                moveY = dy / dist;
            } else {
                state.tapTarget = null;
            }
        }

        if (moveX !== 0 && moveY !== 0 && state.controlMode === 'joystick' && state.joystickInput.x === 0) {
            let dist = Math.hypot(moveX, moveY);
            moveX /= dist;
            moveY /= dist;
        }

        this.x += moveX * this.getSpeed() * dt;
        this.y += moveY * this.getSpeed() * dt;

        if (state.skillTriggers.dash && this.dashCooldown <= 0) {
            this.useDash();
            state.skillTriggers.dash = false;
        }
        if (state.skillTriggers.bomb && this.bombCooldown <= 0) {
            this.useBomb();
            state.skillTriggers.bomb = false;
        }
    }

    updateAIMovement(dt) {
        this.aiThinkTimer -= dt;
        if (this.aiThinkTimer <= 0) {
            this.aiThinkTimer = 0.5;
            this.determineAITarget();
        }

        if (this.aiTarget) {
            let dx = this.aiTarget.x - this.x;
            let dy = this.aiTarget.y - this.y;
            let dist = Math.hypot(dx, dy);
            
            if (dist > 5) {
                this.x += (dx / dist) * this.getSpeed() * dt;
                this.y += (dy / dist) * this.getSpeed() * dt;
            }

            if (this.bombCooldown <= 0) {
                let enemiesNearby = state.actors.filter(a => a !== this && Math.hypot(a.x - this.x, a.y - this.y) < CONFIG.bombRadius - 10);
                if (enemiesNearby.length > 0) {
                    let shouldBomb = enemiesNearby.some(a => a.carryingChest && a.carryingChest.multiplier >= 3) || Math.random() < 0.3;
                    if (shouldBomb) {
                        this.useBomb();
                    }
                }
            }

            if (this.dashCooldown <= 0 && dist > 100) {
                if (this.aiState === 'RETURN' && this.carryingChest && this.carryingChest.multiplier >= 5) {
                    this.useDash();
                } else if (this.aiState === 'CHASE') {
                    this.useDash();
                } else if (Math.random() < 0.1) {
                    this.useDash();
                }
            }
        }
    }

    determineAITarget() {
        if (this.carryingChest) {
            this.aiState = 'RETURN';
            this.aiTarget = { x: this.baseX, y: this.baseY };
            return;
        }

        let bestEnemy = null;
        let highestMult = 2;
        let closestDist = Infinity;

        state.actors.forEach(a => {
            if (a !== this && a.carryingChest) {
                let dist = Math.hypot(a.x - this.x, a.y - this.y);
                if (a.carryingChest.multiplier > highestMult && dist < 300) {
                    highestMult = a.carryingChest.multiplier;
                    bestEnemy = a;
                    closestDist = dist;
                }
            }
        });

        if (bestEnemy) {
            this.aiState = 'CHASE';
            this.aiTarget = { x: bestEnemy.x, y: bestEnemy.y };
            return;
        }

        let bestChest = null;
        let bestScore = -Infinity;
        state.chests.forEach(c => {
            if (!c.carriedBy) {
                let dist = Math.hypot(c.x - this.x, c.y - this.y);
                let score = (c.multiplier * 100) - dist;
                if (score > bestScore) {
                    bestScore = score;
                    bestChest = c;
                }
            }
        });

        if (bestChest) {
            this.aiState = 'SEARCH';
            this.aiTarget = { x: bestChest.x, y: bestChest.y };
            return;
        }

        let nearestPowerup = null;
        let pDist = Infinity;
        state.powerups.forEach(p => {
            let d = Math.hypot(p.x - this.x, p.y - this.y);
            if (d < pDist) {
                pDist = d;
                nearestPowerup = p;
            }
        });

        if (nearestPowerup && pDist < 200) {
            this.aiState = 'SEARCH';
            this.aiTarget = { x: nearestPowerup.x, y: nearestPowerup.y };
            return;
        }

        this.aiTarget = {
            x: Math.max(50, Math.min(GAME_WIDTH - 50, this.x + (Math.random() - 0.5) * 200)),
            y: Math.max(50, Math.min(GAME_HEIGHT - 50, this.y + (Math.random() - 0.5) * 200))
        };
    }

    useDash() {
        this.dashTime = CONFIG.dashDuration;
        let realCd = CONFIG.dashCooldown;
        if (state.isFeverTime) realCd /= 2;
        this.dashCooldown = realCd;
        for(let i=0; i<5; i++){
            spawnParticle(this.x, this.y, this.color, 15);
        }
    }

    useBomb() {
        let realCd = CONFIG.bombCooldown;
        if (state.isFeverTime) realCd /= 2;
        this.bombCooldown = realCd;
        state.particles.push({
            type: 'shockwave',
            x: this.x,
            y: this.y,
            radius: 10,
            maxRadius: CONFIG.bombRadius,
            alpha: 1
        });

        state.actors.forEach(a => {
            if (a !== this) {
                let dx = a.x - this.x;
                let dy = a.y - this.y;
                let dist = Math.hypot(dx, dy);
                if (dist < CONFIG.bombRadius) {
                    if (a.shield) {
                        a.shield = false;
                        spawnParticle(a.x, a.y, '#00BFFF', 20);
                        return;
                    }
                    let force = (CONFIG.bombRadius - dist) / CONFIG.bombRadius;
                    a.vx = (dx / dist) * CONFIG.bombKnockback * force * 5;
                    a.vy = (dy / dist) * CONFIG.bombKnockback * force * 5;
                    if (a.carryingChest) {
                        let c = a.carryingChest;
                        c.carriedBy = null;
                        c.x = a.x + (Math.random() - 0.5) * 40;
                        c.y = a.y + (Math.random() - 0.5) * 40;
                        a.carryingChest = null;
                        spawnEmote(a.x, a.y - 30, '💢');
                    }
                }
            }
        });
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, 40, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.color;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.frozenTime > 0 ? '#87CEFA' : this.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFF';
        ctx.stroke();

        ctx.fillStyle = '#FFF';
        let lookX = 0, lookY = 0;
        if (this.vx !== 0 || this.vy !== 0) {
            let dist = Math.hypot(this.vx, this.vy);
            lookX = this.vx / dist * 10;
            lookY = this.vy / dist * 10;
        } else if (this.aiTarget) {
            let dist = Math.hypot(this.aiTarget.x - this.x, this.aiTarget.y - this.y);
            if (dist > 0) {
                lookX = (this.aiTarget.x - this.x) / dist * 10;
                lookY = (this.aiTarget.y - this.y) / dist * 10;
            }
        }
        ctx.beginPath();
        ctx.arc(this.x + lookX - 5, this.y + lookY - 5, 4, 0, Math.PI*2);
        ctx.arc(this.x + lookX + 5, this.y + lookY - 5, 4, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y + this.radius + 15);

        if (this.shield) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        if (this.carryingChest) {
            ctx.save();
            ctx.translate(this.x, this.y - 30);
            drawChestShape(ctx, this.carryingChest, 0);
            ctx.restore();
        }
    }
}
