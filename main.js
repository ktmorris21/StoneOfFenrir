const config = {
    type: Phaser.AUTO,
    width: 900,
    height: 600,
    backgroundColor: "#2d2d2d",
    scene: {
        preload,
        create,
        update
    }
};

new Phaser.Game(config);

let player;
let cursors;
let speed = 220;
let facing = "S";
let facingText;

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

    player = this.add.sprite(450, 300, "idle");
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

    this.add.text(20, 20, "8-direction movement", {
        fontSize: "22px",
        color: "#ffffff"
    });

    facingText = this.add.text(20, 60, "Facing: S", {
        fontSize: "18px",
        color: "#cccccc"
    });

}

function update(time, delta) {

    let dx = 0;
    let dy = 0;

    if (cursors.left.isDown) dx -= 1;
    if (cursors.right.isDown) dx += 1;
    if (cursors.up.isDown) dy -= 1;
    if (cursors.down.isDown) dy += 1;

    const dt = delta / 1000;

    if (dx !== 0 || dy !== 0) {

        const mag = Math.hypot(dx, dy);
        dx /= mag;
        dy /= mag;

        player.x += dx * speed * dt;
        player.y += dy * speed * dt;

        facing = getDirection(dx, dy);
        facingText.setText("Facing: " + facing);

        if (player.texture.key !== "walkSheet") {
            player.setTexture("walkSheet", 0);
        }

        if (!player.anims.isPlaying) {
            player.play("walk");
        }

        // quick placeholder flip
        if (dx < 0) player.setFlipX(true);
        else player.setFlipX(false);

    } else {

        if (player.texture.key !== "idle") {
            player.stop();
            player.setTexture("idle");
        }

    }

}

function getDirection(dx, dy) {

    const threshold = 0.3;

    if (dy < -threshold && dx > threshold) return "NE";
    if (dy < -threshold && dx < -threshold) return "NW";

    if (dy > threshold && dx > threshold) return "SE";
    if (dy > threshold && dx < -threshold) return "SW";

    if (dy < -threshold) return "N";
    if (dy > threshold) return "S";

    if (dx > threshold) return "E";
    if (dx < -threshold) return "W";

    return facing;
}