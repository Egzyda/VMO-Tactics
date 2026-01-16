/**
 * VMO Tactics - Visual Effects System
 * Handles visual feedback for battle actions
 */

const Effects = {
    /**
     * ダメージポップアップを表示
     * @param {HTMLElement} targetEl - 対象のDOM要素
     * @param {number|string} value - 表示する数値またはテキスト
     * @param {boolean} isCritical - クリティカルかどうか
     * @param {string} type - 'damage' | 'heal' | 'miss'
     */
    showDamagePopup: function (targetEl, value, isCritical = false, type = 'damage') {
        if (!targetEl) return;

        const popup = document.createElement('div');
        popup.className = `damage-popup ${type}`;
        if (isCritical) popup.classList.add('critical');

        popup.textContent = value;

        // 位置調整 (対象の中央付近)
        const rect = targetEl.getBoundingClientRect();
        // 親がrelativeなら、親基準の絶対座標にする必要があるが、
        // 簡易的にtargetElの中にappendしてabsolute配置する

        targetEl.appendChild(popup);

        // アニメーション終了後に削除
        setTimeout(() => {
            popup.remove();
        }, 1000);
    },

    /**
     * 攻撃エフェクト
     * @param {HTMLElement} targetEl 
     * @param {string} effectType - 'slash', 'magic', 'impact' etc.
     */
    playAttackEffect: function (targetEl, effectType = 'slash') {
        if (!targetEl) return new Promise(r => r());

        return new Promise(resolve => {
            const effect = document.createElement('div');
            effect.className = `vfx vfx-${effectType}`;
            targetEl.appendChild(effect);

            // アニメーション終了待ち
            setTimeout(() => {
                effect.remove();
                resolve();
            }, 500); // CSSのアニメーション時間と合わせる
        });
    },

    /**
     * 被弾エフェクト (フラッシュ/シェイク)
     */
    playHitEffect: function (targetEl) {
        if (!targetEl) return new Promise(r => r());

        return new Promise(resolve => {
            targetEl.classList.add('hit-shake');
            targetEl.classList.add('hit-flash');

            setTimeout(() => {
                targetEl.classList.remove('hit-shake');
                targetEl.classList.remove('hit-flash');
                resolve();
            }, 400);
        });
    },

    /**
     * 撃破エフェクト
     */
    playDeathEffect: function (targetEl) {
        if (!targetEl) return new Promise(r => r());

        return new Promise(resolve => {
            targetEl.classList.add('unit-death');

            setTimeout(() => {
                // 要素自体は消さない（Battle.renderで消えるため）
                // ただし透明にして直後の再描画まで耐える
                targetEl.style.opacity = '0';
                resolve();
            }, 800);
        });
    }
};
