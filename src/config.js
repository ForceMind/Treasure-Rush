export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 800;

export const CONFIG = {
    playerSpeed: 170,
    aiSpeed: 145,
    carrySpeedMultiplier: 0.7,
    dashMultiplier: 2.5,
    dashDuration: 0.3,
    dashCooldown: 5,
    bombRadius: 95,
    bombKnockback: 180,
    bombCooldown: 6,
    gameDuration: 180, // seconds
    maxChests: 8,
    maxPowerups: 5,
    baseChestValue: 100,
    feverTimeThreshold: 30, // last 30 seconds
    chestSpawnInterval: 3000 // ms
};

export const CHEST_PROBS = [
    { mult: 1, prob: 0.30, color: '#CD7F32' },
    { mult: 2, prob: 0.25, color: '#C0C0C0' },
    { mult: 3, prob: 0.18, color: '#FFD700' },
    { mult: 5, prob: 0.12, color: '#00FFFF' },
    { mult: 10, prob: 0.08, color: '#FF00FF' },
    { mult: 20, prob: 0.05, color: '#FF4500' },
    { mult: 50, prob: 0.02, color: '#FFFFFF' }
];

export const POWERUP_TYPES = [
    { type: 'SPEED', color: '#00FF00', icon: '⚡' },
    { type: 'SHIELD', color: '#00BFFF', icon: '🛡️' },
    { type: 'FREEZE', color: '#87CEFA', icon: '❄️' }
];

export const COLORS = ['#1E90FF', '#DC143C', '#9400D3', '#32CD32', '#FF8C00', '#FF1493'];
export const NAMES = ['你', 'AI-1', 'AI-2', 'AI-3', 'AI-4', 'AI-5'];
export const ENTRY_FEE = 100;
