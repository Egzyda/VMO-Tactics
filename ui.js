/**
 * VMO Tactics - UI System
 * Handles Screen Transitions, Modals, Toasts, and HUD Updates
 */

const UI = {
    // --- Screen Management ---
    switchScreen: function (screenId) {
        // 全画面を隠す
        document.querySelectorAll('.screen').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('active');
        });

        // 指定画面を表示
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('active');
            Game.state.currentScreen = screenId;
            console.log(`Screen switched to: ${screenId}`);
        } else {
            console.error(`Screen ID '${screenId}' not found.`);
        }
    },

    // --- Modal System ---
    /**
     * Show a modal dialog
     * @param {Object} options - { title, content, actions: [{label, onClick, class}] }
     */
    showModal: function (options) {
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const contentEl = document.getElementById('modal-content');
        const actionsEl = document.getElementById('modal-actions');

        if (!overlay) return;

        titleEl.textContent = options.title || "Message";
        contentEl.innerHTML = options.content || "";

        // アクションボタン生成
        actionsEl.innerHTML = '';
        if (options.actions && options.actions.length > 0) {
            options.actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = action.class || 'btn-secondary';
                btn.textContent = action.label;
                btn.onclick = action.onClick;
                actionsEl.appendChild(btn);
            });
        } else {
            // デフォルトの閉じるボタン
            const btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.textContent = 'OK';
            btn.onclick = () => this.closeModal();
            actionsEl.appendChild(btn);
        }

        overlay.classList.remove('hidden');
    },

    closeModal: function () {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.classList.add('hidden');
    },

    // --- Tactics UI ---
    showTacticsModal: function (unit, onSave) {
        // 現在の設定を取得 (なければデフォルト)
        const priority = (unit.behavior && unit.behavior.priority) || 'random';
        const condition = (unit.behavior && unit.behavior.condition) || 'always';

        this.showModal({
            title: `戦術設定: ${unit.name}`,
            content: `
                <div class="tactics-form">
                    <div class="form-group">
                        <label>優先ターゲット (Priority)</label>
                        <select id="tactics-priority">
                            <option value="random" ${priority === 'random' ? 'selected' : ''}>ランダム (Random)</option>
                            <option value="lowest_hp" ${priority === 'lowest_hp' ? 'selected' : ''}>HPが低い敵 (Lowest HP)</option>
                            <option value="highest_at" ${priority === 'highest_at' ? 'selected' : ''}>攻撃力が高い敵 (Highest ATK)</option>
                            <option value="nearest" ${priority === 'nearest' ? 'selected' : ''}>近い敵 (Nearest)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>スキル使用条件 (Skill Condition)</label>
                        <select id="tactics-condition" disabled>
                            <option value="always">常時使用 (Always)</option>
                            <option value="hp_below_50">HP 50%以下 (Coming Soon)</option>
                        </select>
                    </div>
                </div>
            `,
            actions: [
                {
                    label: "保存 (Save)",
                    class: "btn-primary",
                    onClick: () => {
                        const newPriority = document.getElementById('tactics-priority').value;
                        const newCondition = document.getElementById('tactics-condition').value;
                        onSave({ priority: newPriority, condition: newCondition });
                        this.closeModal();
                        Game.toast("戦術を保存しました", "success");
                    }
                },
                { label: "キャンセル", onClick: () => this.closeModal() }
            ]
        });
    },

    // --- Toast System ---
    /**
     * Show a toast notification
     * @param {string} message
     * @param {string} type - 'success', 'error', 'warning', or empty
     */
    showToast: function (message, type = '') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;

        container.appendChild(el);

        // 3秒後に消える
        setTimeout(() => {
            el.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 500);
        }, 3000);
    },

    // --- Unit Status UI ---
    showUnitStatusModal: function (unit) {
        if (!unit) return;

        const nextExp = unit.level * 100;
        const expPercent = Math.min(100, ((unit.exp || 0) / nextExp) * 100);

        // 装備リスト (仮)
        const equips = (unit.equipment || []).length > 0 ? unit.equipment.join(", ") : "なし";
        // スキルリスト
        const skills = (unit.skills || []).map(s => `[${s.name}]`).join(" ");

        this.showModal({
            title: `Status: ${unit.name}`,
            content: `
                <div style="display:flex; gap:20px;">
                    <div style="flex-shrink:0;">
                        <img src="${unit.img}" style="width:100px; height:100px; border:2px solid var(--primary); background:#000;">
                    </div>
                    <div style="flex-grow:1; text-align:left; font-size:0.9rem;">
                        <p><strong>Lv.${unit.level}</strong> (${unit.type})</p>
                        <div style="margin:5px 0;">
                            HP: ${unit.currentHp} / ${unit.maxHp}
                            <div style="width:100%; height:8px; background:#333; margin-top:2px;">
                                <div style="width:${(unit.currentHp / unit.maxHp) * 100}%; height:100%; background:var(--neon-green);"></div>
                            </div>
                        </div>
                        <div style="margin:5px 0;">
                            EXP: ${unit.exp || 0} / ${nextExp}
                            <div style="width:100%; height:4px; background:#333; margin-top:2px;">
                                <div style="width:${expPercent}%; height:100%; background:var(--neon-cyan);"></div>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-top:10px;">
                            <div>ATK: ${unit.stats.atk}</div>
                            <div>DEF: ${unit.stats.def}</div>
                            <div>SPD: ${unit.stats.spd}</div>
                            <div>RNG: ${unit.stats.range || 1}</div>
                        </div>
                    </div>
                </div>
                <hr style="border-color:#444; margin:10px 0;">
                <div style="text-align:left; font-size:0.9rem;">
                    <p><strong>Skills:</strong> ${skills}</p>
                    <p><strong>Equip:</strong> ${equips}</p>
                    <p><strong>Tactics:</strong> ${unit.behavior ? (unit.behavior.priority + " / " + unit.behavior.condition) : "Default"}</p>
                </div>
            `,
            actions: [
                {
                    label: "戦術変更",
                    onClick: () => {
                        this.showTacticsModal(unit, (newBehavior) => {
                            unit.behavior = newBehavior;
                            // モーダルを閉じた後、再度ステータス画面を開く（更新反映）
                            setTimeout(() => this.showUnitStatusModal(unit), 100);
                        });
                    }
                },
                { label: "閉じる", onClick: () => this.closeModal() }
            ]
        });
    },

    // --- HUD & Party View ---
    updatePartyView: function (playerState) {
        const container = document.getElementById('mini-party-view');
        if (!container || !playerState.party) return;

        const goldEl = document.getElementById('player-gold');
        if (goldEl) goldEl.textContent = `💰 ${playerState.gold}`;

        container.innerHTML = playerState.party.map(m => {
            const hpPercent = (m.currentHp / m.maxHp) * 100;
            const hpColor = hpPercent > 50 ? '#2ecc71' : (hpPercent > 20 ? '#f1c40f' : '#e74c3c');
            return `
                <div class="mini-unit">
                    <img src="${m.img}" alt="${m.name}">
                    <div class="mini-hp-bar">
                        <div class="mini-hp-fill" style="width: ${hpPercent}%; background: ${hpColor};"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // --- Starter Selection UI ---
    renderStarterDecks: function (decks, onSelect) {
        const container = document.getElementById('starter-container');
        if (!container) return;

        container.innerHTML = '';

        decks.forEach(deck => {
            const card = document.createElement('div');
            card.className = 'starter-card';

            // モンスターアイコン生成
            const icons = deck.monsters.map(id => {
                const m = window.dbMonsters.find(x => x.id === id);
                return m ? `<div class="mini-icon"><img src="${m.img}" alt="${m.name}"></div>` : '';
            }).join('');

            card.innerHTML = `
                <div class="card-header">
                    <h3>${deck.name}</h3>
                </div>
                <div class="card-body">
                    <p>${deck.desc}</p>
                    <div class="deck-icons">${icons}</div>
                </div>
            `;

            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.textContent = 'SELECT';
            btn.onclick = () => onSelect(deck.id);

            card.appendChild(btn);
            container.appendChild(card);
        });
    }
};
