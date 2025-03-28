import { Brick } from './entities.js';
import { BONUS_TYPES, DEBUFF_TYPES, BRICK_TYPES } from './constants.js';
import { GameState } from './gameState.js';

export class BrickManager {
    constructor(canvas, game, levelConfig) {
        this.canvas = canvas;
        this.game = game;
        this.brickRowCount = levelConfig.rows;
        this.brickColumnCount = levelConfig.columns;
        this.brickWidth = 85;
        this.brickHeight = 20;
        this.brickPadding = 10;
        this.brickOffsetTop = 30;
        this.brickOffsetLeft = 30;
        this.bricks = [];
        this.BRICK_CHANCES = levelConfig.brickTypes;
        this.initializeBricks();
        this.updateDimensions();
    }

    initializeBricks() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                const brickX = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
                const brickY = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                const type = this.getRandomBrickType();
                this.bricks[c][r] = new Brick(brickX, brickY, this.brickWidth, this.brickHeight, type);
            }
        }
    }

    getRandomBrickType() {
        const randomValue = Math.random() * 100;
        let cumulativeChance = 0;
        for (const [brickType, chance] of Object.entries(this.BRICK_CHANCES)) {
            cumulativeChance += chance;
            if (randomValue <= cumulativeChance) {
                return BRICK_TYPES[brickType];
            }
        }
        return BRICK_TYPES.NORMAL;
    }

    checkCollision(ball) {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c][r];
                if (brick.status > 0) {
                    const collision = this.getCollisionSide(ball, brick);
                    if (collision) {
                        if (ball.explosive) {
                            this.explodeDynamite(c, r);
                        } else if (brick.type === BRICK_TYPES.DYNAMITE) {
                            this.explodeDynamite(c, r);
                        } else if (brick.hit(ball.explosive)) {
                            GameState.setScore(GameState.getScore() + 1);
                        }
                        
                        // Мяч всегда отскакивает, независимо от типа кирпича
                        if (collision === 'left' || collision === 'right') {
                            ball.reverseX();
                        } else {
                            ball.reverseY();
                        }
                        
                        return { brick, column: c, row: r };
                    }
                }
            }
        }
        return null;
    }

    getCollisionSide(ball, brick) {
        const ballLeft = ball.x - ball.radius;
        const ballRight = ball.x + ball.radius;
        const ballTop = ball.y - ball.radius;
        const ballBottom = ball.y + ball.radius;

        const brickLeft = brick.x;
        const brickRight = brick.x + brick.width;
        const brickTop = brick.y;
        const brickBottom = brick.y + brick.height;

        if (ballRight > brickLeft && ballLeft < brickRight && 
            ballBottom > brickTop && ballTop < brickBottom) {
            
            const overlapLeft = ballRight - brickLeft;
            const overlapRight = brickRight - ballLeft;
            const overlapTop = ballBottom - brickTop;
            const overlapBottom = brickBottom - ballTop;

            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapLeft) {
                return 'left';
            } else if (minOverlap === overlapRight) {
                return 'right';
            } else if (minOverlap === overlapTop) {
                return 'top';
            } else {
                return 'bottom';
            }
        }

        return null;
    }

    draw(ctx) {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                this.bricks[c][r].draw(ctx);
            }
        }
    }

    allBricksDestroyed() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status > 0 && this.bricks[c][r].type !== BRICK_TYPES.INVINCIBLE) {
                    return false;
                }
            }
        }
        return true;
    }

    dropBricksOneRow() {
        // Check if the bottom row has any active bricks
        const hasActiveBricksInBottomRow = this.bricks.some(column => column[this.brickRowCount - 1].status > 0);

        // If there are active bricks in the bottom row, remove them
        if (hasActiveBricksInBottomRow) {
            for (let c = 0; c < this.brickColumnCount; c++) {
                this.bricks[c].pop();
            }
        }

        // Move all bricks down by one row
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = this.brickRowCount - 1; r > 0; r--) {
                this.bricks[c][r] = this.bricks[c][r-1];
                if (this.bricks[c][r]) {
                    this.bricks[c][r].y += this.brickHeight + this.brickPadding;
                }
            }
        }

        // Add an empty row at the top
        for (let c = 0; c < this.brickColumnCount; c++) {
            const brickX = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
            const brickY = this.brickOffsetTop;
            this.bricks[c][0] = new Brick(brickX, brickY, this.brickWidth, this.brickHeight, BRICK_TYPES.NORMAL);
            this.bricks[c][0].status = 0; // Set status to 0 to make it inactive
        }
    }

    explodeBottomRow() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            const brick = this.bricks[c][this.brickRowCount - 1];
            if (brick.status > 0) {
                brick.status = 0;
                GameState.setScore(GameState.getScore() + 1);
            }
        }
    }

    explodeDynamite(col, row) {
        const directions = [
            {dx: 0, dy: -1},  // верх
            {dx: 0, dy: 1},   // низ
            {dx: -1, dy: 0},  // лево
            {dx: 1, dy: 0}    // право
        ];

        const explodeBrick = (c, r) => {
            if (c < 0 || c >= this.brickColumnCount || r < 0 || r >= this.brickRowCount) return;
            
            const brick = this.bricks[c][r];
            if (brick && brick.status > 0) {
                if (brick.hit(true)) {
                    GameState.setScore(GameState.getScore() + 1);
                    
                    if (brick.type === BRICK_TYPES.BONUS) {
                        this.game.bonusManager.spawnBonus(brick);
                    } else if (brick.type === BRICK_TYPES.DEBUFF) {
                        this.game.bonusManager.spawnDebuff(brick);
                    } else if (brick.type === BRICK_TYPES.DYNAMITE) {
                        // Рекурсивно взрываем соседние динамиты
                        directions.forEach(dir => {
                            explodeBrick(c + dir.dx, r + dir.dy);
                        });
                    }
                }
            }
        };

        // Взрываем центральный кирпич и его соседей
        explodeBrick(col, row);
        directions.forEach(dir => {
            explodeBrick(col + dir.dx, row + dir.dy);
        });
    }

    destroyAllBricks() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c][r];
                if (brick.status > 0 && brick.type !== BRICK_TYPES.INVINCIBLE) {
                    brick.status = 0;
                    GameState.setScore(GameState.getScore() + 1);
                }
            }
        }
    }

    updateDimensions() {
        const scale = GameState.getScale();
        this.brickWidth *= scale;
        this.brickHeight *= scale;
        this.brickPadding *= scale;
        this.brickOffsetTop *= scale;
        this.brickOffsetLeft *= scale;
    }
}

