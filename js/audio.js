// audio.js - Sound system using Web Audio API

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sounds = {};
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
        this._generateSounds();
    }

    _generateSounds() {
        // Generate synthetic sound effects
        this.sounds.rifle = this._createShootSound(0.08, 200, 0.6);
        this.sounds.shotgun = this._createShootSound(0.15, 120, 0.8);
        this.sounds.sniper = this._createShootSound(0.2, 80, 0.9);
        this.sounds.pistol = this._createShootSound(0.06, 300, 0.4);
        this.sounds.smg = this._createShootSound(0.05, 350, 0.35);
        this.sounds.hit = this._createHitSound();
        this.sounds.pickup = this._createPickupSound();
        this.sounds.death = this._createDeathSound();
        this.sounds.reload = this._createReloadSound();
        this.sounds.jump = this._createJumpSound();
        this.sounds.step = this._createStepSound();
        this.sounds.dryfire = this._createDryFireSound();
    }

    _createBuffer(duration, fn) {
        const sampleRate = this.ctx.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = fn(i / sampleRate, i / length);
        }
        return buffer;
    }

    _createShootSound(duration, freq, intensity) {
        return this._createBuffer(duration, (t, p) => {
            const noise = (Math.random() * 2 - 1) * (1 - p) * intensity;
            const tone = Math.sin(t * freq * Math.PI * 2) * (1 - p) * 0.3;
            return (noise + tone) * (1 - p * p);
        });
    }

    _createHitSound() {
        return this._createBuffer(0.1, (t, p) => {
            return Math.sin(t * 800 * Math.PI * 2) * (1 - p) * 0.4;
        });
    }

    _createPickupSound() {
        return this._createBuffer(0.2, (t, p) => {
            const freq = 400 + p * 400;
            return Math.sin(t * freq * Math.PI * 2) * (1 - p) * 0.3;
        });
    }

    _createDeathSound() {
        return this._createBuffer(0.3, (t, p) => {
            const freq = 200 * (1 - p * 0.5);
            return Math.sin(t * freq * Math.PI * 2) * (1 - p) * 0.5 +
                   (Math.random() * 2 - 1) * (1 - p) * 0.2;
        });
    }

    _createReloadSound() {
        return this._createBuffer(0.4, (t, p) => {
            if (p < 0.2) return Math.random() * 0.3 * (p / 0.2);
            if (p < 0.5) return Math.sin(t * 600 * Math.PI * 2) * 0.2;
            return Math.random() * 0.3 * (1 - p);
        });
    }

    _createJumpSound() {
        return this._createBuffer(0.1, (t, p) => {
            return Math.sin(t * (200 + p * 100) * Math.PI * 2) * (1 - p) * 0.15;
        });
    }

    _createStepSound() {
        return this._createBuffer(0.06, (t, p) => {
            return (Math.random() * 2 - 1) * (1 - p) * 0.08;
        });
    }

    _createDryFireSound() {
        return this._createBuffer(0.05, (t, p) => {
            return Math.sin(t * 2000 * Math.PI * 2) * (1 - p) * 0.15;
        });
    }

    play(name, volume = 1.0, playbackRate = 1.0) {
        if (!this.initialized || !this.sounds[name]) return;
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = this.sounds[name];
        source.playbackRate.value = playbackRate + (Math.random() - 0.5) * 0.1;
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(this.masterGain);
        source.start(0);
    }

    play3D(name, listenerPos, soundPos, volume = 1.0) {
        const dist = distance3D(listenerPos, soundPos);
        const maxDist = 50;
        if (dist > maxDist) return;
        const attenuation = 1 - (dist / maxDist);
        this.play(name, volume * attenuation * attenuation);
    }
}

const audioManager = new AudioManager();
