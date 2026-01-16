/**
 * VMO Tactics - Game Mechanics
 * Handles Math, Formulas, Type Matchups, and Balancing
 */

const Mechanics = {
    // --- Constants ---

    // タイプ相性表 (仕様書 4.3)
    TYPE_CHART: {
        fire:   { grass: 1.5, water: 0.5, ice: 2.0 },
        water:  { fire: 1.5, grass: 0.5, ground: 1.5 },
        grass:  { water: 1.5, fire: 0.5, flying: 0.5 },
        light:  { dark: 1.5, ghost: 1.5 },
        dark:   { light: 1.5, psychic: 1.5 },
        normal: {} 
    },

    // 経験値テーブル (仕様書 15.1)
    EXP_TABLE: {
        1: 0, 2: 100, 3: 250, 4: 450, 5: 700,
        6: 1000, 7: 1350, 8: 1750, 9: 2200, 10: 2700,
        11: 3250, 12: 3850, 13: 4500, 14: 5200, 15: 5950,
        16: 6750, 17: 7600, 18: 8500, 19: 9450, 20: 10500
    },

    // --- Battle Formulas ---

    /**
     * ダメージ計算
     * @param {Object} attacker - 攻撃側ユニット
     * @param {Object} defender - 防御側ユニット
     * @param {Object} move - 使用する技
     * @returns {Object} { damage, isCritical, typeModifier }
     */
    calculateDamage: function(attacker, defender, move) {
        // TODO: 実際のステータスを参照して計算
        // 仕様書 4.3: damage = skill.power + atk - def
        
        let damage = (move.power || 0) + (attacker.stats?.atk || 10) - (defender.stats?.def || 5);
        
        // 最低保証
        damage = Math.max(1, damage);

        // タイプ相性計算
        const modifier = this.getTypeMultiplier(move.type, defender.type);
        damage = Math.floor(damage * modifier);

        return {
            damage: damage,
            isCritical: false, // TODO: クリティカル判定
            typeModifier: modifier
        };
    },

    /**
     * タイプ相性倍率の取得
     */
    getTypeMultiplier: function(attackType, defenseType) {
        if (!this.TYPE_CHART[attackType]) return 1.0;
        return this.TYPE_CHART[attackType][defenseType] || 1.0;
    },

    // --- Growth Formulas ---

    /**
     * 次のレベルまでに必要な経験値を取得
     */
    getExpForNextLevel: function(currentLevel) {
        if (currentLevel >= 20) return 0;
        const nextTotal = this.EXP_TABLE[currentLevel + 1] || 99999;
        const currentTotal = this.EXP_TABLE[currentLevel] || 0;
        return nextTotal - currentTotal;
    },

    /**
     * レベルアップ時のステータス成長
     * @returns {Object} 上昇するステータス値 { hp, atk, def, spd }
     */
    getGrowthValues: function(monsterId) {
        // 仕様書 15.2: 種族ごとの成長率 + ランダム補正
        // TODO: dbMonstersから成長率を取得して計算
        return { hp: 10, atk: 2, def: 2, spd: 1 };
    }
};