export class BonusManager {
    constructor(game) {
        this.game = game;
        this.activeBonus = [];
        this.activeBonuses = new Set();
        this.BONUS_FALL_SPEED = 0.65;
        this.BALL_SLOW_DOWN_FACTOR = 0.7;
        this.BALL_SPEED_UP_FACTOR = 1.4;
        this.bonusImage = new Image();
        this.bonusImage.src = 'assets/bonus_star.png';
        this.debuffImage = new Image();
        this.debuffImage.src = 'assets/debuff.png';
    }

    spawnBonus(brick) {
        const type = Math.floor(Math.random() * Object.keys(BONUS_TYPES).length);
        this.activeBonus.push({
            x: brick.x + brick.width / 2,
            y: brick.y + brick.height,
            type: type,
            dy: Math.abs(this.game.balls[0].dy) * this.BONUS_FALL_SPEED,
            isDebuff: false
        });
    }

    spawnDebuff(brick) {
        const type = Math.floor(Math.random() * Object.keys(DEBUFF_TYPES).length);
        this.activeBonus.push({
            x: brick.x + brick.width / 2,
            y: brick.y + brick.height,
            type: type,
            dy: Math.abs(this.game.balls[0].dy) * this.BONUS_FALL_SPEED,
            isDebuff: true
        });
    }

    update() {
        for (let i = this.activeBonus.length - 1; i >= 0; i--) {
            const bonus = this.activeBonus[i];
            bonus.y += bonus.dy;

            if (this.checkPaddleCollision(bonus)) {
                this.activateBonus(bonus);
                this.activeBonus.splice(i, 1);
            } else if (bonus.y > this.game.paddle.canvas.height) {
                this.activeBonus.splice(i, 1);
            }
        }
    }

