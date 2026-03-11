const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 750,
    backgroundColor: "#202830",
    scene: {
        preload,
        create,
        update
    }
};

new Phaser.Game(config);

let player;
let cursors;
let facing = "S";
let facingText;
let tileText;
let infoText;
let movingText;
let zoomText;

let zoomInKey;
let zoomOutKey;

// -----------------------------
// Iso tile settings
// -----------------------------
const TILE_W = 96;
const TILE_H = 48;

const GRID_COLS = 20;
const GRID_ROWS = 16;

// Screen position of logical tile (0,0)
const ISO_ORIGIN_X = 500;
const ISO_ORIGIN_Y = 170;

// Player logical tile position (this is the truth)
let playerTileX = 4;
let playerTileY = 3;

// Smooth movement state
let isMoving = false;
let moveDuration = 180; // milliseconds for one tile move
let moveElapsed = 0;

let moveStartX = 0;
let moveStartY = 0;
let moveTargetX = 0;
let moveTargetY = 0;

// Blocked tiles for demo
const blockedTiles = new Set([
    "2,2", "3,2", "6,4", "7,4", "8,4",
    "10,8", "11,8", "12,8",
    "15,5", "15,6", "15,7"
]);

function preload() {
    this.load.spritesheet(
        "walkSheet",
        "https://labs.phaser.io/assets/sprites/dude.png",
        { frameWidth: 32, frameHeight: 48 }
    );

    this.load.image(
        "idle",
        "https://labs.phaser.io/assets/sprites/phaser-dude.png"
    );
}

function create() {
    cursors = this.input.keyboard.createCursorKeys();

    zoomInKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    zoomOutKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    drawDebugIsoGrid(this);

    player = this.add.sprite(0, 0, "idle");
    player.setScale(1.3);
    player.setOrigin(0.5, 1);

    this.anims.create({
        key: "walk",
        frames: this.anims.generateFrameNumbers("walkSheet", {
            start: 0,
            end: 3
        }),
        frameRate: 8,
        repeat: -1
    });

    // -----------------------------
    // HUD / debug text
    // -----------------------------
    this.add.text(20, 20, "Faux-Isometric Tile/Grid Scaffold", {
        fontSize: "24px",
        color: "#ffffff"
    }).setDepth(10000).setScrollFactor(0);

    infoText = this.add.text(20, 55, "8-dir movement + smooth tiles + camera", {
        fontSize: "18px",
        color: "#cfd8dc"
    }).setDepth(10000).setScrollFactor(0);

    facingText = this.add.text(20, 85, "Facing: S", {
        fontSize: "18px",
        color: "#cfd8dc"
    }).setDepth(10000).setScrollFactor(0);

    tileText = this.add.text(20, 115, `Tile: (${playerTileX}, ${playerTileY})`, {
        fontSize: "18px",
        color: "#cfd8dc"
    }).setDepth(10000).setScrollFactor(0);

    movingText = this.add.text(20, 145, "Moving: false", {
        fontSize: "18px",
        color: "#cfd8dc"
    }).setDepth(10000).setScrollFactor(0);

    zoomText = this.add.text(20, 175, "Zoom: 1.00  (Q/E or mouse wheel)", {
        fontSize: "18px",
        color: "#cfd8dc"
    }).setDepth(10000).setScrollFactor(0);

    this.add.text(20, 205, "Green dot = center of logical tile (0,0)", {
        fontSize: "16px",
        color: "#cfd8dc"
    }).setDepth(10000).setScrollFactor(0);

    // -----------------------------
    // Initial player placement
    // -----------------------------
    const start = tileToScreen(playerTileX, playerTileY);
    player.x = start.x;
    player.y = start.y + 10;
    updateDepths();

    // -----------------------------
    // Camera setup
    // -----------------------------
    const cam = this.cameras.main;
    const bounds = getIsoWorldBounds();

    cam.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    cam.startFollow(player, true, 0.15, 0.15);
    cam.setZoom(1);

    // mouse wheel zoom
    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
        const zoomStep = 0.1;
        const nextZoom = deltaY > 0 ? cam.zoom - zoomStep : cam.zoom + zoomStep;
        cam.setZoom(Phaser.Math.Clamp(nextZoom, 0.5, 2.5));
        updateZoomText(cam);
    });

    updateZoomText(cam);
}

function update(time, delta) {
    handleCameraZoom(this);

    if (isMoving) {
        updateSmoothMovement(delta);
    } else {
        const move = getInputDirection();

        if (move.dx !== 0 || move.dy !== 0) {
            tryStartMove(move.dx, move.dy);
        }
    }
}

function getInputDirection() {
    let dx = 0;
    let dy = 0;

    if (cursors.left.isDown) dx -= 1;
    if (cursors.right.isDown) dx += 1;
    if (cursors.up.isDown) dy -= 1;
    if (cursors.down.isDown) dy += 1;

    return { dx, dy };
}

