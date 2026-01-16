/**
 * VMO Tactics - UI System
 * Handles Screen Transitions, Modals, Toasts, and HUD Updates
 */

const UI = {
    // --- Screen Management ---
    switchScreen: function(screenId) {
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
    showModal: function(options) {
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const contentEl = document.getElementById('modal-content');
        const actionsEl = document.getElementById('modal-actions');

        if (!overlay) return;

        titleEl.textContent = options.title || "Message";
        contentEl.textContent = options.content || "";

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

    closeModal: function() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.classList.add('hidden');
    },

    // --- Toast System ---
    /**
     * Show a toast notification
     * @param {string} message
     * @param {string} type - 'success', 'error', 'warning', or empty
     */
    showToast: function(message, type = '') {
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

    // --- HUD & Party View ---
    updatePartyView: function(playerState) {
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
    renderStarterDecks: function(decks, onSelect) {
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
