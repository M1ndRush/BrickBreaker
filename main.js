import { Paddle, Ball } from './entities.js';
import { BrickManager, BonusManager } from './managers.js';
import { BRICK_TYPES } from './constants.js';
import { SoundManager } from './SoundManager.js';
import { GameState } from './gameState.js';

export class Game {
    constructor(canvasId) {
        GameState.initialize(canvasId);
        this.rightPressed = false;
        this.leftPressed = false;
        this.setupEventListeners();
        this.soundManager = new SoundManager();
        this.soundManager.setMusicVolume(0.11);
        this.soundManager.setEffectsVolume(0.65);
        this.setupOrientationChange();
    }

    async loadLevels() {
        try {
            const response = await fetch('levels.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const levels = await response.json();
            GameState.setLevels(levels);
        } catch (error) {
            console.error('Error loading levels:', error);
            throw error;
        }
    }

    async setupGame() {
        await this.loadLevels();
        this.resetGameForNewLevel();
        GameState.setGameState('welcome');
        this.soundManager.playBackgroundMusic('welcome', 1);
        this.updateGameObjects(); // Add this line to update objects after initialization
    }

    resetGameForNewLevel() {
        const currentLevel = GameState.getLevels()[GameState.getLevel() - 1];
        this.paddle = new Paddle(GameState.getCanvas(), currentLevel.paddleWidth);
        this.balls = [new Ball(GameState.getCanvas(), 0)];
        this.brickManager = new BrickManager(GameState.getCanvas(), this, currentLevel);
        this.bonusManager = new BonusManager(this);
        this.backgroundImage = new Image();
        this.backgroundImage.src = currentLevel.background;
        this.levelBallSpeed = currentLevel.ballSpeed;
        this.resetBallPosition();
    }

    resetBallPosition() {
        this.balls[0].x = this.paddle.x + this.paddle.width / 2;
        this.balls[0].y = this.paddle.y - this.balls[0].radius;
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.keyDownHandler.bind(this));
        document.addEventListener('keyup', this.keyUpHandler.bind(this));
    }

