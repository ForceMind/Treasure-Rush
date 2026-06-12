export const state = {
    playerWallet: 1000,
    gameState: 'MENU', // MENU, STARTING, PLAYING, GAMEOVER
    countdown: 3,
    totalPlayers: 6,
    controlMode: 'tap', // joystick, tap
    timeRemaining: 180,
    isFeverTime: false,
    lastTime: 0,
    chestSpawnTimer: 0,

    actors: [],
    chests: [],
    powerups: [],
    particles: [],
    emotes: [],
    
    // Input state
    keys: { w:false, a:false, s:false, d:false, ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false, ' ':false, Shift:false },
    joystickInput: { x: 0, y: 0 },
    tapTarget: null,
    skillTriggers: { dash: false, bomb: false }
};
