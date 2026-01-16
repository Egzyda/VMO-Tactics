/**
 * VMO Tactics - System & Data Management
 * Handles Save/Load, Settings, and Codex Persistence
 */

const Systems = {
    // デフォルトのセーブデータ構造 (仕様書 16.1)
    defaultSaveData: {
        version: "1.0.0",
        timestamp: 0,
        player: {
            runs_completed: 0,
            total_victories: 0,
            unlocked_difficulties: ["normal"]
        },
        codex: {
            unlocked_monsters: [], // IDリスト
            seen_monsters: []
        },
        unlocks: {
            starter_decks: ["balance"],
            challenge_modes: []
        },
        current_run: null, // 中断データ
        settings: {
            volume: { master: 0.8, bgm: 0.6, sfx: 0.7 },
            game_speed: 1
        }
    },

    // 現在展開中のセーブデータ
    data: null,

    /**
     * システム初期化
     */
    init: function() {
        console.log("Systems Initializing...");
        this.load();
    },

    /**
     * ゲームデータのロード
     */
    load: function() {
        const json = localStorage.getItem('vmo_tactics_save');
        if (json) {
            try {
                const loaded = JSON.parse(json);
                // TODO: バージョンチェックとマイグレーション
                this.data = { ...this.defaultSaveData, ...loaded };
                console.log("Save data loaded.");
            } catch (e) {
                console.error("Failed to load save data", e);
                this.data = JSON.parse(JSON.stringify(this.defaultSaveData));
            }
        } else {
            console.log("No save data found. Creating new.");
            this.resetSave();
        }
        
        // 設定の適用
        this.applySettings();
    },

    /**
     * ゲームデータのセーブ
     */
    save: function() {
        if (!this.data) return;
        this.data.timestamp = Date.now();
        localStorage.setItem('vmo_tactics_save', JSON.stringify(this.data));
        console.log("Game saved.");
    },

    /**
     * セーブデータのリセット
     */
    resetSave: function() {
        this.data = JSON.parse(JSON.stringify(this.defaultSaveData));
        this.save();
    },

    // --- Specific Data Access ---

    /**
     * 図鑑の更新
     */
    unlockMonsterInCodex: function(monsterId) {
        if (!this.data.codex.unlocked_monsters.includes(monsterId)) {
            this.data.codex.unlocked_monsters.push(monsterId);
            this.save();
            // UI.showToast("図鑑に新しいモンスターが登録されました！");
        }
    },

    /**
     * 設定の適用
     */
    applySettings: function() {
        const s = this.data.settings;
        // TODO: 音量や速度のグローバル反映
        if (window.Battle) Battle.state.speed = s.game_speed;
    },

    /**
     * ランデータの保存（中断セーブ用）
     */
    saveRunState: function(runData, playerParty) {
        this.data.current_run = {
            ...runData,
            party: playerParty
        };
        this.save();
    },

    /**
     * ランデータの破棄（ゲームオーバー/クリア時）
     */
    clearRunState: function() {
        this.data.current_run = null;
        this.save();
    }
};

// 自動初期化
window.addEventListener('DOMContentLoaded', () => {
    Systems.init();
});
