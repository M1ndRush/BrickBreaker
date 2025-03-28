export class SoundManager {
    constructor() {
        this.sounds = {
            welcomeScreen: new Audio('assets/sounds/Welcome_Screen.ogg'),
            stage1: new Audio('assets/sounds/Stage_1.ogg'),
            stage2: new Audio('assets/sounds/Stage_2.ogg'),
            stage3: new Audio('assets/sounds/Stage_3.wav'),
            stage4: new Audio('assets/sounds/Stage_4.wav'),
            stage5: new Audio('assets/sounds/Stage_5.ogg'),
            brickCollision: new Audio('assets/sounds/brick_collision.ogg'),
            paddleCollision: new Audio('assets/sounds/paddle_collision.ogg'),
            wallCollision: new Audio('assets/sounds/wall_collision.ogg'),
            brickDestroyed: new Audio('assets/sounds/Brick_destroyed.ogg'),
            bonusPickedUp: new Audio('assets/sounds/bonus_picked_up.ogg'),
            debuffPickedUp: new Audio('assets/sounds/debuff_picked_up.ogg')
        };

        this.currentBackgroundMusic = null;
        this.musicVolume = 0.5; // Значение по умолчанию (от 0 до 1)
        this.effectsVolume = 0.5; // Значение по умолчанию (от 0 до 1)

        this.applyVolume();
    }

    applyVolume() {
        for (let sound in this.sounds) {
            if (sound.startsWith('stage') || sound === 'welcomeScreen') {
                this.sounds[sound].volume = this.musicVolume;
            } else {
                this.sounds[sound].volume = this.effectsVolume;
            }
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.applyVolume();
        if (this.currentBackgroundMusic) {
            this.currentBackgroundMusic.volume = this.musicVolume;
        }
    }

    setEffectsVolume(volume) {
        this.effectsVolume = Math.max(0, Math.min(1, volume));
        this.applyVolume();
    }

    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(e => console.error("Error playing sound:", e));
        }
    }

    playBackgroundMusic(gameState, level) {
        let musicTrack;
        if (gameState === 'welcome') {
            musicTrack = this.sounds.welcomeScreen;
        } else if (gameState === 'ready' || gameState === 'playing') {
            const stageNumber = Math.min(Math.ceil(level / 5), 5);
            musicTrack = this.sounds[`stage${stageNumber}`];
        }

        if (musicTrack && musicTrack !== this.currentBackgroundMusic) {
            if (this.currentBackgroundMusic) {
                this.currentBackgroundMusic.pause();
                this.currentBackgroundMusic.currentTime = 0;
            }
            musicTrack.loop = true;
            musicTrack.volume = this.musicVolume;
            musicTrack.play().catch(e => console.error("Error playing background music:", e));
            this.currentBackgroundMusic = musicTrack;
        }
    }

    stopBackgroundMusic() {
        if (this.currentBackgroundMusic) {
            this.currentBackgroundMusic.pause();
            this.currentBackgroundMusic.currentTime = 0;
            this.currentBackgroundMusic = null;
        }
    }
}