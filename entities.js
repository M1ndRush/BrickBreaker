import { BRICK_TYPES, BONUS_TYPES, DEBUFF_TYPES } from './constants.js';
import { GameState } from './gameState.js';

export class Paddle {
    constructor(canvas, width) {
        this.canvas = canvas;
        this.width = width;
        this.height = 10;
        this.x = (canvas.width - this.width) / 2;
        this.y = canvas.height - 50;
        this.speed = 5;
        this.originalWidth = width;
        this.updateDimensions();
    }

    updateDimensions() {
        const scale = GameState.getScale();
        this.width = this.originalWidth * scale;
        this.height = 10 * scale;
        this.y = GameState.getCanvas().height - 50 * scale;
        this.speed = 5 * scale;
    }

    move(direction) {
        if (direction === 'right' && this.x < this.canvas.width - this.width) {
            this.x += this.speed;
        } else if (direction === 'left' && this.x > 0) {
            this.x -= this.speed;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = "#0095DD";
        ctx.fill();
        ctx.closePath();
    }
}

export class Ball {
    constructor(canvas, speed) {
        this.canvas = canvas;
        this.BALL_SIZES = {
            SMALL: 6,
            NORMAL: 10,
            LARGE: 15
        };
        this.radius = this.BALL_SIZES.NORMAL;
        this.speed = speed;
        this.reset();
        this.loadImages();
        this.explosive = false;
        this.updateDimensions();
    }

    updateDimensions() {
        const scale = GameState.getScale();
        this.BALL_SIZES = {
            SMALL: 6 * scale,
            NORMAL: 10 * scale,
            LARGE: 15 * scale
        };
        this.radius = this.BALL_SIZES.NORMAL;
        this.speed *= scale;
    }

    loadImages() {
        this.normalBallImage = new Image();
        this.normalBallImage.src = 'assets/ball.png';
        this.explosiveBallImage = new Image();
        this.explosiveBallImage.src = 'assets/explosive_ball.png';
    }

    reset() {
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height - 60;
        this.dx = 0;
        this.dy = 0;
    }

    launch() {
        const angle = (Math.random() * 60 - 30) * Math.PI / 180;
        this.dx = this.speed * Math.sin(angle);
        this.dy = -this.speed * Math.cos(angle);
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;
    }

    reverseX() {
        this.dx = -this.dx;
    }

    reverseY() {
        this.dy = -this.dy;
    }

    checkWallCollision() {
        let collided = false;
        if (this.x + this.dx > this.canvas.width - this.radius || this.x + this.dx < this.radius) {
            this.reverseX();
            collided = true;
        }
        if (this.y + this.dy < this.radius) {
            this.reverseY();
            collided = true;
        }
        return collided;
    }

    checkPaddleCollision(paddle) {
        if (this.y + this.dy > paddle.y - this.radius &&
            this.y + this.dy < paddle.y + paddle.height &&
            this.x > paddle.x && 
            this.x < paddle.x + paddle.width) {
            this.reverseY();
            const paddleCenter = paddle.x + paddle.width / 2;
            const collisionPoint = this.x - paddleCenter;
            this.dx = collisionPoint * 0.06;
            return true;
        }
        return false;
    }

    isLost() {
        return this.y + this.dy > this.canvas.height - this.radius;
    }

    draw(ctx) {
        const image = this.explosive ? this.explosiveBallImage : this.normalBallImage;
        const size = this.radius * 2;
        ctx.drawImage(image, this.x - this.radius, this.y - this.radius, size, size);
    }

    setSize(size) {
        this.radius = this.BALL_SIZES[size];
    }
}

export class Brick {
    constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.status = this.getInitialStatus(type);
        this.images = this.loadImages();
        this.updateDimensions();
    }

    updateDimensions() {
        const scale = GameState.getScale();
        this.width *= scale;
        this.height *= scale;
        this.x *= scale;
        this.y *= scale;
    }

    getInitialStatus(type) {
        switch (type) {
            case BRICK_TYPES.STRONG:
                return 2;
            case BRICK_TYPES.METAL:
            case BRICK_TYPES.INVINCIBLE:
                return Infinity;
            default:
                return 1;
        }
    }

    loadImages() {
        const images = {};
        images[BRICK_TYPES.NORMAL] = this.loadImage('assets/normal_brick.png');
        images[BRICK_TYPES.STRONG] = this.loadImage('assets/strong_brick.png');
        images[BRICK_TYPES.BONUS] = this.loadImage('assets/bonus_brick.png');
        images[BRICK_TYPES.DEBUFF] = this.loadImage('assets/debuff_brick.png');
        images[BRICK_TYPES.DYNAMITE] = this.loadImage('assets/dynamite_brick.png');
        images[BRICK_TYPES.METAL] = this.loadImage('assets/metal_brick.png');
        images[BRICK_TYPES.INVINCIBLE] = this.loadImage('assets/invincible_brick.png');
        images[BRICK_TYPES.SAND] = this.loadImage('assets/sand_brick.png');
        return images;
    }

    loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    }

    draw(ctx) {
        if (this.status <= 0) return;

        const image = this.images[this.type];
        if (image) {
            ctx.drawImage(image, this.x, this.y, this.width, this.height);
        } else {
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = "#0095DD"; // Fallback color
            ctx.fill();
            ctx.closePath();
        }
    }

    hit(isExplosive) {
        if (this.type === BRICK_TYPES.INVINCIBLE) {
            return false;
        }
        if (this.type === BRICK_TYPES.METAL) {
            if (isExplosive) {
                this.status = 0;
                return true;
            }
            return false;
        }
        this.status--;
        if (this.type === BRICK_TYPES.STRONG && this.status === 1) {
            this.type = BRICK_TYPES.SAND;
        }
        return this.status <= 0;
    }
}