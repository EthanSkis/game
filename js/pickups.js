// pickups.js - Health, armor, and ammo pickups

const PICKUP_DEFS = {
    health: {
        color: 0x33ff33,
        amount: 25,
        bobSpeed: 2,
        size: 0.4,
    },
    armor: {
        color: 0x3388ff,
        amount: 25,
        bobSpeed: 2.5,
        size: 0.4,
    },
    ammo: {
        color: 0xffaa33,
        amount: 30, // added to reserve
        bobSpeed: 1.8,
        size: 0.35,
    }
};

class Pickup {
    constructor(scene, x, z, type) {
        this.scene = scene;
        this.type = type;
        this.def = PICKUP_DEFS[type];
        this.active = true;
        this.respawnTimer = 0;
        this.position = new THREE.Vector3(x, 0.5, z);
        this.baseY = 0.5;

        // Create visual
        this.mesh = this._createMesh();
        scene.add(this.mesh);
    }

    _createMesh() {
        const group = new THREE.Group();

        let geo;
        if (this.type === 'health') {
            // Cross shape for health
            const h1 = new THREE.BoxGeometry(this.def.size, this.def.size * 0.3, this.def.size * 0.3);
            const h2 = new THREE.BoxGeometry(this.def.size * 0.3, this.def.size, this.def.size * 0.3);
            const mat = new THREE.MeshLambertMaterial({ color: this.def.color, emissive: this.def.color, emissiveIntensity: 0.3 });
            const m1 = new THREE.Mesh(h1, mat);
            const m2 = new THREE.Mesh(h2, mat);
            group.add(m1);
            group.add(m2);
        } else if (this.type === 'armor') {
            geo = new THREE.OctahedronGeometry(this.def.size, 0);
            const mat = new THREE.MeshLambertMaterial({ color: this.def.color, emissive: this.def.color, emissiveIntensity: 0.3 });
            group.add(new THREE.Mesh(geo, mat));
        } else {
            geo = new THREE.BoxGeometry(this.def.size, this.def.size * 0.6, this.def.size * 0.6);
            const mat = new THREE.MeshLambertMaterial({ color: this.def.color, emissive: this.def.color, emissiveIntensity: 0.3 });
            group.add(new THREE.Mesh(geo, mat));
        }

        // Glow
        const glowGeo = new THREE.SphereGeometry(this.def.size * 1.2, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: this.def.color,
            transparent: true,
            opacity: 0.15
        });
        group.add(new THREE.Mesh(glowGeo, glowMat));

        group.position.copy(this.position);
        return group;
    }

    update(dt, time) {
        if (!this.active) {
            this.mesh.visible = false;
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.active = true;
                this.mesh.visible = true;
            }
            return;
        }

        // Bob and rotate
        this.mesh.position.y = this.baseY + Math.sin(time * this.def.bobSpeed) * 0.15;
        this.mesh.rotation.y += dt * 1.5;
    }

    tryPickup(entity) {
        if (!this.active) return false;

        const dist = distance2D(this.position, entity.position);
        if (dist > 1.5) return false;

        let picked = false;

        if (this.type === 'health' && entity.health < GAME_CONSTANTS.MAX_HEALTH) {
            entity.health = Math.min(GAME_CONSTANTS.MAX_HEALTH, entity.health + this.def.amount);
            picked = true;
        } else if (this.type === 'armor' && entity.armor < GAME_CONSTANTS.MAX_ARMOR) {
            entity.armor = Math.min(GAME_CONSTANTS.MAX_ARMOR, entity.armor + this.def.amount);
            picked = true;
        } else if (this.type === 'ammo') {
            const weapon = entity.weapons ? entity.weapons[entity.currentWeaponIndex] : entity.weapon;
            if (weapon && weapon.reserveAmmo < weapon.def.reserveAmmo) {
                weapon.reserveAmmo = Math.min(weapon.def.reserveAmmo, weapon.reserveAmmo + this.def.amount);
                picked = true;
            }
        }

        if (picked) {
            this.active = false;
            this.respawnTimer = GAME_CONSTANTS.PICKUP_RESPAWN_TIME;
            audioManager.play('pickup', 0.4);
        }

        return picked;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}
