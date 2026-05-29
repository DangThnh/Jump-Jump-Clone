class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#faf8f5');

        // 1. KHỞI TẠO CÁC BIẾN TRẠNG THÁI
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 2000; 
        this.baseScale = 2; 
        this.score = 0;
        this.comboPerfect = 0; // Đếm chuỗi combo Perfect liên tục

        // --- ĐĂNG KÝ DANH SÁCH HỘP VÀ HITBOX RIÊNG BIỆT ---
        // Mỗi loại hộp sẽ có độ cao mặt phẳng và bán kính va chạm khác nhau!
        this.boxRegistry = {
            'box_normal': { surfaceOffset: 28, boxRadius: 64, perfectRadius: 16 },
            'box_round':  { surfaceOffset: 22, boxRadius: 50, perfectRadius: 12 },
            'box_gift':   { surfaceOffset: 33, boxRadius: 70, perfectRadius: 18 }
        };

      // 2. KHỞI TẠO GAME OBJECTS & AUDIO
        this.platforms = this.add.group();
        
        // SỬA LỖI MẤT TIẾNG: Kiểm tra file âm thanh đã tải xong trong Cache chưa rồi khởi tạo trực tiếp
        if (this.cache.audio.exists('sfx_charge')) {
            this.chargeSound = this.sound.add('sfx_charge', { loop: true });
        }

        // Tạo khối hộp xuất phát mặc định (box_normal)
        this.currentBox = this.add.sprite(225, 600, 'box_normal');
        this.currentBox.setOrigin(0.5, 0.5); 
        this.currentBox.setScale(this.baseScale); 
        this.platforms.add(this.currentBox);

        // Gán metadata hitbox mặc định cho hộp đầu tiên
        this.currentBox.surfaceOffset = this.boxRegistry['box_normal'].surfaceOffset;

        // Tạo Player đứng chạm đúng mặt hộp
        this.player = this.add.sprite(225, 600 - this.currentBox.surfaceOffset, 'piece'); 
        this.player.setOrigin(0.5, 1); 
        this.player.setScale(this.baseScale); 
        this.player.setDepth(10); 
        this.playerHeight = this.player.height * this.baseScale; 
        
        this.spawnNextBox(); 
        this.updateCameraPosition(0); 

     // 3. KHỔI TẠO HỆ THỐNG HẠT (VFX) - BẢN SỬA ĐỔI TRIỆT ĐỂ BẰNG SỐ THỰC 0.1
        if (this.textures.exists('particle')) {
            this.chargeEmitter = this.add.particles(0, 0, 'particle', {
                lifespan: 400, 
                scale: { start: 0.6, end: 0.1 }, 
                alpha: { start: 0.8, end: 0 },   
               
                // Sinh hạt tương đối bao quanh quân cờ
                x: { min: -80, max: 80 },
                y: { min: -80, max: 80 },

                // --- PHÉP THUẬT SỬA LỖI Ở ĐÂY ---
                // Dùng 0.1 (thay vì 0) để vượt qua bộ lọc Falsy của Phaser,
                // đồng thời ép hạt tụ vào đúng tâm Emitter (tâm quân cờ) theo hệ tọa độ Local
                moveToX: 0.1,
                moveToY: 0.1,
               
                frequency: 45, 
                emitting: false
            }).setDepth(5);
        }

        // Bảng điểm chính
        this.scoreText = this.add.text(225, 120, '0', { 
            fontSize: '80px', 
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#cccccc', 
            alpha: 0.5     
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(20); 

        this.debugText = this.add.text(20, 20, 'Lực: 0', { fill: '#000', fontSize: '20px' }).setScrollFactor(0).setDepth(20);

        this.input.on('pointerdown', this.startCharge, this);
        this.input.on('pointerup', this.executeJump, this);
    }

    update(time, delta) {
        if (this.isCharging) {
            this.chargeTime += delta;
            if (this.chargeTime > this.maxChargeTime) this.chargeTime = this.maxChargeTime;
            
            let ratio = this.chargeTime / this.maxChargeTime;
            
            this.player.scaleY = this.baseScale * (1 - (ratio * 0.3)); 
            this.player.scaleX = this.baseScale * (1 + (ratio * 0.1)); 
            this.currentBox.scaleY = this.baseScale * (1 - (ratio * 0.05));

            if (this.chargeEmitter) {
                let dynamicCenterY = this.player.y - (this.player.displayHeight / 2);
                this.chargeEmitter.setPosition(this.player.x, dynamicCenterY);
            }

            this.debugText.setText(`Lực: ${Math.floor(this.chargeTime)}`);
        }
    }

    startCharge() {
        if (this.player.isJumping) return; 

        this.isCharging = true;
        this.chargeTime = 0;

        // Bật SFX tụ lực
        if (this.chargeSound) this.chargeSound.play();

        // Kích hoạt hạt tụ lực bay lên
          if (this.chargeEmitter) {
            let dynamicCenterY = this.player.y - (this.player.displayHeight / 2);
            this.chargeEmitter.setPosition(this.player.x, dynamicCenterY);
            this.chargeEmitter.start();
        }
    }

    executeJump() {
        if (!this.isCharging) return;
        this.isCharging = false;
        this.player.isJumping = true; 

        // Tắt SFX tụ lực & phát SFX nhảy
        if (this.chargeSound) this.chargeSound.stop();
        this.sound.play('sfx_jump');

        // Tắt hạt tụ lực
        if (this.chargeEmitter) this.chargeEmitter.stop();

        this.tweens.add({ targets: this.player, scaleX: this.baseScale, scaleY: this.baseScale, duration: 100 });
        this.tweens.add({ targets: this.currentBox, scaleY: this.baseScale, duration: 300, ease: 'Elastic.easeOut' });

        let distance = this.chargeTime * 0.5; 
        
        this.player.setOrigin(0.5, 0.5);
        this.player.y -= this.playerHeight / 2;

        let startX = this.player.x;
        let startY = this.player.y;
        
        let angleRad = 30 * (Math.PI / 180); 
        let sign = (this.jumpDirection === 'RIGHT') ? 1 : -1;
        
        let targetX = startX + sign * distance * Math.cos(angleRad);
        let targetY = startY - distance * Math.sin(angleRad);
        
        let peakHeight = distance * 0.5; 

        this.tweens.add({
            targets: this.player,
            angle: this.jumpDirection === 'RIGHT' ? 360 : -360,
            duration: 600,
            ease: 'Linear'
        });

        let dummy = { t: 0 }; 
        this.tweens.add({
            targets: dummy,
            t: 1, 
            duration: 600,
            ease: 'Linear', 
            onUpdate: () => {
                let t = dummy.t; 
                this.player.x = startX + (targetX - startX) * t;
                let currentLineY = startY + (targetY - startY) * t;
                this.player.y = currentLineY - peakHeight * 4 * t * (1 - t);
            },
            onComplete: () => {
                this.player.x = targetX;
                this.player.y = targetY;
                this.checkLanding(targetX, targetY);
            }
        });

        this.debugText.setText('Đang bay...');
    }

    checkLanding(targetX, targetY) {
        this.player.isJumping = false;
        this.player.angle = 0;
        this.player.setOrigin(0.5, 1);
        this.player.y += this.playerHeight / 2; 

        // Lấy thông số hitbox động từ chính khối hộp mục tiêu
        let surfaceOffset = this.nextBox.surfaceOffset;
        let boxRadius = this.nextBox.boxRadius;
        let perfectRadius = this.nextBox.perfectRadius;

        let targetSurfaceY = this.nextBox.y - surfaceOffset; 

        // Cảm biến hít đất dọc 20px
        let sensorLength = 40; 
        if (this.player.y >= targetSurfaceY - sensorLength && this.player.y < targetSurfaceY) {
            this.player.y = targetSurfaceY;
        }

        let dx = this.player.x - this.nextBox.x;
        let dy = (this.player.y - targetSurfaceY) * 2; 
        let distanceToCenter = Math.sqrt(dx*dx + dy*dy); 

        // Sinh hiệu ứng khói tiếp đất chân thực
        this.createDustParticles(this.player.x, this.player.y);

        if (distanceToCenter <= perfectRadius) {
            this.tweens.add({ targets: this.player, scaleY: this.baseScale * 0.85, duration: 50, yoyo: true, repeat: 1, ease: 'Quad.easeIn' });
            
            // TĂNG COMBO VÀ TĂNG CAO ĐỘ SFX PERFECT
            this.comboPerfect++;
            let comboBonus = this.comboPerfect * 2;
            this.score += comboBonus;
            this.scoreText.setText(this.score);

            // detune: Tăng 100 cents (1 bán âm) mỗi lần combo liên tục
            this.sound.play('sfx_perfect', { detune: this.comboPerfect * 100 }); 
            
            this.debugText.setText(`PERFECT COMBO x${this.comboPerfect}! (+${comboBonus})`);
            this.handleSuccessJump();
        } 
        else if (distanceToCenter <= boxRadius) {
            this.tweens.add({ targets: this.player, scaleY: this.baseScale * 0.85, duration: 50, yoyo: true, repeat: 1, ease: 'Quad.easeIn' });
            
            // Đứt chuỗi Combo, phát sfx tiếp đất thường
            this.comboPerfect = 0; 
            this.score += 1;
            this.scoreText.setText(this.score);
            this.sound.play('sfx_land');

            this.debugText.setText('GOOD (+1)');
            this.handleSuccessJump();
        } 
        else {
            this.comboPerfect = 0;
            this.handleGameOver();
        }
    }

   createDustParticles(x, y) {
        if (!this.textures.exists('dust')) return;

        // TĂNG KÍCH THƯỚC, TỐC ĐỘ VÀ SỐ LƯỢNG HẠT BỤI
        this.add.particles(x, y, 'dust', {
            speed: { min: 100, max: 250 },  // Tăng tốc độ khói bắn ra xa dứt khoát hơn (Cũ là 40 - 100)
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },   // Phóng to hạt bụi lên gấp 3 lần bản cũ (Cũ là 0.5)
            alpha: { start: 0.8, end: 0 },
            lifespan: 400,                   // Khói tồn tại lâu hơn một chút (400ms)
            gravityY: 150,                   // Thêm một chút trọng lực rơi nhẹ nhìn cho tự nhiên
            maxParticles: 18                 // Tăng số lượng hạt bụi bắn ra (Cũ là 10)
        });
    }

    handleSuccessJump() {
        this.currentBox = this.nextBox;
        this.spawnNextBox();
        this.updateCameraPosition(500);
    }

    updateCameraPosition(duration) {
        let midX = (this.currentBox.x + this.nextBox.x) / 2;
        let midY = (this.currentBox.y + this.nextBox.y) / 2;

        if (duration === 0) {
            this.cameras.main.scrollX = midX - 225; 
            this.cameras.main.scrollY = midY - 400; 
        } else {
            this.cameras.main.pan(midX, midY, duration, 'Power2');
        }
    }

    handleGameOver() {
        this.debugText.setText('GAME OVER!');
        this.sound.play('sfx_gameover');
        
        let isOvershot = false;
        if (this.jumpDirection === 'RIGHT') {
            isOvershot = this.player.x > this.nextBox.x;
        } else {
            isOvershot = this.player.x < this.nextBox.x;
        }

        let fallAngle = isOvershot ? (this.jumpDirection === 'RIGHT' ? 90 : -90) : (this.jumpDirection === 'RIGHT' ? -90 : 90);
        let fallDistanceX = isOvershot ? (this.jumpDirection === 'RIGHT' ? 30 : -30) : (this.jumpDirection === 'RIGHT' ? -30 : 30);

        this.tweens.add({
            targets: this.player,
            angle: fallAngle,
            x: this.player.x + fallDistanceX,
            y: this.player.y + 300, 
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeIn', 
            onComplete: () => {
                alert(`Game Over! Điểm số của bạn: ${this.score}`);
                this.scene.restart(); 
            }
        });
    }

    spawnNextBox() {
        let angleRad = 30 * (Math.PI / 180);
        let cos30 = Math.cos(angleRad);
        let sin30 = Math.sin(angleRad);

        this.jumpDirection = Math.random() > 0.5 ? 'RIGHT' : 'LEFT';

        let minDistance = 150; 
        let maxDistance = 300; 

        let distance = Phaser.Math.Between(minDistance, maxDistance);
        let sign = (this.jumpDirection === 'RIGHT') ? 1 : -1;
        
        let nextX = this.currentBox.x + sign * distance * cos30;
        let nextY = this.currentBox.y - distance * sin30;
        
        // --- SPAWN RANDOM CÁC KHỐI HỘP KHÁC NHAU ---
        let boxTypes = ['box_normal', 'box_round', 'box_gift'];
        let randomType = boxTypes[Math.floor(Math.random() * boxTypes.length)];

        // Tránh crash game nếu người chơi chưa chuẩn bị đủ ảnh trong BootScene
        if (!this.textures.exists(randomType)) {
            randomType = 'box_normal';
        }

        this.nextBox = this.add.sprite(nextX, nextY, randomType);
        this.nextBox.setOrigin(0.5, 0.5);
        this.nextBox.setScale(this.baseScale); 
        this.platforms.add(this.nextBox);

        // ĐỒNG BỘ HITBOX ĐỘNG CHO HỘP ĐƯỢC SINH RA
        let metadata = this.boxRegistry[randomType];
        this.nextBox.surfaceOffset = metadata.surfaceOffset;
        this.nextBox.boxRadius = metadata.boxRadius;
        this.nextBox.perfectRadius = metadata.perfectRadius;

        this.nextBox.y -= 400; 
        this.nextBox.alpha = 0;
        this.tweens.add({ targets: this.nextBox, y: nextY, alpha: 1, duration: 400, ease: 'Bounce.easeOut' });
    }
}