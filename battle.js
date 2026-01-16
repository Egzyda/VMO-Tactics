/**
 * VMO Tactics - Battle Engine
 * Handles Combat Logic, Turn Management, and AI
 */

const Battle = {
    state: {
        phase: 'setup', // 'setup', 'action', 'end'
        turn: 1,
        speed: 1,
        isPaused: false,
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
    initBattle: function (playerParty, enemyData) {
        console.log("Battle Initializing...");
        this.state.phase = 'placement'; // 配置フェーズ
        this.state.turn = 1;
        this.state.speed = 1;
        this.state.isPaused = false;
        this.state.timeoutUsed = false;
        this.state.log = ["配置を決めてください..."];

        this.state.playerGrid.fill(null);
        this.state.enemyGrid.fill(null);

        // 敵は自動配置
        this.setupEnemies(enemyData);

        // プレイヤーユニットは予備リスト(仮)または自動で手前に詰める
        // 今回はとりあえず自動で詰めておいて、後で入れ替えられる形式にする
        playerParty.forEach((unit, index) => {
            if (index < 9) {
                this.state.playerGrid[index] = { ...unit, isPlayer: true, gridIndex: index };
            }
        });

        // 選択中のユニット（配置入れ替え用）
        this.state.selectedUnitIndex = null;

        this.renderBattleField();
        this.updateUI();

        // 自動開始はしない
    },

    /**
     * 配置完了・戦闘開始
     */
    startBattleAction: function () {
        if (this.state.phase !== 'placement') return;
        this.state.phase = 'action';
        this.addLog("戦闘開始！");
        this.renderBattleField(); // ハイライト消去用
        this.executeTurn();
    },

    /**
     * グリッドセルクリック時の処理
     */
    handleCellClick: function (index, side) {
        // 配置フェーズ: プレイヤー側の入れ替え処理
        if (this.state.phase === 'placement' && side === 'player') {
            // 選択解除
            if (this.state.selectedUnitIndex === index) {
                this.state.selectedUnitIndex = null;
                this.renderBattleField();
                return;
            }

            // ... (入れ替えロジック) ...
            if (this.state.selectedUnitIndex !== null) {
                const fromIdx = this.state.selectedUnitIndex;
                const toIdx = index;

                const temp = this.state.playerGrid[fromIdx];
                this.state.playerGrid[fromIdx] = this.state.playerGrid[toIdx];
                if (this.state.playerGrid[fromIdx]) this.state.playerGrid[fromIdx].gridIndex = fromIdx;

                this.state.playerGrid[toIdx] = temp;
                if (this.state.playerGrid[toIdx]) this.state.playerGrid[toIdx].gridIndex = toIdx;

                this.state.selectedUnitIndex = null;
                this.renderBattleField();
            } else {
                if (this.state.playerGrid[index]) {
                    this.state.selectedUnitIndex = index;
                    this.renderBattleField();
                }
            }
            return;
        }

        // 戦闘フェーズなど: 詳細表示
        const grid = side === 'player' ? this.state.playerGrid : this.state.enemyGrid;
        const unit = grid[index];
        if (unit) {
            this.showUnitDetails(unit);
        }
    },

    /**
     * ユニット詳細モーダルの表示
     */
    showUnitDetails: function (unit) {
        const movesList = (unit.skills || []).map(s => `<li>${s.name} <span style="font-size:0.8em; color:#aaa;">(Pow:${s.power || 0})</span></li>`).join('');

        Game.modal({
            title: unit.name,
            content: `
                <div style="display:flex; gap:15px; align-items:flex-start;">
                    <img src="${unit.img}" style="width:80px; height:80px; object-fit:contain; border:1px solid #444; background:#000;">
                    <div>
                        <p><strong>Type:</strong> ${unit.type} / HP: ${unit.currentHp}/${unit.maxHp}</p>
                        <p><strong>ATK:</strong> ${unit.stats.atk}  <strong>DEF:</strong> ${unit.stats.def}</p>
                        <p><strong>SPD:</strong> ${unit.stats.spd}</p>
                    </div>
                </div>
                <hr style="border-color:#444; margin:10px 0;">
                <div style="text-align:left;">
                    <strong>Moves:</strong>
                    <ul style="padding-left:20px; margin:5px 0;">${movesList || '<li>None</li>'}</ul>
                </div>
            `,
            actions: [
                {
                    label: "戦術設定 (Tactics)",
                    class: "btn-warning",
                    onClick: () => {
                        // モーダルを閉じて戦術モーダルを開く (Game.modalは上書きになるので直接呼ぶ)
                        UI.showTacticsModal(unit, (newBehavior) => {
                            unit.behavior = newBehavior;
                        });
                    }
                },
                { label: "閉じる", onClick: () => Game.closeModal() }
            ]
        });
    },

    /**
     * 敵のセットアップ
     */
    setupEnemies: function (enemyInfo) {
        enemyInfo.forEach((enemy, index) => {
            if (index < 9) {
                // スキルの初期化 (moves文字列配列 -> skillオブジェクト配列)
                const skills = [];
                if (enemy.moves && enemy.moves.length > 0) {
                    enemy.moves.forEach(moveName => {
                        if (window.dbMoves[moveName]) {
                            skills.push({
                                ...window.dbMoves[moveName],
                                id: moveName,
                                name: moveName // 名前を明示的に付与
                            });
                        }
                    });
                }

                this.state.enemyGrid[index] = {
                    ...enemy,
                    currentHp: enemy.stats.hp,
                    maxHp: enemy.stats.hp,
                    isEnemy: true,
                    gridIndex: index,
                    ai_pattern: enemy.ai_pattern || 'aggressive',
                    skills: skills // 生成したスキルをセット
                };
            }
        });
    },

    /**
     * 1ターンの実行
     */
    executeTurn: async function () {
        if (this.state.phase !== 'action') return;

        // ターン開始演出
        await this.displayTurnOverlay(`TURN ${this.state.turn}`);

        this.addLog(`--- Turn ${this.state.turn} ---`);
        this.updateUI();

        // 1. 行動順序決定 (SPD順)
        const allUnits = [
            ...this.state.playerGrid.filter(u => u && u.currentHp > 0),
            ...this.state.enemyGrid.filter(u => u && u.currentHp > 0)
        ].sort((a, b) => (b.stats.spd || 0) - (a.stats.spd || 0));

        // 2. 順番に行動
        for (const unit of allUnits) {
            // 戦闘終了チェック
            if (this.checkBattleEnd()) return;

            // 死亡チェック（ターン中に倒された場合）
            if (unit.currentHp <= 0) continue;

            // 行動決定
            const action = this.decideAction(unit);

            if (action) {
                await this.processAction(unit, action);
            }

            // Wait based on speed (handle pause)
            await this.waitBasedOnSpeed();
        }

        // 3. ターン終了処理
        this.state.turn++;

        // 次のターンへ
        if (!this.checkBattleEnd()) {
            // Wait slightly before next turn, but also respect pause
            await this.waitBasedOnSpeed(500);
            this.executeTurn();
        }
    },

    /**
     * 速度設定に基づいたウェイト（0=ポーズ対応）
     */
    /**
     * 速度設定に基づいたウェイト（0=ポーズ対応, isPaused対応）
     */
    waitBasedOnSpeed: async function (baseDelay = 1000) {
        // ポーズ中は待機
        while (this.state.speed === 0 || this.state.isPaused) {
            await new Promise(r => setTimeout(r, 100));
        }

        // 速度に応じたウェイト
        const delay = baseDelay / this.state.speed;
        await new Promise(r => setTimeout(r, delay));
    },
    /**
     * 行動決定ロジック
     */
    /**
     * 行動決定ロジック
     */
    decideAction: function (unit) {
        // ターゲット候補の取得（相手陣営の生存ユニット）
        const targetGrid = unit.isPlayer ? this.state.enemyGrid : this.state.playerGrid;
        let potentialTargets = targetGrid.filter(t => t && t.currentHp > 0);

        if (potentialTargets.length === 0) return null;

        // --- 戦術 (Behavior) に基づくターゲット選択 ---
        // デフォルト設定
        const behavior = unit.behavior || { priority: 'random', condition: 'always' };

        // 優先度 (priority) に従ってソート
        switch (behavior.priority) {
            case 'lowest_hp':
                potentialTargets.sort((a, b) => a.currentHp - b.currentHp);
                break;
            case 'highest_at': // highest_atk
                potentialTargets.sort((a, b) => b.stats.atk - a.stats.atk);
                break;
            case 'nearest':
                // indexが小さい方が「前列」に近いと仮定 (0,1,2 = 前列)
                // 実際の距離計算はグリッド位置によるが、簡易的にindex順
                potentialTargets.sort((a, b) => {
                    // 自分の列と同じ列の敵を優先するなど高度な判定も可能だが今回は簡易実装
                    return a.gridIndex - b.gridIndex;
                });
                break;
            case 'random':
            default:
                // シャッフル
                potentialTargets.sort(() => Math.random() - 0.5);
                break;
        }

        const target = potentialTargets[0];

        // --- スキル選択 ---
        let skill = null;
        if (unit.skills && unit.skills.length > 0) {
            // ここに condition (hp_below_50 など) の判定を入れる
            // 現在は簡易的に常にスキル1を使用
            skill = unit.skills[0];
        } else {
            skill = { name: "通常攻撃", power: 10, range: 1, target: "single", type: "normal" };
        }

        return { skill, target };
    },

    /**
     * 行動の実行
     */
    processAction: async function (attacker, action) {
        const { skill, target } = action;

        // ログ出力（早めに出すか、アニメーション後に出すかは好みだが、行動開始時はこれで）
        this.addLog(`${attacker.name} の ${skill.name}！`);
        this.updateUI();

        // 1. 攻撃者アクション
        // 攻撃モーションとスキルエフェクト
        this.highlightUnit(attacker, 'attacking');

        // エフェクト種別判定
        let effectType = 'slash';
        if (skill.type === 'fire') effectType = 'magic'; // 簡易判定
        if (skill.type === 'light') effectType = 'magic';

        // 攻撃アニメーション待機
        await new Promise(r => setTimeout(r, 600 / this.state.speed));

        // ターゲットへエフェクト発生
        const targetEl = document.getElementById(`unit-${target.isPlayer ? 'player' : 'enemy'}-${target.gridIndex}`);
        if (targetEl && Effects && Effects.playAttackEffect) { // Check if Effects and playAttackEffect exist
            await Effects.playAttackEffect(targetEl, effectType);
        }

        // 2. ダメージ計算と適用
        const result = Mechanics.calculateDamage(attacker, target, skill);
        target.currentHp = Math.max(0, target.currentHp - result.damage);

        // 3. 被弾リアクション
        this.clearHighlights();
        if (targetEl) {
            if (Effects && Effects.showDamagePopup) { // Check if Effects and showDamagePopup exist
                Effects.showDamagePopup(targetEl, result.damage, result.isCritical);
            }
            if (Effects && Effects.playHitEffect) { // Check if Effects and playHitEffect exist
                await Effects.playHitEffect(targetEl);
            }
        }

        // 結果ログ
        let msg = `${target.name} に ${result.damage} ダメージ！`;
        if (result.typeModifier > 1.0) msg += " (弱点!)";
        if (result.typeModifier < 1.0) msg += " (抵抗)";
        this.addLog(msg);

        // 4. 死亡判定と演出
        if (target.currentHp <= 0) {
            this.addLog(`${target.name} は倒れた！`);
            if (targetEl && Effects && Effects.playDeathEffect) { // Check if Effects and playDeathEffect exist
                await Effects.playDeathEffect(targetEl);
            }
        }

        // UI更新
        this.renderBattleField();
        this.updateUI();

        // 行動完了後のウェイト
        await new Promise(r => setTimeout(r, 800 / this.state.speed));
    },

    /**
     * バトル終了判定
     */
    checkBattleEnd: function () {
        const playerAlive = this.state.playerGrid.some(u => u && u.currentHp > 0);
        const enemyAlive = this.state.enemyGrid.some(u => u && u.currentHp > 0);

        if (!playerAlive) {
            this.endBattle("defeat");
            return true;
        }
        if (!enemyAlive) {
            this.endBattle("victory");
            return true;
        }
        return false;
    },

    /**
     * バトル終了処理
     */
    endBattle: function (result) {
        this.state.phase = 'end';

        // HPの状態をメインデータに同期
        this.syncPartyState();

        if (result === 'victory') {
            // 報酬計算
            const goldReward = 50 + Math.floor(Math.random() * 30);
            const expReward = 50 + Math.floor(Math.random() * 20);

            // 報酬適用
            Game.state.player.gold += goldReward;

            let levelUpMsg = "";
            Game.state.player.party.forEach(m => {
                if (m.currentHp > 0) { // 生存者のみEXP獲得
                    m.exp = (m.exp || 0) + expReward;
                    // Check Level Up
                    const nextLevelExp = m.level * 100;
                    if (m.exp >= nextLevelExp) {
                        m.level++;
                        m.exp -= nextLevelExp;
                        m.maxHp += 10;
                        m.stats.atk += 2;
                        m.stats.def += 1;
                        m.currentHp = m.maxHp;
                        levelUpMsg = `\n${m.name} がレベルアップ! (Lv.${m.level})`;
                    }
                }
            });

            // ドロップ/スカウト判定 (30%)
            let scoutMsg = "";
            let newMonster = null;
            if (Math.random() < 0.3) {
                // 倒した敵の中からランダムに1体
                const recruitable = this.state.enemyGrid.filter(e => e && e.isEnemy);
                if (recruitable.length > 0) {
                    const target = recruitable[Math.floor(Math.random() * recruitable.length)];
                    // 新規インスタンス生成
                    newMonster = Game.createMonsterInstance(target.id, 1);
                    if (newMonster) {
                        if (Game.state.player.party.length < Game.state.player.maxPartySize) {
                            Game.state.player.party.push(newMonster);
                            scoutMsg = `\n\n敵の ${newMonster.name} が起き上がり、仲間になりたそうに見ている！\n(パーティに加入しました)`;
                        } else {
                            Game.state.player.box.push(newMonster);
                            scoutMsg = `\n\n敵の ${newMonster.name} が起き上がり、仲間になりたそうに見ている！\n(Boxに送られました)`;
                        }
                    }
                }
            }

            Game.modal({
                title: "VICTORY!",
                content: `
                    <div style="text-align:center;">
                        <h2 style="color:var(--element-victory);">WIN!</h2>
                        <p>敵を撃破しました！</p>
                        <hr style="border-color:#444; margin:10px 0;">
                        <ul style="list-style:none; padding:0; text-align:left; display:inline-block;">
                            <li>💰 ゴールド: +${goldReward}</li>
                            <li>📖 経験値: +${expReward}</li>
                        </ul>
                        <p style="color:var(--neon-green); font-size:0.9em;">${levelUpMsg}</p>
                        <p style="color:var(--neon-yellow); font-weight:bold;">${scoutMsg}</p>
                    </div>
                `,
                actions: [{
                    label: "次へ進む",
                    class: "btn-primary",
                    onClick: () => {
                        Game.closeModal();
                        Game.switchScreen('screen-map');
                        UI.updatePartyView(Game.state.player);
                        MapSystem.render();
                    }
                }]
            });
        } else {
            Game.modal({
                title: "DEFEAT...",
                content: "パーティは全滅しました...",
                actions: [{
                    label: "タイトルへ",
                    onClick: () => {
                        Game.closeModal();
                        Game.switchScreen('screen-title');
                    }
                }]
            });
        }
    },

    /**
     * バトル終了時にHPをメインデータに反映
     */
    syncPartyState: function () {
        this.state.playerGrid.forEach(battleUnit => {
            if (battleUnit && battleUnit.isPlayer) {
                const original = Game.state.player.party.find(p => p.uid === battleUnit.uid);
                if (original) {
                    original.currentHp = battleUnit.currentHp;
                }
            }
        });
    },

    /**
     * バトルフィールド（グリッド）の描画
     */
    renderBattleField: function () {
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
    createUnitEl: function (unit, index, side) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = index;

        // クリックイベント (配置用)
        cell.onclick = () => this.handleCellClick(index, side);

        if (unit && unit.currentHp > 0) {
            const hpPercent = (unit.currentHp / unit.maxHp) * 100;
            const hpColor = hpPercent > 50 ? 'var(--neon-cyan)' : (hpPercent > 20 ? 'var(--neon-yellow)' : 'var(--neon-red)');

            // 選択中ハイライト
            const isSelected = (side === 'player' && this.state.selectedUnitIndex === index);
            const extraClass = isSelected ? 'selected' : '';

            cell.innerHTML = `
                <div class="unit-card ${side} ${extraClass}" id="unit-${side}-${index}">
                    <div class="name-badge">${unit.name}</div>
                    <div class="unit-visual">
                        <img src="${unit.img}" alt="${unit.name}">
                    </div>
                    <div class="status-footer">
                        <div class="hp-bar-container">
                            <div class="hp-bar-fill" style="width: ${hpPercent}%; background: ${hpColor};"></div>
                        </div>
                        <div class="hp-text">${unit.currentHp}/${unit.maxHp}</div>
                    </div>
                </div>
            `;
        } else if (side === 'player' && this.state.phase === 'placement') {
            // 空きセルもクリックできるようにする（移動先として）
            cell.classList.add('placement-target');
        }
        return cell;
    },

    highlightUnit: function (unit, type) {
        const side = unit.isPlayer ? 'player' : 'enemy';
        const el = document.getElementById(`unit-${side}-${unit.gridIndex}`);
        if (el) el.classList.add(type);
    },

    clearHighlights: function () {
        document.querySelectorAll('.unit-card').forEach(el => {
            el.classList.remove('attacking', 'targeted');
        });
    },

    /**
     * ターン開始のカットイン表示
     */
    displayTurnOverlay: function (text) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.id = 'turn-overlay';
            overlay.textContent = text;

            // battle-fieldに追加
            const field = document.querySelector('.battle-field');
            if (field) field.appendChild(overlay);
            else document.body.appendChild(overlay);

            // アニメーション終了待ち (1.5s)
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 1500 / this.state.speed); // 速度設定の影響を受ける
        });
    },

    /**
     * UI表示の更新（ターン数、ログ）
     */
    updateUI: function () {
        const turnEl = document.getElementById('battle-turn');
        if (turnEl) turnEl.textContent = this.state.turn;

        const logArea = document.getElementById('battle-log');
        if (logArea) {
            logArea.innerHTML = this.state.log.map(msg => `<p style="margin-bottom: 4px;">> ${msg}</p>`).join('');
            logArea.scrollTop = logArea.scrollHeight;
        }

        // 戦闘開始ボタンの表示制御
        const startBtn = document.getElementById('btn-start-battle');
        if (startBtn) {
            // 中央表示のためのスタイル
            startBtn.style.display = (this.state.phase === 'placement') ? 'block' : 'none';
            startBtn.style.margin = '0 auto';
        }
    },

    /**
     * 戦闘速度の設定
     */
    setSpeed: function (speed) {
        this.state.speed = speed;

        // ボタンの見た目更新
        [1, 2, 3].forEach(s => {
            const btn = document.getElementById(`btn-speed-${s}`);
            if (btn) {
                if (s === speed) btn.classList.add('selected');
                else btn.classList.remove('selected');
            }
        });
    },

    /**
     * タイムアウト（介入）機能のトリガー
     */
    /**
     * タイムアウト（介入）機能のトリガー
     */
    triggerTimeout: function () {
        if (this.state.timeoutUsed) {
            Game.toast("タイムアウトは既に消費されています", "error");
            return;
        }

        if (this.state.phase !== 'action') {
            Game.toast("戦闘中のみ使用可能です", "warning");
            return;
        }

        // 一時停止
        this.state.isPaused = true;
        this.state.timeoutUsed = true;

        // ログ出力
        this.addLog(">>> タイムアウト介入 <<<");

        // モーダル表示
        Game.modal({
            title: "⏸ タイムアウト (戦術介入)",
            content: `
                <p>時間を停止しました。</p>
                <p>ユニットの配置変更や戦術の見直しが可能です。</p>
                <hr>
                <ul>
                    <li>配置を変更するにはユニットをドラッグ(クリック)して入れ替えてください。</li>
                    <li>戦術を変更するにはユニットをクリックして詳細を開いてください。</li>
                </ul>
            `,
            actions: [
                {
                    label: "戦闘再開",
                    class: "btn-primary",
                    onClick: () => {
                        Game.closeModal();
                        this.resumeBattle();
                    }
                }
            ]
        });

        // UI更新 (ボタンの状態など)
        this.updateUI();
    },

    /**
     * 戦闘再開
     */
    resumeBattle: function () {
        this.state.isPaused = false;
        this.addLog(">>> 戦闘再開 <<<");
        this.updateUI();

        // executeTurnが waitBasedOnSpeed で待機しているはずなので、
        // isPaused = false になれば自動的にループが再開する
    },

    /**
     * ログの追加
     */
    addLog: function (message) {
        this.state.log.push(message);
        if (this.state.log.length > 50) this.state.log.shift();
        this.updateUI(); // 即時反映
    }
};
