class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#faf8f5');

        // 1. KHỞI TẠO CÁC BIẾN TRẠNG THÁI
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 1000;
        this.chargeDirection = 1;
        this.baseScale = 2;
        this.score = 0;
        this.comboPerfect = 0; // Đếm chuỗi combo Perfect liên tục

        // --- ĐĂNG KÝ DANH SÁCH HỘP VÀ HITBOX RIÊNG BIỆT ---
        this.boxRegistry = {
            'box_normal': { surfaceOffset: 28, boxRadius: 64, perfectRadius: 16 },
            'box_round':  { surfaceOffset: 22, boxRadius: 50, perfectRadius: 12 },
            'box_gift':   { surfaceOffset: 33, boxRadius: 70, perfectRadius: 18 }
        };

        this.gaugeGraphics = this.add.graphics().setDepth(30).setScrollFactor(0);
        this.gaugeGraphics.setVisible(false); 

        // 2. KHỞI TẠO GAME OBJECTS & AUDIO
        this.platforms = this.add.group();
       
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

        // 3. KHỞI TẠO HỆ THỐNG HẠT (VFX)
        if (this.textures.exists('particle')) {
            this.chargeEmitter = this.add.particles(0, 0, 'particle', {
                lifespan: 400,
                scale: { start: 0.6, end: 0.1 },
                alpha: { start: 0.8, end: 0 },  
               
                x: { min: -80, max: 80 },
                y: { min: -80, max: 80 },

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
            this.chargeTime += delta * this.chargeDirection;
           
            if (this.chargeTime >= this.maxChargeTime) {
                this.chargeTime = this.maxChargeTime;
                this.chargeDirection = -1;
            }
            else if (this.chargeTime <= 0) {
                this.chargeTime = 0;
                this.chargeDirection = 1;
            }
           
            let ratio = this.chargeTime / this.maxChargeTime;
           
            this.player.scaleY = this.baseScale * (1 - (ratio * 0.3));
            this.player.scaleX = this.baseScale * (1 + (ratio * 0.1));
            this.currentBox.scaleY = this.baseScale * (1 - (ratio * 0.05));

            this.drawPowerGauge(ratio);

            if (this.chargeEmitter) {
                let dynamicCenterY = this.player.y - (this.player.displayHeight / 2);
                this.chargeEmitter.setPosition(this.player.x, dynamicCenterY);
            }

            this.debugText.setText(`Lực: ${Math.floor(this.chargeTime)}`);
        }
    }

    drawPowerGauge(ratio) {
        this.gaugeGraphics.clear();
        this.gaugeGraphics.setVisible(true);

        let x = 25;  
        let y = 250; 
        let w = 15;  
        let h = 300; 

        this.gaugeGraphics.fillStyle(0xdddddd, 0.5);
        this.gaugeGraphics.fillRect(x, y, w, h);
        this.gaugeGraphics.lineStyle(2, 0x555555, 1);
        this.gaugeGraphics.strokeRect(x, y, w, h);

        let fillHeight = h * ratio;
        this.gaugeGraphics.fillStyle(0xff5722, 1);
        this.gaugeGraphics.fillRect(x, y + h - fillHeight, w, fillHeight);
    }

    startCharge() {
        if (this.player.isJumping) return;

        this.isCharging = true;
        this.chargeTime = 0;
        this.chargeDirection = 1; // Luôn reset hướng tăng lực từ đầu khi click mới

        if (this.chargeSound) this.chargeSound.play();

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

        this.gaugeGraphics.setVisible(false);

        if (this.chargeSound) this.chargeSound.stop();
        this.sound.play('sfx_jump');

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

        // --- ĐÃ FIX: TRUY XUẤT THÔNG SỐ ĐỘNG TỪ NEXTBOX ---
        let surfaceOffset = this.nextBox.surfaceOffset;
        let boxRadius = this.nextBox.boxRadius;
        let perfectRadius = this.nextBox.perfectRadius;

        let targetSurfaceY = this.nextBox.y - surfaceOffset;

        // --- CẢM BIẾN DỌC CHẠM ĐẤT 20PX ---
        let sensorLength = 40;
        if (this.player.y >= targetSurfaceY - sensorLength && this.player.y < targetSurfaceY) {
            this.player.y = targetSurfaceY;
        }

        // --- TÍNH VA CHẠM GOOD (Tâm mặc định) ---
        let dxGood = this.player.x - this.nextBox.x;
        let dyGood = (this.player.y - targetSurfaceY) * 2;
        let distanceToGood = Math.sqrt(dxGood*dxGood + dyGood*dyGood);

        // --- TÍNH VA CHẠM PERFECT (Hạ thấp tâm xuống 10px theo trục Y của màn hình) ---
        let perfectSurfaceY = targetSurfaceY + 5; // +10px dọc
        let dxPerfect = this.player.x - this.nextBox.x;
        let dyPerfect = (this.player.y - perfectSurfaceY) * 2;
        let distanceToPerfect = Math.sqrt(dxPerfect*dxPerfect + dyPerfect*dyPerfect);

        // Gọi hàm vẽ Debug (Đã cập nhật để truyền thông số động)
       // this.drawDebugHitbox(targetSurfaceY, perfectSurfaceY, boxRadius + 15, perfectRadius);
        this.createDustParticles(this.player.x, this.player.y);

        // 1. Kiểm tra Perfect trước (với tâm đã hạ thấp)
        if (distanceToPerfect <= perfectRadius) {
            this.tweens.add({ targets: this.player, scaleY: this.baseScale * 0.85, duration: 50, yoyo: true, repeat: 1, ease: 'Quad.easeIn' });
            
            this.comboPerfect++;
            let comboBonus = this.comboPerfect * 2;
            this.score += comboBonus;
            
            this.scoreText.setText(this.score);
            this.sound.play('sfx_perfect', { detune: this.comboPerfect * 100 });
            this.debugText.setText(`PERFECT COMBO x${this.comboPerfect}! (+${comboBonus})`);
            this.handleSuccessJump();
        }
        // 2. Kiểm tra Good sau (với tâm mặc định và có độ khoan dung +15px)
        else if (distanceToGood <= (boxRadius + 15)) {
            this.tweens.add({ targets: this.player, scaleY: this.baseScale * 0.85, duration: 50, yoyo: true, repeat: 1, ease: 'Quad.easeIn' });
            
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

        this.add.particles(x, y, 'dust', {
            speed: { min: 100, max: 250 },  
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },   
            alpha: { start: 0.8, end: 0 },
            lifespan: 400,                   
            gravityY: 150,                   
            maxParticles: 18                 
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
       
        let boxTypes = ['box_normal', 'box_round', 'box_gift'];
        let randomType = boxTypes[Math.floor(Math.random() * boxTypes.length)];

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

    // drawDebugHitbox(targetSurfaceY, perfectSurfaceY, forgivingRadius, perfectRadius) {
    //     if (!this.debugGraphics) {
    //         this.debugGraphics = this.add.graphics().setDepth(100);
    //     }
    //     this.debugGraphics.clear();

    //     // Vòng XANH LÁ: Giới hạn an toàn thường (tâm mặc định)
    //     this.debugGraphics.lineStyle(2, 0x00ff00, 1);
    //     this.debugGraphics.strokeEllipse(this.nextBox.x, targetSurfaceY, forgivingRadius * 2, forgivingRadius);

    //     // Vòng ĐỎ TƯƠI: Vùng Perfect (tâm hạ thấp xuống 10px)
    //     this.debugGraphics.lineStyle(2, 0xff0000, 1);
    //     this.debugGraphics.strokeEllipse(this.nextBox.x, perfectSurfaceY, perfectRadius * 2, perfectRadius);

    //     // Chấm XANH DƯƠNG: Điểm Gót Chân của Player
    //     this.debugGraphics.fillStyle(0x0000ff, 1);
    //     this.debugGraphics.fillCircle(this.player.x, this.player.y, 4);
    // }
}