// weapons.js - Weapon definitions and weapon system

const WEAPONS = {
    pistol: {
        name: 'PISTOL',
        damage: 20,
        fireRate: 0.3,     // seconds between shots
        magSize: 12,
        reserveAmmo: 48,
        reloadTime: 1.5,
        spread: 0.015,
        range: 80,
        automatic: false,
        headshotMultiplier: 2.0,
        recoilAmount: 0.02,
        sound: 'pistol',
        slot: 1,
    },
    smg: {
        name: 'SMG',
        damage: 15,
        fireRate: 0.08,
        magSize: 25,
        reserveAmmo: 100,
        reloadTime: 1.8,
        spread: 0.04,
        range: 50,
        automatic: true,
        headshotMultiplier: 1.5,
        recoilAmount: 0.015,
        sound: 'smg',
        slot: 2,
    },
    rifle: {
        name: 'RIFLE',
        damage: 25,
        fireRate: 0.12,
        magSize: 30,
        reserveAmmo: 90,
        reloadTime: 2.0,
        spread: 0.025,
        range: 100,
        automatic: true,
        headshotMultiplier: 2.0,
        recoilAmount: 0.025,
        sound: 'rifle',
        slot: 3,
    },
    shotgun: {
        name: 'SHOTGUN',
        damage: 12,          // per pellet
        fireRate: 0.8,
        magSize: 6,
        reserveAmmo: 24,
        reloadTime: 2.5,
        spread: 0.08,
        range: 25,
        automatic: false,
        headshotMultiplier: 1.5,
        recoilAmount: 0.06,
        pellets: 8,
        sound: 'shotgun',
        slot: 4,
    },
    sniper: {
        name: 'SNIPER',
        damage: 80,
        fireRate: 1.2,
        magSize: 5,
        reserveAmmo: 20,
        reloadTime: 3.0,
        spread: 0.005,
        range: 200,
        automatic: false,
        headshotMultiplier: 2.5,
        recoilAmount: 0.08,
        sound: 'sniper',
        slot: 5,
    }
};

class WeaponState {
    constructor(weaponId) {
        const def = WEAPONS[weaponId];
        this.id = weaponId;
        this.def = def;
        this.currentAmmo = def.magSize;
        this.reserveAmmo = def.reserveAmmo;
        this.lastFireTime = 0;
        this.isReloading = false;
        this.reloadStartTime = 0;
        this.recoilOffset = 0;
    }

    canFire(time) {
        return !this.isReloading &&
               this.currentAmmo > 0 &&
               (time - this.lastFireTime) >= this.def.fireRate;
    }

    fire(time) {
        if (!this.canFire(time)) return false;
        this.currentAmmo--;
        this.lastFireTime = time;
        this.recoilOffset = this.def.recoilAmount;
        return true;
    }

    startReload(time) {
        if (this.isReloading || this.currentAmmo === this.def.magSize || this.reserveAmmo <= 0) return false;
        this.isReloading = true;
        this.reloadStartTime = time;
        return true;
    }

    updateReload(time) {
        if (!this.isReloading) return false;
        if (time - this.reloadStartTime >= this.def.reloadTime) {
            const needed = this.def.magSize - this.currentAmmo;
            const loaded = Math.min(needed, this.reserveAmmo);
            this.currentAmmo += loaded;
            this.reserveAmmo -= loaded;
            this.isReloading = false;
            return true; // reload complete
        }
        return false;
    }

    updateRecoil(dt) {
        this.recoilOffset = lerp(this.recoilOffset, 0, dt * 10);
    }
}