    keyDownHandler(e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            this.rightPressed = true;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            this.leftPressed = true;
        } else if (e.key === ' ') {
            if (GameState.getGameState() === 'welcome') {
                this.startNewGame();
            } else if (GameState.getGameState() === 'ready') {
                this.launchBall();
            } else if (['gameOver', 'gameWon'].includes(GameState.getGameState())) {
                GameState.setGameState('welcome');
            }
        } else if (e.ctrlKey && e.key === ']') {
            this.debugCompleteLevel();
        }
    }

    keyUpHandler(e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            this.rightPressed = false;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            this.leftPressed = false;
        }
    }

    startNewGame() {
        GameState.reset();
        this.resetGameForNewLevel();
        GameState.setGameState('ready');
        this.soundManager.playBackgroundMusic('ready', GameState.getLevel());
    }

    launchBall() {
        if (GameState.getGameState() === 'ready') {
            GameState.setGameState('playing');
            this.balls.forEach(ball => {
                ball.speed = this.levelBallSpeed;
                ball.launch();
            });
            // Музыка не меняется при переходе из 'ready' в 'playing'
        }
    }

    nextLevel() {
        GameState.setLevel(GameState.getLevel() + 1);
        if (GameState.getLevel() > GameState.getMaxLevel()) {
            GameState.setGameState('gameWon');
            this.soundManager.stopBackgroundMusic();
        } else {
            this.resetGameForNewLevel();
            GameState.setGameState('ready');
            this.soundManager.playBackgroundMusic('ready', GameState.getLevel());
        }
    }

    update() {
        if (this.rightPressed) {
            this.paddle.move('right');
        }
        if (this.leftPressed) {
            this.paddle.move('left');
        }

        switch (GameState.getGameState()) {
            case 'playing':
                this.updatePlayingState();
                break;
            case 'ready':
                this.resetBallPosition();
                break;
            case 'gameOver':
            case 'gameWon':
                this.soundManager.stopBackgroundMusic();
                break;
        }
    }

    updatePlayingState() {
        this.balls.forEach((ball, index) => {
            ball.move();
            if (ball.checkWallCollision()) {
                this.soundManager.playSound('wallCollision');
            }
            if (ball.checkPaddleCollision(this.paddle)) {
                this.soundManager.playSound('paddleCollision');
            }
            
            const hitResult = this.brickManager.checkCollision(ball);
            if (hitResult) {
                this.soundManager.playSound('brickCollision');
                const { brick, column, row } = hitResult;
                if (brick.type === BRICK_TYPES.BONUS) {
                    this.bonusManager.spawnBonus(brick);
                } 
                else if (brick.type === BRICK_TYPES.DEBUFF) {
                    this.bonusManager.spawnDebuff(brick);
                }
                else if (brick.type === BRICK_TYPES.DYNAMITE) {
                    this.brickManager.explodeDynamite(column, row);
                }
                if (ball.explosive) {
                    this.explodeAdjacentBricks(column, row);
                }
                if (brick.status <= 0) {
                    this.soundManager.playSound('brickDestroyed');
                }
            }
            
            if (ball.isLost()) {
                this.balls.splice(index, 1);
            }
        });
        
        this.bonusManager.update();

        if (this.balls.length === 0) {
            this.handleBallLoss();
        }

        if (this.brickManager.allBricksDestroyed()) {
            this.nextLevel();
        }
    }

    explodeAdjacentBricks(column, row) {
        const directions = [
            {dx: 0, dy: -1},  // верх
            {dx: 0, dy: 1},   // низ
            {dx: -1, dy: 0},  // лево
            {dx: 1, dy: 0}    // право
        ];

        directions.forEach(dir => {
            const newCol = column + dir.dx;
            const newRow = row + dir.dy;
            if (newCol >= 0 && newCol < this.brickManager.brickColumnCount &&
                newRow >= 0 && newRow < this.brickManager.brickRowCount) {
                const brick = this.brickManager.bricks[newCol][newRow];
                if (brick && brick.status > 0) {
                    if (brick.hit(true)) {
                        GameState.setScore(GameState.getScore() + 1);
                    }
                }
            }
        });
    }

    draw() {
        const ctx = GameState.getContext();
        const canvas = GameState.getCanvas();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.backgroundImage, 0, 0, canvas.width, canvas.height);

        switch (GameState.getGameState()) {
            case 'welcome':
                this.drawWelcomeScreen();
                break;
            case 'ready':
            case 'playing':
                this.brickManager.draw(ctx);
                this.balls.forEach(ball => ball.draw(ctx));
                this.paddle.draw(ctx);
                this.bonusManager.draw(ctx);
                this.drawLevelInfo(ctx);
                break;
            case 'gameOver':
                this.drawGameOverScreen();
                break;
            case 'gameWon':
                this.drawGameWonScreen();
                break;
        }
    }

    drawWelcomeScreen() {
        const ctx = GameState.getContext();
        const canvas = GameState.getCanvas();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '40px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('Это Brick Breaker', canvas.width / 2, canvas.height / 2 - 50);

        ctx.font = '20px Arial';
        ctx.fillText('Нажмите ПРОБЕЛ для начала', canvas.width / 2, canvas.height / 2 + 50);
    }

    drawGameOverScreen() {
        const ctx = GameState.getContext();
        const canvas = GameState.getCanvas();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '40px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('Игра окончена', canvas.width / 2, canvas.height / 2 - 50);

        ctx.font = '30px Arial';
        ctx.fillText(`Итоговый счет: ${GameState.getScore()}`, canvas.width / 2, canvas.height / 2 + 20);

        ctx.font = '20px Arial';
        ctx.fillText('Нажмите ПРОБЕЛ для перезапуска', canvas.width / 2, canvas.height / 2 + 80);
    }

    drawGameWonScreen() {
        const ctx = GameState.getContext();
        const canvas = GameState.getCanvas();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '40px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('Поздравляем! Вы прошли игру!', canvas.width / 2, canvas.height / 2 - 50);

        ctx.font = '30px Arial';
        ctx.fillText(`Итоговый счет: ${GameState.getScore()}`, canvas.width / 2, canvas.height / 2 + 20);

        ctx.font = '20px Arial';
        ctx.fillText('Нажмите ПРОБЕЛ для перезапуска', canvas.width / 2, canvas.height / 2 + 80);
    }

    drawLevelInfo(ctx) {
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        
        ctx.fillText(`Уровень: ${GameState.getLevel()}`, 30, 25);
        ctx.fillText(`Счет: ${GameState.getScore()}`, 230, 25);
        ctx.fillText(`Попытки:`, GameState.getCanvas().width - 200, 25);
        
        for (let i = 0; i < GameState.getAttempts(); i++) {
            ctx.drawImage(this.balls[0].normalBallImage, GameState.getCanvas().width - 110 + i * 30, 10, 20, 20);
        }
    }

    handleBallLoss() {
        if (GameState.getAttempts() > 1) {
            GameState.setAttempts(GameState.getAttempts() - 1);
            this.resetBallAndPaddle();
            GameState.setGameState('ready');
            // Добавляем проверку на изменение музыки при потере мяча
            this.soundManager.playBackgroundMusic('ready', GameState.getLevel());
        } else {
            GameState.setGameState('gameOver');
            this.soundManager.stopBackgroundMusic();
        }
    }

    resetBallAndPaddle() {
        const currentLevel = GameState.getLevels()[GameState.getLevel() - 1];
        this.paddle = new Paddle(GameState.getCanvas(), currentLevel.paddleWidth);
        this.balls = [new Ball(GameState.getCanvas(), 0)];
        this.resetBallPosition();
        this.bonusManager.resetBonuses();
    }

    splitBall() {
        const newBalls = this.balls.flatMap(ball => {
            const newBall = new Ball(GameState.getCanvas());
            newBall.x = ball.x;
            newBall.y = ball.y;
            newBall.dx = -ball.dx;
            newBall.dy = ball.dy;
            newBall.speed = ball.speed;
            newBall.radius = ball.radius;
            newBall.explosive = ball.explosive;
            return [ball, newBall];
        });
        this.balls = newBalls;
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    start() {
        this.setupGame().then(() => {
            this.gameLoop();
        });
    }

    debugCompleteLevel() {
        if (GameState.getGameState() === 'playing') {
            this.brickManager.destroyAllBricks();
            GameState.setLevel(GameState.getLevel() + 1);
            if (GameState.getLevel() > GameState.getMaxLevel()) {
                GameState.setGameState('gameWon');
            } else {
                this.resetGameForNewLevel();
                GameState.setGameState('ready');
            }
        }
    }

    setupOrientationChange() {
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        this.handleOrientationChange();
    }

    handleOrientationChange() {
        const rotateMessage = document.getElementById('rotateMessage');
        const gameContainer = document.getElementById('gameContainer');
        
        if (window.orientation === 0 || window.orientation === 180) {
            rotateMessage.style.display = 'block';
            gameContainer.style.display = 'none';
        } else {
            rotateMessage.style.display = 'none';
            gameContainer.style.display = 'block';
            GameState.resizeCanvas();
            if (this.isGameInitialized()) {
                this.updateGameObjects();
            }
        }
    }

    isGameInitialized() {
        return this.paddle && this.balls && this.brickManager;
    }

    updateGameObjects() {
        if (this.isGameInitialized()) {
            this.paddle.updateDimensions();
            this.balls.forEach(ball => ball.updateDimensions());
            this.brickManager.updateDimensions();
            // Update other game objects as needed
        }
    }
}

async function initGame() {
    try {
        const game = new Game('gameCanvas');
        game.start();
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
}

document.addEventListener('DOMContentLoaded', initGame);