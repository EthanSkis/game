// main.js - Entry point, menu handling, game loop

(function() {
    const game = new Game();
    let lastTime = 0;
    let running = false;

    // Init touch controls if on mobile
    touchControls.init();
    if (touchControls.active) {
        document.body.classList.add('mobile-active');
        touchControls.hide(); // Hidden until match starts
    }

    // On mobile, reduce default bot count for performance
    if (isMobile) {
        const botCountSelect = document.getElementById('bot-count');
        botCountSelect.value = '4';
    }

    // Menu elements
    const menuScreen = document.getElementById('menu-screen');
    const btnPlay = document.getElementById('btn-play');
    const btnControls = document.getElementById('btn-controls');
    const gameMode = document.getElementById('game-mode');
    const botDifficulty = document.getElementById('bot-difficulty');
    const botCount = document.getElementById('bot-count');
    const mapSelect = document.getElementById('map-select');

    btnPlay.addEventListener('click', () => {
        menuScreen.style.display = 'none';

        game.startMatch({
            map: mapSelect.value,
            mode: gameMode.value,
            difficulty: botDifficulty.value,
            botCount: parseInt(botCount.value),
        });

        running = true;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    });

    btnControls.addEventListener('click', () => {
        if (isMobile) {
            alert(
                'Mobile Controls:\n\n' +
                'Left Joystick - Move\n' +
                'Swipe Right Side - Look / Aim\n' +
                'FIRE Button - Shoot\n' +
                'JUMP Button - Jump\n' +
                'R Button - Reload\n' +
                'C Button - Crouch\n' +
                'WPN Button - Switch Weapon\n' +
                'TAB Button - Scoreboard\n\n' +
                'Tip: Play in landscape for best experience!'
            );
        } else {
            alert(
                'Controls:\n\n' +
                'WASD - Move\n' +
                'Mouse - Look\n' +
                'Left Click - Shoot\n' +
                'R - Reload\n' +
                'Space - Jump\n' +
                'C / Ctrl - Crouch\n' +
                'Shift - Sprint\n' +
                '1/2/3 - Switch Weapon\n' +
                'Scroll - Cycle Weapon\n' +
                'Tab - Scoreboard\n' +
                'Esc - Pause / Release Mouse'
            );
        }
    });

    // Re-lock pointer on click during gameplay (desktop only)
    document.addEventListener('click', () => {
        if (!touchControls.active && game.isRunning && !document.pointerLockElement) {
            game.canvas.requestPointerLock();
        }
    });

    // Escape to release pointer (desktop)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && document.pointerLockElement) {
            document.exitPointerLock();
        }
    });

    // Prevent pinch zoom on iOS
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });

    // Prevent pull-to-refresh and overscroll
    document.addEventListener('touchmove', (e) => {
        if (game.isRunning) e.preventDefault();
    }, { passive: false });

    // Handle visibility change - pause if tabbed away
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.isRunning) {
            game.isPaused = true;
        } else if (!document.hidden && game.isRunning) {
            game.isPaused = false;
            lastTime = performance.now();
        }
    });

    // Handle orientation change - resize renderer
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (game.camera) {
                game.camera.aspect = window.innerWidth / window.innerHeight;
                game.camera.updateProjectionMatrix();
                game.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        }, 200);
    });

    function gameLoop(timestamp) {
        if (!running) return;

        const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // Cap at 50ms
        lastTime = timestamp;

        game.update(dt);
        game.render();

        if (game.isRunning) {
            requestAnimationFrame(gameLoop);
        } else {
            running = false;
        }
    }

    // Initial render
    game.render();
})();
