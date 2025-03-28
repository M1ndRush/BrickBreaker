export const GameState = (function() {
    let canvas = null;
    let ctx = null;
    let gameState = 'welcome';
    let score = 0;
    let level = 1;
    const maxLevel = 25;
    let attempts = 3;
    let levels = [];
    let scale = 1;

    return {
        initialize(canvasId) {
            canvas = document.getElementById(canvasId);
            ctx = canvas.getContext('2d');
            this.resizeCanvas();
            window.addEventListener('resize', this.resizeCanvas.bind(this));
        },
        
        resizeCanvas() {
            const containerWidth = window.innerWidth * 0.8;
            const containerHeight = window.innerHeight * 0.8;
            const aspectRatio = 1100 / 700;

            if (containerWidth / containerHeight > aspectRatio) {
                canvas.height = containerHeight;
                canvas.width = containerHeight * aspectRatio;
            } else {
                canvas.width = containerWidth;
                canvas.height = containerWidth / aspectRatio;
            }

            scale = canvas.width / 1100; // Store the scale factor
        },

        reset() {
            gameState = 'ready';
            score = 0;
            level = 1;
            attempts = 3;
        },

        getCanvas() { return canvas; },
        getContext() { return ctx; },
        getGameState() { return gameState; },
        setGameState(state) { gameState = state; },
        getScore() { return score; },
        setScore(newScore) { score = newScore; },
        getLevel() { return level; },
        setLevel(newLevel) { level = newLevel; },
        getMaxLevel() { return maxLevel; },
        getAttempts() { return attempts; },
        setAttempts(newAttempts) { attempts = newAttempts; },
        getLevels() { return levels; },
        setLevels(newLevels) { levels = newLevels; },
        getScale() { return scale; }
    };
})();