// navmesh.js - Grid-based navigation mesh + A* pathfinding

class NavGrid {
    constructor(mapSize, cellSize = 1.5) {
        this.cellSize = cellSize;
        this.halfX = mapSize.x / 2;
        this.halfZ = mapSize.z / 2;
        this.cols = Math.ceil(mapSize.x / cellSize);
        this.rows = Math.ceil(mapSize.z / cellSize);
        this.grid = new Uint8Array(this.cols * this.rows); // 0 = walkable, 1 = blocked
        this.colliders = [];
    }

    bake(colliders) {
        this.colliders = colliders;
        const padding = GAME_CONSTANTS.PLAYER_RADIUS + 0.2;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const worldX = (c * this.cellSize) - this.halfX + this.cellSize / 2;
                const worldZ = (r * this.cellSize) - this.halfZ + this.cellSize / 2;
                let blocked = false;

                for (const col of colliders) {
                    if (worldX >= col.min.x - padding && worldX <= col.max.x + padding &&
                        worldZ >= col.min.z - padding && worldZ <= col.max.z + padding &&
                        col.max.y > 0.3) { // only block if tall enough to collide
                        blocked = true;
                        break;
                    }
                }

                this.grid[r * this.cols + c] = blocked ? 1 : 0;
            }
        }
    }

    worldToGrid(x, z) {
        const c = Math.floor((x + this.halfX) / this.cellSize);
        const r = Math.floor((z + this.halfZ) / this.cellSize);
        return { c: clamp(c, 0, this.cols - 1), r: clamp(r, 0, this.rows - 1) };
    }

    gridToWorld(c, r) {
        return {
            x: (c * this.cellSize) - this.halfX + this.cellSize / 2,
            z: (r * this.cellSize) - this.halfZ + this.cellSize / 2
        };
    }

    isWalkable(c, r) {
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return false;
        return this.grid[r * this.cols + c] === 0;
    }

    // A* pathfinding
    findPath(startX, startZ, endX, endZ) {
        const start = this.worldToGrid(startX, startZ);
        const end = this.worldToGrid(endX, endZ);

        if (!this.isWalkable(end.c, end.r)) {
            // Find nearest walkable cell to destination
            const nearest = this._findNearestWalkable(end.c, end.r);
            if (!nearest) return null;
            end.c = nearest.c;
            end.r = nearest.r;
        }

        if (!this.isWalkable(start.c, start.r)) {
            const nearest = this._findNearestWalkable(start.c, start.r);
            if (!nearest) return null;
            start.c = nearest.c;
            start.r = nearest.r;
        }

        const openSet = new MinHeap();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const key = (c, r) => r * this.cols + c;
        const startKey = key(start.c, start.r);
        const endKey = key(end.c, end.r);

        gScore.set(startKey, 0);
        fScore.set(startKey, this._heuristic(start, end));
        openSet.push({ c: start.c, r: start.r, f: fScore.get(startKey) });

        const neighbors = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];

        let iterations = 0;
        const maxIterations = 2000;

        while (openSet.size() > 0 && iterations++ < maxIterations) {
            const current = openSet.pop();
            const currentKey = key(current.c, current.r);

            if (currentKey === endKey) {
                return this._reconstructPath(cameFrom, current);
            }

            for (const [dc, dr] of neighbors) {
                const nc = current.c + dc;
                const nr = current.r + dr;

                if (!this.isWalkable(nc, nr)) continue;

                // Prevent corner cutting
                if (dc !== 0 && dr !== 0) {
                    if (!this.isWalkable(current.c + dc, current.r) ||
                        !this.isWalkable(current.c, current.r + dr)) continue;
                }

                const nKey = key(nc, nr);
                const moveCost = (dc !== 0 && dr !== 0) ? 1.414 : 1;
                const tentativeG = (gScore.get(currentKey) || Infinity) + moveCost;

                if (tentativeG < (gScore.get(nKey) || Infinity)) {
                    cameFrom.set(nKey, current);
                    gScore.set(nKey, tentativeG);
                    const f = tentativeG + this._heuristic({ c: nc, r: nr }, end);
                    fScore.set(nKey, f);
                    openSet.push({ c: nc, r: nr, f });
                }
            }
        }

        return null; // No path found
    }

    _heuristic(a, b) {
        // Octile distance
        const dx = Math.abs(a.c - b.c);
        const dz = Math.abs(a.r - b.r);
        return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    }

    _reconstructPath(cameFrom, current) {
        const path = [];
        const key = (c, r) => r * this.cols + c;
        let node = current;

        while (node) {
            const world = this.gridToWorld(node.c, node.r);
            path.unshift({ x: world.x, z: world.z });
            node = cameFrom.get(key(node.c, node.r));
        }

        // Simplify path - remove collinear points
        if (path.length > 2) {
            const simplified = [path[0]];
            for (let i = 1; i < path.length - 1; i++) {
                const prev = simplified[simplified.length - 1];
                const next = path[i + 1];
                const curr = path[i];
                const dx1 = curr.x - prev.x;
                const dz1 = curr.z - prev.z;
                const dx2 = next.x - curr.x;
                const dz2 = next.z - curr.z;
                if (Math.abs(dx1 * dz2 - dz1 * dx2) > 0.01) {
                    simplified.push(curr);
                }
            }
            simplified.push(path[path.length - 1]);
            return simplified;
        }

        return path;
    }

    _findNearestWalkable(c, r) {
        for (let radius = 1; radius < 10; radius++) {
            for (let dc = -radius; dc <= radius; dc++) {
                for (let dr = -radius; dr <= radius; dr++) {
                    if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
                    if (this.isWalkable(c + dc, r + dr)) {
                        return { c: c + dc, r: r + dr };
                    }
                }
            }
        }
        return null;
    }
}

// Min-heap for A*
class MinHeap {
    constructor() {
        this.data = [];
    }

    size() { return this.data.length; }

    push(item) {
        this.data.push(item);
        this._bubbleUp(this.data.length - 1);
    }

    pop() {
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this._sinkDown(0);
        }
        return top;
    }

    _bubbleUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.data[i].f >= this.data[parent].f) break;
            [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
            i = parent;
        }
    }

    _sinkDown(i) {
        const n = this.data.length;
        while (true) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            if (left < n && this.data[left].f < this.data[smallest].f) smallest = left;
            if (right < n && this.data[right].f < this.data[smallest].f) smallest = right;
            if (smallest === i) break;
            [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
            i = smallest;
        }
    }
}
