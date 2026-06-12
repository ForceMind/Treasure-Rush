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
    let joystickPointerId = null;

    // Common pointer down handling for tap and dynamic joystick
    canvas.addEventListener('pointerdown', (e) => {
        if (state.gameState !== 'PLAYING' && state.gameState !== 'STARTING') return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const localX = (e.clientX - rect.left) * scaleX;
        const localY = (e.clientY - rect.top) * scaleY;

        if (state.controlMode === 'tap') {
            state.tapTarget = {
                x: localX,
                y: localY
            };
        } else if (state.controlMode === 'joystick') {
            if (localX < 400 && joystickPointerId === null) {
                isDraggingJoystick = true;
                joystickPointerId = e.pointerId;
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
        
        if (isDraggingJoystick && e.pointerId === joystickPointerId) {
            updateJoystick(e);
        }
    });

    window.addEventListener('pointerup', (e) => {
        if (isDraggingJoystick && e.pointerId === joystickPointerId) {
            isDraggingJoystick = false;
            joystickPointerId = null;
            if (joystickArea) {
                joystickArea.style.display = 'none';
                joystickKnob.style.transform = `translate(0px, 0px)`;
            }
            state.joystickInput = { x: 0, y: 0 };
        }
    });

    window.addEventListener('pointercancel', (e) => {
        if (isDraggingJoystick && e.pointerId === joystickPointerId) {
            isDraggingJoystick = false;
            joystickPointerId = null;
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
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        // Try to get coordinates from pointer event, fallback to touches if it's a touch event
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches) {
            // Find the touch that matches our pointerId (rough approximation if needed, though pointer events have clientX)
            for (let i = 0; i < e.touches.length; i++) {
                // If the browser mixes touch and pointer, we just use the first touch as fallback
                clientX = e.touches[i].clientX;
                clientY = e.touches[i].clientY;
                break;
            }
        }
        
        const localX = (clientX - rect.left) * scaleX;
        const localY = (clientY - rect.top) * scaleY;

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
