class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // Đổi màu nền cho hợp mắt (Trắng ngà Pastel)
        this.cameras.main.setBackgroundColor('#faf8f5');

      // 1. KHỞI TẠO CÁC BIẾN TRẠNG THÁI
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 2000; 
        
        // --- THÊM BIẾN NÀY ĐỂ QUẢN LÝ KÍCH THƯỚC CHUẨN ---
        this.baseScale = 2; 

        // 2. KHỞI TẠO GAME OBJECTS
        this.platforms = this.add.group();
        
        this.currentBox = this.add.sprite(225, 600, 'box_normal');
        this.currentBox.setOrigin(0.5, 0.5); 
        this.currentBox.setScale(this.baseScale); // Dùng biến thay vì số 2
        this.platforms.add(this.currentBox);

        this.player = this.add.sprite(225, 570, 'piece'); 
        this.player.setOrigin(0.5, 1); 
        this.player.setScale(this.baseScale); // Dùng biến thay vì số 2
        this.player.setDepth(10); 
        this.playerHeight = this.player.height * this.baseScale; 
        
        // BIẾN QUẢN LÝ ĐIỂM
        this.score = 0;

        // BẢNG ĐIỂM CHÍNH (To, mờ nhẹ ở background, cố định trên màn hình)
        this.scoreText = this.add.text(225, 120, '0', { 
            fontSize: '80px', 
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: '#cccccc', // Màu xám nhạt cho đỡ chói
            alpha: 0.5     // Hơi trong suốt để không che đồ họa
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(20); // setDepth(20) để luôn nổi lên trên cùng

        this.debugText = this.add.text(20, 20, 'Lực: 0', { fill: '#000', fontSize: '20px' }).setScrollFactor(0).setDepth(20);

        // Sinh hộp đầu tiên (hệ thống thông minh sẽ tự tính hướng)
        this.spawnNextBox(); 
        this.updateCameraPosition(0); 

        // 3. ĐĂNG KÝ SỰ KIỆN INPUT
        this.input.on('pointerdown', this.startCharge, this);
        this.input.on('pointerup', this.executeJump, this);
    }

   update(time, delta) {
        if (this.isCharging) {
            this.chargeTime += delta;
            if (this.chargeTime > this.maxChargeTime) this.chargeTime = this.maxChargeTime;
            
            let ratio = this.chargeTime / this.maxChargeTime;
            
            // Lấy baseScale làm mốc để nhân/chia, không bao giờ bị lệch kích thước nữa
            this.player.scaleY = this.baseScale * (1 - (ratio * 0.3)); 
            this.player.scaleX = this.baseScale * (1 + (ratio * 0.1)); 
            this.currentBox.scaleY = this.baseScale * (1 - (ratio * 0.05));

            this.debugText.setText(`Lực: ${Math.floor(this.chargeTime)}`);
        }
    }

    startCharge() {
        // Nếu đang nhảy lơ lửng thì cấm bấm
        if (this.player.isJumping) return; 

        this.isCharging = true;
        this.chargeTime = 0;
        
        // (Giai đoạn sau ta sẽ cho phát âm thanh tiếng lò xo nén ở đây)
    }

    executeJump() {
        if (!this.isCharging) return;
        this.isCharging = false;
        this.player.isJumping = true; 

        // Trả về kích thước baseScale thay vì số 1
        this.tweens.add({ targets: this.player, scaleX: this.baseScale, scaleY: this.baseScale, duration: 100 });
        this.tweens.add({ targets: this.currentBox, scaleY: this.baseScale, duration: 300, ease: 'Elastic.easeOut' });

        // 2. Tính toán điểm rơi dựa vào lực
        let distance = this.chargeTime * 0.5; 
        
        // Fix tâm xoay: Đưa tâm về giữa để lộn vòng 360 độ cho đẹp
        this.player.setOrigin(0.5, 0.5);
        this.player.y -= this.playerHeight / 2;

        let startX = this.player.x;
        let startY = this.player.y;
        
        // Tính góc 30 độ sang Radian
        let angleRad = 30 * (Math.PI / 180); 
        let sign = (this.jumpDirection === 'RIGHT') ? 1 : -1;
        
        let targetX = startX + sign * distance * Math.cos(angleRad);
        let targetY = startY - distance * Math.sin(angleRad);
        
        let peakHeight = distance * 0.5; 

        // 3. Hoạt ảnh xoay lộn vòng (Bottle Flip)
        this.tweens.add({
            targets: this.player,
            angle: this.jumpDirection === 'RIGHT' ? 360 : -360,
            duration: 600,
            ease: 'Linear'
        });

        // 4. Tween Parabol chạy quỹ đạo bay
        let dummy = { t: 0 }; 
        this.tweens.add({
            targets: dummy,
            t: 1, 
            duration: 600,
            ease: 'Quad.easeOut', 
            onUpdate: () => {
                let t = dummy.t; 
                this.player.x = startX + (targetX - startX) * t;
                let currentLineY = startY + (targetY - startY) * t;
                this.player.y = currentLineY - peakHeight * 4 * t * (1 - t);
            },
            onComplete: () => {
                // --- CHÌA KHÓA NẰM Ở ĐÂY ---
                // Cưỡng chế gắn tọa độ về chính xác điểm đích toán học 
                // để bù trừ cho sai số thất thoát Frame của hàm onUpdate
                this.player.x = targetX;
                this.player.y = targetY;

                // Bây giờ tính va chạm mới chuẩn 100%
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

        this.tweens.add({ targets: this.player, scaleY: this.baseScale * 0.85, duration: 50, yoyo: true, repeat: 1, ease: 'Quad.easeIn' });

        let surfaceOffset = 28; 
        let targetSurfaceY = this.nextBox.y - surfaceOffset; 

        let dx = this.player.x - this.nextBox.x;
        let dy = (this.player.y - targetSurfaceY) * 2; 
        
        let distanceToCenter = Math.sqrt(dx*dx + dy*dy); 
        
        let boxRadius = 54;  
        let perfectRadius = 16; 

        if (distanceToCenter <= perfectRadius) {
            // CỘNG 2 ĐIỂM VÀ UPDATE UI CHÍNH
            this.score += 2;
            this.scoreText.setText(this.score);
            this.debugText.setText('PERFECT! (+2)');
            this.handleSuccessJump();
        } 
        else if (distanceToCenter <= boxRadius) {
            // CỘNG 1 ĐIỂM VÀ UPDATE UI CHÍNH
            this.score += 1;
            this.scoreText.setText(this.score);
            this.debugText.setText('GOOD (+1)');
            this.handleSuccessJump();
        } 
        else {
            this.handleGameOver();
        }
    }

    handleSuccessJump() {
        this.currentBox = this.nextBox;
        
        // (Đã xóa dòng đổi hướng jumpDirection ở đây vì spawnNextBox sẽ tự quyết định)
        
        this.spawnNextBox();
        this.updateCameraPosition(500);
    }

    updateCameraPosition(duration) {
        // TÍNH TỌA ĐỘ TRUNG ĐIỂM CỦA 2 KHỐI HỘP
        let midX = (this.currentBox.x + this.nextBox.x) / 2;
        let midY = (this.currentBox.y + this.nextBox.y) / 2;

        if (duration === 0) {
            // Set ngay lập tức (dùng cho lúc mới vào game)
            this.cameras.main.scrollX = midX - 225; // 225 là nửa chiều rộng màn hình
            this.cameras.main.scrollY = midY - 400; // 400 là nửa chiều cao màn hình
        } else {
            // Pan mượt mà (dùng cho lúc nhảy xong)
            this.cameras.main.pan(midX, midY, duration, 'Power2');
        }
    }

    handleGameOver() {
        this.debugText.setText('GAME OVER!');
        
        // Hiệu ứng rớt vực
        this.tweens.add({
            targets: this.player,
            y: this.player.y + 200, // Rớt sâu xuống dưới
            alpha: 0,
            duration: 500,
            onComplete: () => {
                // Tạm thời dùng alert, sau này ta làm UI đẹp hơn
                alert("Game Over! Nhấn OK để chơi lại.");
                this.scene.restart(); // Chơi lại từ đầu
            }
        });
    }

   spawnNextBox() {
        let angleRad = 30 * (Math.PI / 180);
        let cos30 = Math.cos(angleRad);
        let sin30 = Math.sin(angleRad);

        // 1. RANDOM HƯỚNG NHẢY (50% Phải, 50% Trái)
        this.jumpDirection = Math.random() > 0.5 ? 'RIGHT' : 'LEFT';

        // 2. THUẬT TOÁN CHỐNG KẸT GÓC (SMART SPAWN)
        let minDistance = 150; // Nhảy gần nhất cũng phải 150px
        let maxTheoreticalDistance = 400; // Giới hạn lực tối đa không cho nhảy xa quá 400px

        // Tính lề an toàn: Hộp rộng 128px (tâm là 64). Cộng thêm 10px viền = 75px an toàn.
        let safeMargin = 75; 
        let safeMinX = safeMargin;             // Lề trái màn hình
        let safeMaxX = 450 - safeMargin;       // Lề phải màn hình (Chiều rộng màn hình là 450)

        let maxAvailableDistance = 0;

        if (this.jumpDirection === 'RIGHT') {
            maxAvailableDistance = (safeMaxX - this.currentBox.x) / cos30;
            // Nếu không đủ khoảng trống bên Phải, ÉP QUAY ĐẦU SANG TRÁI
            if (maxAvailableDistance < minDistance) {
                this.jumpDirection = 'LEFT';
                maxAvailableDistance = (this.currentBox.x - safeMinX) / cos30;
            }
        } else {
            maxAvailableDistance = (this.currentBox.x - safeMinX) / cos30;
            // Nếu không đủ khoảng trống bên Trái, ÉP QUAY ĐẦU SANG PHẢI
            if (maxAvailableDistance < minDistance) {
                this.jumpDirection = 'RIGHT';
                maxAvailableDistance = (safeMaxX - this.currentBox.x) / cos30;
            }
        }

        // Chốt lại khoảng cách max thực tế
        let finalMaxDistance = Math.min(maxTheoreticalDistance, maxAvailableDistance);

        // 3. RANDOM KHOẢNG CÁCH TRONG VÙNG AN TOÀN
        let distance = Phaser.Math.Between(minDistance, finalMaxDistance);
        let sign = (this.jumpDirection === 'RIGHT') ? 1 : -1;
        
        let nextX = this.currentBox.x + sign * distance * cos30;
        let nextY = this.currentBox.y - distance * sin30;
        
        this.nextBox = this.add.sprite(nextX, nextY, 'box_normal');
        this.nextBox.setOrigin(0.5, 0.5);
        this.nextBox.setScale(this.baseScale); 
        this.platforms.add(this.nextBox);

        this.nextBox.y -= 400; 
        this.nextBox.alpha = 0;
        this.tweens.add({ targets: this.nextBox, y: nextY, alpha: 1, duration: 400, ease: 'Bounce.easeOut' });
    }

}