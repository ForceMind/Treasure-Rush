import { state } from './state.js';

export function setupInput(canvas) {
    window.addEventListener('keydown', (e) => {
        if (state.keys.hasOwnProperty(e.key) && (state.gameState === 'PLAYING' || state.gameState === 'STARTING')) {
            state.keys[e.key] = true;
            if (e.key === ' ' && state.controlMode === 'joystick' && state.gameState === 'PLAYING') state.skillTriggers.bomb = true;
            if (e.key === 'Shift' && state.controlMode === 'joystick' && state.gameState === 'PLAYING') state.skillTriggers.dash = true;
        }
    });
    window.addEventListener('keyup', (e) => {
        if (state.keys.hasOwnProperty(e.key)) state.keys[e.key] = false;
    });

    const joystickArea = document.getElementById('joystick-area');
    const joystickKnob = document.getElementById('joystick-knob');
    let isDraggingJoystick = false;
    let joystickBasePosition = { x: 0, y: 0 };

    // Common pointer down handling for tap and dynamic joystick
    canvas.addEventListener('pointerdown', (e) => {
        if (state.gameState !== 'PLAYING' && state.gameState !== 'STARTING') return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;

        if (state.controlMode === 'tap') {
            state.tapTarget = {
                x: localX * scaleX,
                y: localY * scaleY
            };
        } else if (state.controlMode === 'joystick') {
            if (localX < rect.width / 2) {
                isDraggingJoystick = true;
                joystickBasePosition = { x: localX, y: localY };
                
                if (joystickArea) {
                    joystickArea.style.left = localX + 'px';
                    joystickArea.style.top = localY + 'px';
                    joystickArea.style.bottom = 'auto';
                    joystickArea.style.display = 'flex';
                }
                updateJoystick(e);
            }
        }
    });

    window.addEventListener('pointermove', (e) => {
        if (state.gameState !== 'PLAYING' && state.gameState !== 'STARTING') return;
        
        if (state.controlMode === 'tap' && e.buttons > 0 && e.target === canvas) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            state.tapTarget = {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        }
        
        if (isDraggingJoystick) {
            updateJoystick(e);
        }
    });

    window.addEventListener('pointerup', () => {
        if (isDraggingJoystick) {
            isDraggingJoystick = false;
            if (joystickArea) {
                joystickArea.style.display = 'none';
                joystickKnob.style.transform = `translate(0px, 0px)`;
            }
            state.joystickInput = { x: 0, y: 0 };
        }
    });

    function updateJoystick(e) {
        if (!isDraggingJoystick) return;
        
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        const localX = clientX - rect.left;
        const localY = clientY - rect.top;

        let dx = localX - joystickBasePosition.x;
        let dy = localY - joystickBasePosition.y;
        
        let distance = Math.sqrt(dx*dx + dy*dy);
        let maxDist = 35; // 60(radius) - 25(knob radius)
        
        if (distance > maxDist) {
            dx = (dx / distance) * maxDist;
            dy = (dy / distance) * maxDist;
        }
        
        if (joystickKnob) joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        
        if (distance > 5) {
            state.joystickInput.x = dx / maxDist;
            state.joystickInput.y = dy / maxDist;
        } else {
            state.joystickInput.x = 0;
            state.joystickInput.y = 0;
        }
    }

    const btnDash = document.getElementById('btn-dash');
    const btnBomb = document.getElementById('btn-bomb');
    if (btnDash) {
        btnDash.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(state.gameState==='PLAYING') state.skillTriggers.dash = true; });
    }
    if (btnBomb) {
        btnBomb.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(state.gameState==='PLAYING') state.skillTriggers.bomb = true; });
    }
}
