/**
 * VMO Tactics - Battle Engine
 * Handles Combat Logic, Turn Management, and AI
 */

const Battle = {
    state: {
        phase: 'setup', // 'setup', 'action', 'end'
        turn: 1,
        speed: 1,
        timeoutUsed: false,
        playerGrid: Array(9).fill(null), // 3x3 grid [0-8]
        enemyGrid: Array(9).fill(null),  // 3x3 grid [0-8]
        log: []
    },

    /**
     * バトルの初期化
     * @param {Array} playerParty - プレイヤーのパーティデータ
     * @param {Array} enemyData - エンカウントした敵のデータ
     */
    initBattle: function(playerParty, enemyData) {
        console.log("Battle Initializing...");
        this.state.phase = 'setup';
        this.state.turn = 1;
        this.state.timeoutUsed = false;
        this.state.log = ["戦闘開始！"];
        
        // グリッドのリセット
        this.state.playerGrid.fill(null);
        this.state.enemyGrid.fill(null);

        // プレイヤーユニットの配置
        // 前列: [0,1,2], 中列: [3,4,5], 後列: [6,7,8]
        playerParty.forEach((unit, index) => {
            if (index < 9) {
                // 仕様書に基づき、配置用オブジェクトとして整形
                this.state.playerGrid[index] = {
                    ...unit,
                    isPlayer: true
                };
            }
        });

        // 敵ユニットの生成と配置
        this.setupEnemies(enemyData);

        this.renderBattleField();
        this.updateUI();
    },

    /**
     * 敵のセットアップ
     */
    setupEnemies: function(enemyInfo) {
        enemyInfo.forEach((enemy, index) => {
            if (index < 9) {
                // データベースの基本値からインスタンスを生成
                this.state.enemyGrid[index] = {
                    ...enemy,
                    currentHp: enemy.stats.hp,
                    maxHp: enemy.stats.hp,
                    isEnemy: true,
                    ai_pattern: enemy.ai_pattern || 'aggressive'
                };
            }
        });
    },

    /**
     * バトルフィールド（グリッド）の描画
     */
    renderBattleField: function() {
        const pGridEl = document.getElementById('player-grid');
        const eGridEl = document.getElementById('enemy-grid');
        
        if (!pGridEl || !eGridEl) return;

        pGridEl.innerHTML = '';
        eGridEl.innerHTML = '';

        // プレイヤー側グリッド (3x3)
        this.state.playerGrid.forEach((unit, i) => {
            pGridEl.appendChild(this.createUnitEl(unit, i, 'player'));
        });

        // 敵側グリッド (3x3)
        this.state.enemyGrid.forEach((unit, i) => {
            eGridEl.appendChild(this.createUnitEl(unit, i, 'enemy'));
        });
    },

    /**
     * ユニット要素の生成
     */
    createUnitEl: function(unit, index, side) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = index;

        if (unit) {
            const hpPercent = (unit.currentHp / unit.maxHp) * 100;
            const hpColor = hpPercent > 50 ? 'var(--neon-cyan)' : (hpPercent > 20 ? 'var(--neon-yellow)' : 'var(--neon-red)');
            
            cell.innerHTML = `
                <div class="unit-card ${side}" title="${unit.name}">
                    <img src="${unit.img}" alt="${unit.name}">
                    <div class="hp-bar-container" style="width: 80%; height: 4px; background: #333; margin: 4px auto; border-radius: 2px;">
                        <div class="hp-bar-fill" style="width: ${hpPercent}%; height: 100%; background: ${hpColor}; transition: width 0.3s;"></div>
                    </div>
                </div>
            `;
        }
        return cell;
    },

    /**
     * UI表示の更新（ターン数、ログ）
     */
    updateUI: function() {
        const turnEl = document.getElementById('battle-turn');
        if (turnEl) turnEl.textContent = this.state.turn;

        const logArea = document.getElementById('battle-log');
        if (logArea) {
            logArea.innerHTML = this.state.log.map(msg => `<p style="margin-bottom: 4px;">> ${msg}</p>`).join('');
            logArea.scrollTop = logArea.scrollHeight;
        }
    },

    /**
     * 戦闘速度の設定
     */
    setSpeed: function(speed) {
        this.state.speed = speed;
        Game.toast(`バトル速度を x${speed} に設定しました`);
    },

    /**
     * タイムアウト（介入）機能のトリガー
     */
    triggerTimeout: function() {
        if (this.state.timeoutUsed) {
            Game.toast("タイムアウトは既に消費されています", "error");
            return;
        }

        Game.modal({
            title: "⏸ タイムアウト",
            content: "戦術を再検討しますか？（配置の変更が可能です）",
            actions: [
                { 
                    label: "配置を確定して再開", 
                    class: "btn-primary",
                    onClick: () => {
                        this.state.timeoutUsed = true;
                        Game.closeModal();
                        this.addLog("戦術介入：再展開を完了。");
                        // TODO: バトルループの再開処理
                    }
                },
                { label: "キャンセル", onClick: () => Game.closeModal() }
            ]
        });
    },

    /**
     * ログの追加
     */
    addLog: function(message) {
        this.state.log.push(message);
        if (this.state.log.length > 50) this.state.log.shift(); // ログの肥大化防止
        this.updateUI();
    }
};