function tryStartMove(dx, dy) {
    const nextX = playerTileX + dx;
    const nextY = playerTileY + dy;

    facing = getDirection(dx, dy);
    facingText.setText("Facing: " + facing);

    if (!isInBounds(nextX, nextY)) {
        setIdleVisual();
        return;
    }

    if (isBlocked(nextX, nextY)) {
        setIdleVisual();
        return;
    }

    // logical position updates immediately at move start
    playerTileX = nextX;
    playerTileY = nextY;

    tileText.setText(`Tile: (${playerTileX}, ${playerTileY})`);

    moveStartX = player.x;
    moveStartY = player.y;

    const target = tileToScreen(playerTileX, playerTileY);
    moveTargetX = target.x;
    moveTargetY = target.y + 10;

    moveElapsed = 0;
    isMoving = true;
    movingText.setText("Moving: true");

    setWalkVisual(dx, dy);
}

function updateSmoothMovement(delta) {
    moveElapsed += delta;

    let t = moveElapsed / moveDuration;
    if (t > 1) t = 1;

    player.x = Phaser.Math.Linear(moveStartX, moveTargetX, t);
    player.y = Phaser.Math.Linear(moveStartY, moveTargetY, t);

    updateDepths();

    if (t >= 1) {
        player.x = moveTargetX;
        player.y = moveTargetY;

        isMoving = false;
        movingText.setText("Moving: false");
        setIdleVisual();
    }
}

function tileToScreen(tileX, tileY) {
    return {
        x: ISO_ORIGIN_X + (tileX - tileY) * (TILE_W / 2),
        y: ISO_ORIGIN_Y + (tileX + tileY) * (TILE_H / 2)
    };
}

function getIsoWorldBounds() {
    const corners = [
        tileToScreen(0, 0),
        tileToScreen(GRID_COLS - 1, 0),
        tileToScreen(0, GRID_ROWS - 1),
        tileToScreen(GRID_COLS - 1, GRID_ROWS - 1)
    ];

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of corners) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    // pad for tile extents and sprite height
    minX -= TILE_W;
    maxX += TILE_W;
    minY -= TILE_H * 2;
    maxY += TILE_H * 3;

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

function isInBounds(tileX, tileY) {
    return (
        tileX >= 0 &&
        tileX < GRID_COLS &&
        tileY >= 0 &&
        tileY < GRID_ROWS
    );
}

function isBlocked(tileX, tileY) {
    return blockedTiles.has(`${tileX},${tileY}`);
}

function setWalkVisual(dx, dy) {
    if (player.texture.key !== "walkSheet") {
        player.setTexture("walkSheet", 0);
    }

    player.play("walk", true);

    if (dx < 0) {
        player.setFlipX(true);
    } else if (dx > 0) {
        player.setFlipX(false);
    }
}

function setIdleVisual() {
    player.stop();

    if (player.texture.key !== "idle") {
        player.setTexture("idle");
    }
}

function getDirection(dx, dy) {
    if (dx === 1 && dy === -1) return "NE";
    if (dx === -1 && dy === -1) return "NW";
    if (dx === 1 && dy === 1) return "SE";
    if (dx === -1 && dy === 1) return "SW";

    if (dx === 1 && dy === 0) return "E";
    if (dx === -1 && dy === 0) return "W";
    if (dx === 0 && dy === -1) return "N";
    if (dx === 0 && dy === 1) return "S";

    return facing;
}

function updateDepths() {
    player.depth = player.y;
}

function handleCameraZoom(scene) {
    const cam = scene.cameras.main;

    if (Phaser.Input.Keyboard.JustDown(zoomInKey)) {
        cam.setZoom(Phaser.Math.Clamp(cam.zoom + 0.1, 0.5, 2.5));
        updateZoomText(cam);
    }

    if (Phaser.Input.Keyboard.JustDown(zoomOutKey)) {
        cam.setZoom(Phaser.Math.Clamp(cam.zoom - 0.1, 0.5, 2.5));
        updateZoomText(cam);
    }
}

function updateZoomText(cam) {
    zoomText.setText(`Zoom: ${cam.zoom.toFixed(2)}  (Q/E or mouse wheel)`);
}

function drawDebugIsoGrid(scene) {
    const g = scene.add.graphics();

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const center = tileToScreen(col, row);
            const blocked = blockedTiles.has(`${col},${row}`);

            const fillColor = blocked ? 0x6d4c41 : 0x455a64;
            const lineColor = blocked ? 0xffab91 : 0x90a4ae;

            g.lineStyle(2, lineColor, 0.95);
            g.fillStyle(fillColor, 1);

            g.beginPath();
            g.moveTo(center.x, center.y - TILE_H / 2);
            g.lineTo(center.x + TILE_W / 2, center.y);
            g.lineTo(center.x, center.y + TILE_H / 2);
            g.lineTo(center.x - TILE_W / 2, center.y);
            g.closePath();

            g.fillPath();
            g.strokePath();

            scene.add.text(center.x - 18, center.y - 10, `${col},${row}`, {
                fontSize: "14px",
                color: blocked ? "#ffccbc" : "#eceff1"
            }).setDepth(center.y + 1);

            if (blocked) {
                scene.add.text(center.x - 22, center.y + 10, "BLOCK", {
                    fontSize: "12px",
                    color: "#ffab91"
                }).setDepth(center.y + 1);
            }
        }
    }

    const origin = tileToScreen(0, 0);
    scene.add.circle(origin.x, origin.y, 5, 0x00e676).setDepth(origin.y + 2);
}