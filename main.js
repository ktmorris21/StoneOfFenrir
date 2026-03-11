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

const game = new Phaser.Game(config);

let player;
let cursors;
let speed = 200;

function preload() {

    // temporary placeholder sprite
    this.load.image('player',
    'https://labs.phaser.io/assets/sprites/phaser-dude.png');

}

function create() {

    player = this.add.sprite(450,300,'player');

    cursors = this.input.keyboard.createCursorKeys();

}

function update(time, delta) {

    let moveX = 0;
    let moveY = 0;

    if (cursors.left.isDown) {
        moveX -= 1;
        moveY += 1;
    }

    if (cursors.right.isDown) {
        moveX += 1;
        moveY -= 1;
    }

    if (cursors.up.isDown) {
        moveX -= 1;
        moveY -= 1;
    }

    if (cursors.down.isDown) {
        moveX += 1;
        moveY += 1;
    }

    player.x += moveX * speed * delta/1000;
    player.y += moveY * speed * delta/1000;

}