    checkPaddleCollision(bonus) {
        return (
            bonus.y + 8 > this.game.paddle.y &&
            bonus.y + 8 < this.game.paddle.y + this.game.paddle.height &&
            bonus.x > this.game.paddle.x - 10 &&
            bonus.x < this.game.paddle.x + this.game.paddle.width + 10
        );
    }

    activateBonus(bonus) {
        if (bonus.isDebuff) {
            this.game.soundManager.playSound('debuffPickedUp');
            GameState.setScore(GameState.getScore() - 3);
            switch (bonus.type) {
                case DEBUFF_TYPES.SHRINK_PADDLE:
                    this.game.paddle.width = Math.max(50, this.game.paddle.width * 0.75);
                    break;
                case DEBUFF_TYPES.SPEED_UP_BALL:
                    this.game.balls.forEach(ball => ball.speed *= this.BALL_SPEED_UP_FACTOR);
                    break;
                case DEBUFF_TYPES.DROP_BRICKS:
                    this.game.brickManager.dropBricksOneRow();
                    break;
                case DEBUFF_TYPES.DECREASE_BALL_SIZE:
                    this.game.balls.forEach(ball => {
                        if (ball.radius > ball.BALL_SIZES.SMALL) {
                            ball.radius = ball.radius === ball.BALL_SIZES.LARGE ? ball.BALL_SIZES.NORMAL : ball.BALL_SIZES.SMALL;
                        }
                    });
                    break;
            }
        } else {
            this.game.soundManager.playSound('bonusPickedUp');
            GameState.setScore(GameState.getScore() + 3);
            switch (bonus.type) {
                case BONUS_TYPES.EXTEND_PADDLE:
                    this.game.paddle.width *= 1.25;
                    this.activeBonuses.add(BONUS_TYPES.EXTEND_PADDLE);
                    break;
                case BONUS_TYPES.SPEED_UP_PADDLE:
                    this.game.paddle.speed += 2;
                    this.activeBonuses.add(BONUS_TYPES.SPEED_UP_PADDLE);
                    break;
                case BONUS_TYPES.SLOW_DOWN_BALL:
                    this.game.balls.forEach(ball => ball.speed *= this.BALL_SLOW_DOWN_FACTOR);
                    this.activeBonuses.add(BONUS_TYPES.SLOW_DOWN_BALL);
                    break;
                case BONUS_TYPES.EXPLODE_BOTTOM_ROW:
                    this.game.brickManager.explodeBottomRow();
                    break;
                case BONUS_TYPES.SPLIT_BALL:
                    this.game.splitBall();
                    break;
                case BONUS_TYPES.EXTRA_ATTEMPT:
                    if (GameState.getAttempts() < 3) {
                        GameState.setAttempts(GameState.getAttempts() + 1);
                    } else {
                        GameState.setScore(GameState.getScore() + 40);
                    }
                    break;
                case BONUS_TYPES.INCREASE_BALL_SIZE:
                    this.game.balls.forEach(ball => {
                        if (ball.radius < ball.BALL_SIZES.LARGE) {
                            ball.radius = ball.radius === ball.BALL_SIZES.SMALL ? ball.BALL_SIZES.NORMAL : ball.BALL_SIZES.LARGE;
                        }
                    });
                    this.activeBonuses.add(BONUS_TYPES.INCREASE_BALL_SIZE);
                    break;
                case BONUS_TYPES.EXPLOSIVE_BALL:
                    this.game.balls.forEach(ball => ball.explosive = true);
                    this.activeBonuses.add(BONUS_TYPES.EXPLOSIVE_BALL);
                    break;
            }
        }
    }

    resetBonuses() {
        this.activeBonuses.clear();
        this.game.paddle.width = 120;
        this.game.paddle.speed = 5;
        this.game.balls.forEach(ball => {
            ball.radius = ball.BALL_SIZES.NORMAL;
            ball.explosive = false;
            ball.speed = 2.7;
        });
    }

    draw(ctx) {
        const scale = GameState.getScale();
        this.activeBonus.forEach(bonus => {
            const image = bonus.isDebuff ? this.debuffImage : this.bonusImage;
            ctx.drawImage(image, bonus.x - 10 * scale, bonus.y - 10 * scale, 20 * scale, 20 * scale);
        });
    }
}