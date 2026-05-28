class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Vẽ thanh loading bar
        let progressBar = this.add.graphics();
        let progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(125, 380, 200, 30); // Giữa màn hình 450x800

        this.load.on('progress', function (value) {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(135, 390, 180 * value, 10);
        });

        this.load.on('complete', function () {
            progressBar.destroy();
            progressBox.destroy();
        });

        // Load Hình ảnh (Cậu tự bỏ file ảnh vào thư mục nhé)
        // Set path để khỏi gõ dài dòng
        this.load.setPath('assets/images/');
        this.load.image('piece', 'piece.png'); 
        this.load.image('box_normal', 'box_normal.png');
        this.load.image('dust', 'dust.png');

        // Load Âm thanh (Để comment nếu chưa có file âm thanh để tránh lỗi console)
        /*
        this.load.setPath('assets/audio/');
        this.load.audio('sfx_charge', 'charge.mp3');
        this.load.audio('sfx_jump', 'jump.mp3');
        this.load.audio('sfx_land', 'land.mp3');
        this.load.audio('sfx_perfect', 'perfect.mp3');
        this.load.audio('sfx_gameover', 'gameover.mp3');
        */
    }

    create() {
        // Load xong thì chuyển thẳng qua GameScene
        this.scene.start('GameScene');
    }
}