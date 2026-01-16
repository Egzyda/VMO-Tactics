/**
 * VMO Tactics - Party Management System
 * Handles Party interactions, Swapping, and Box management.
 */

const Party = {
    state: {
        selectedUnitIndex: null, // Index of currently selected unit (local to current view)
        selectedSource: null,    // 'party' or 'box'
    },

    /**
     * Initialize Party Screen
     */
    init: function () {
        this.render();
    },

    /**
     * Render the Party Screen
     */
    render: function () {
        const partyContainer = document.getElementById('party-list');
        const boxContainer = document.getElementById('box-list');
        const player = Game.state.player;

        if (!player) return;

        // Render Active Party (Max 6)
        if (partyContainer) {
            partyContainer.innerHTML = '';
            // Ensure we display up to 6 slots
            for (let i = 0; i < 6; i++) {
                const unit = player.party[i];
                const el = this.createUnitCard(unit, i, 'party');
                partyContainer.appendChild(el);
            }
        }

        // Render Box (Reserve)
        if (boxContainer) {
            boxContainer.innerHTML = '';
            // If box is empty, maybe show a message?
            if (!player.box || player.box.length === 0) {
                boxContainer.innerHTML = '<div class="empty-box-msg">BOXは空です</div>';
            } else {
                player.box.forEach((unit, i) => {
                    const el = this.createUnitCard(unit, i, 'box');
                    boxContainer.appendChild(el);
                });
            }
        }

        this.updateStatsPreview();
    },

    /**
     * Create a Unit Card Element for Party Screen
     */
    createUnitCard: function (unit, index, source) {
        const div = document.createElement('div');
        div.className = 'party-unit-card';

        if (!unit) {
            div.classList.add('empty-slot');
            div.textContent = 'EMPTY';
        } else {
            const isSelected = (this.state.selectedSource === source && this.state.selectedUnitIndex === index);
            if (isSelected) div.classList.add('selected');

            div.innerHTML = `
                <div class="name-badge">${unit.name}</div>
                <div class="unit-visual">
                    <img src="${unit.img}" alt="${unit.name}">
                </div>
                <div class="unit-type-icon ${unit.type}">${unit.type}</div>
                <div class="level-badge">Lv.${unit.level || 1}</div>
            `;

            div.onclick = () => this.handleUnitClick(index, source);
        }

        return div;
    },

    /**
     * Handle Unit Selection
     */
    handleUnitClick: function (index, source) {
        const player = Game.state.player;

        // Prevent selecting empty slots in Box (though iteration handles this, simple check)
        if (source === 'box' && (!player.box || !player.box[index])) return;
        // Prevent selecting empty slots in Party ONLY IF we aren't already holding a unit (to move INTO empty slot)
        // Actually, let's allow selecting empty party slots if they are valid swap targets?
        // Simpler model: Click one, then click another to swap.

        // First Selection
        if (this.state.selectedSource === null) {
            // Can only select actual units initially
            if (source === 'party' && !player.party[index]) return;
            if (source === 'box' && !player.box[index]) return;

            this.state.selectedSource = source;
            this.state.selectedUnitIndex = index;
            this.render();
            return;
        }

        // Second Selection (Action)

        // Show Details if clicking currently selected unit again
        if (this.state.selectedSource === source && this.state.selectedUnitIndex === index) {
            // Deselect logic was here, but let's change to Show Details
            const unit = (source === 'party') ? player.party[index] : player.box[index];
            if (unit) UI.showUnitStatusModal(unit);

            // Also deselect to clean up UI? Or keep selected?
            // Let's deselect to avoid confusion
            this.state.selectedSource = null;
            this.state.selectedUnitIndex = null;
            this.render();
            return;
        }

        // Execute Swap
        this.swapUnits(this.state.selectedSource, this.state.selectedUnitIndex, source, index);

        // Reset selection
        this.state.selectedSource = null;
        this.state.selectedUnitIndex = null;
        this.render();
    },

    /**
     * Swap Units logic
     */
    swapUnits: function (srcSource, srcIdx, destSource, destIdx) {
        const player = Game.state.player;

        // Get source unit references
        let srcList = (srcSource === 'party') ? player.party : player.box;
        let destList = (destSource === 'party') ? player.party : player.box;

        const srcUnit = srcList[srcIdx];
        const destUnit = destList[destIdx]; // Might be undefined/null

        // Logic check: moving unit from Box to Party Empty Slot?
        // Logic check: Swap two Party members?
        // Logic check: Swap Party member with Box member?

        // Perform Swap
        srcList[srcIdx] = destUnit;
        destList[destIdx] = srcUnit;

        // Cleanup: Remove nulls from Box if any created (Box shouldn't have holes, usually)
        // But Party CAN have holes? Or should we shift party?
        // Plan: Party has fixed 6 slots. Box is a list. 
        // If we swap Party Unit <-> Box Unit, fine.
        // If we swap Box Unit <-> Party Empty, fine.

        // Clean up undefineds in arrays if necessary, particularly for Box
        player.box = player.box.filter(u => u);
        // Party stays as is (sparse array or undefineds allowed for empty slots)
        // But we want to keep party size fixed to 6 iterations? 
        // In Game.state, party is array. 

        Game.toast("編成を変更しました", "success");

        // Save game might be good here
    },

    /**
     * Show stats preview (Optional)
     */
    updateStatsPreview: function () {
        // Implement selected unit stats view if needed
    }
};
