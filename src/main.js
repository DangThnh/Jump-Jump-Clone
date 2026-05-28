const config = {
    type: Phaser.AUTO,
    width: 450,
    height: 800,
    backgroundColor: '#faf8f5',
    parent: 'game-container',
    scene: [BootScene, GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);