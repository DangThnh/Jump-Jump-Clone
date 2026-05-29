class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Thanh Loading... (Giữ nguyên như cũ)
        let progressBar = this.add.graphics();
        let progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(125, 380, 200, 30);
        this.load.on('progress', function (value) {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(135, 390, 180 * value, 10);
        });
        this.load.on('complete', function () {
            progressBar.destroy();
            progressBox.destroy();
        });

        // 1. TẢI HÌNH ẢNH (Thêm 2 khối hộp mới)
        this.load.setPath('assets/images/');
        this.load.image('piece', 'piece.png'); 
        this.load.image('box_normal', 'box_normal.png');
        this.load.image('box_round', 'box_round.png'); // Hộp tròn mới
        this.load.image('box_gift', 'box_gift.png');   // Hộp quà mới
        this.load.image('dust', 'dust.png');           // Hạt bụi/khói
        this.load.image('particle', 'particle.png');     // Hạt lấp lánh (thay thế cho bụi)

        // 2. TẢI ÂM THANH (Bỏ comment phần này đi)
        this.load.setPath('assets/audio/');
        this.load.audio('sfx_charge', 'charge.mp3');     // Tiếng lò xo nén (nút giữ)
        this.load.audio('sfx_jump', 'jump.mp3');         // Tiếng boing bật nhảy
        this.load.audio('sfx_land', 'land.mp3');         // Tiếng tiếp đất thường
        this.load.audio('sfx_perfect', 'perfect.mp3');   // Tiếng ting trong trẻo
        this.load.audio('sfx_gameover', 'gameover.mp3'); // Tiếng buồn bã lúc ngã
    }

    create() {
        this.scene.start('GameScene');
    }
}