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

// -----------------------------
// Iso tile settings
// -----------------------------
const TILE_W = 96;
const TILE_H = 48;

const GRID_COLS = 9;
const GRID_ROWS = 7;

// Screen position of logical tile (0,0)
const ISO_ORIGIN_X = 500;
const ISO_ORIGIN_Y = 170;

// Player logical tile position (THIS is the truth)
let playerTileX = 4;
let playerTileY = 3;

// Discrete movement timing
let moveCooldown = 0;
const MOVE_DELAY = 140;

// Blocked tiles for demo
const blockedTiles = new Set([
    "2,2",
    "3,2",
    "6,4"
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

    drawDebugIsoGrid(this);

    player = this.add.sprite(0, 0, "idle");
    player.setScale(1.3);

    this.anims.create({
        key: "walk",
        frames: this.anims.generateFrameNumbers("walkSheet", {
            start: 0,
            end: 3
        }),
        frameRate: 8,
        repeat: -1
    });

    this.add.text(20, 20, "Faux-Isometric Tile/Grid Scaffold", {
        fontSize: "24px",
        color: "#ffffff"
    }).setDepth(10000);

    infoText = this.add.text(20, 55, "Arrow keys move one logical tile at a time", {
        fontSize: "18px",
        color: "#cfd8dc"
    }).setDepth(10000);

    facingText = this.add.text(20, 85, "Facing: S", {
        fontSize: "18px",
        color: "#cfd8dc"
    }).setDepth(10000);

    tileText = this.add.text(20, 115, `Tile: (${playerTileX}, ${playerTileY})`, {
        fontSize: "18px",
        color: "#cfd8dc"
    }).setDepth(10000);

    syncPlayerSpriteToTile();
    updateDepths();
}

function update(time, delta) {
    moveCooldown -= delta;

    let dx = 0;
    let dy = 0;

    if (moveCooldown <= 0) {
        // 4-direction logical movement on the grid
        if (Phaser.Input.Keyboard.JustDown(cursors.left)) dx = -1;
        else if (Phaser.Input.Keyboard.JustDown(cursors.right)) dx = 1;
        else if (Phaser.Input.Keyboard.JustDown(cursors.up)) dy = -1;
        else if (Phaser.Input.Keyboard.JustDown(cursors.down)) dy = 1;

        // basic hold support
        if (dx === 0 && dy === 0) {
            if (cursors.left.isDown) dx = -1;
            else if (cursors.right.isDown) dx = 1;
            else if (cursors.up.isDown) dy = -1;
            else if (cursors.down.isDown) dy = 1;
        }

        if (dx !== 0 || dy !== 0) {
            tryMovePlayer(dx, dy);
            moveCooldown = MOVE_DELAY;
        }
    }
}

function tryMovePlayer(dx, dy) {
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

    // Update TRUE logical position
    playerTileX = nextX;
    playerTileY = nextY;

    // Convert logical tile to rendered screen position
    syncPlayerSpriteToTile();
    updateDepths();

    tileText.setText(`Tile: (${playerTileX}, ${playerTileY})`);

    setWalkVisual(dx);
}

function syncPlayerSpriteToTile() {
    const screen = tileToScreen(playerTileX, playerTileY);

    // put feet near the tile center
    player.x = screen.x;
    player.y = screen.y - 10;
}

function tileToScreen(tileX, tileY) {
    return {
        x: ISO_ORIGIN_X + (tileX - tileY) * (TILE_W / 2),
        y: ISO_ORIGIN_Y + (tileX + tileY) * (TILE_H / 2)
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

function setWalkVisual(dx) {
    if (player.texture.key !== "walkSheet") {
        player.setTexture("walkSheet", 0);
    }

    player.play("walk", true);

    // Placeholder horizontal flip only
    if (dx < 0) player.setFlipX(true);
    else if (dx > 0) player.setFlipX(false);
}

function setIdleVisual() {
    player.stop();

    if (player.texture.key !== "idle") {
        player.setTexture("idle");
    }
}

function getDirection(dx, dy) {
    // Important:
    // logical movement directions map to diagonal-looking motion on screen

    if (dx === 1) return "E";
    if (dx === -1) return "W";
    if (dy === -1) return "N";
    if (dy === 1) return "S";

    return facing;
}

function updateDepths() {
    // In faux-isometric, lower things on the screen should render in front.
    player.depth = player.y;
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
            g.moveTo(center.x, center.y - TILE_H / 2);      // top
            g.lineTo(center.x + TILE_W / 2, center.y);      // right
            g.lineTo(center.x, center.y + TILE_H / 2);      // bottom
            g.lineTo(center.x - TILE_W / 2, center.y);      // left
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

    scene.add.text(
        20,
        145,
        "Green dot = center of logical tile (0,0)",
        {
            fontSize: "16px",
            color: "#cfd8dc"
        }
    ).setDepth(10000);
}