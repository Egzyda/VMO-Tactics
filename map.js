/**
 * VMO Tactics - Map & Node System
 * Handles Map Generation, Node Types, and Visual Rendering
 */

const MapSystem = {
    mapData: null,

    // ノードタイプ定義
    nodeTypes: {
        start: { icon: '🏠', label: 'START' },
        battle: { icon: '🗡️', label: 'BATTLE' },
        elite: { icon: '⚠️', label: 'ELITE' },
        event: { icon: '❓', label: 'EVENT' },
        rest: { icon: '💤', label: 'REST' },
        shop: { icon: '🛒', label: 'SHOP' },
        boss: { icon: '👑', label: 'BOSS' }
    },

    /**
     * マップの生成
     * @param {string} difficulty - 難易度
     */
    generate: function (difficulty) {
        console.log("Generating Map...");
        const layers = 9; // 全9層 (1-7:Content, 8:Boss)
        const mapHeight = 1200;
        const nodes = [];

        // Note: Removed distinct Layer 0 (Start Node) to allow choosing from multiple paths immediately.
        // Paths start from Layer 0 index internally for calculation, but logically it's the first stage.

        // Layer 0-7: Content (shifted logic slightly)
        // Let's keep loop i from 0 to layers-2 to act as main stages?
        // Or simpler: Just generate Layer 0 as "Battle" (Branching Start) instead of "Start".

        // Revised Generation for Branching Start:
        // Layer 0 is now the first set of choices (Battle/etc).
        for (let i = 0; i < layers - 1; i++) {
            const nodeCount = 2 + Math.floor(Math.random() * 3);
            const sectionWidth = 100 / nodeCount;

            for (let j = 0; j < nodeCount; j++) {
                // Force Layer 0 to be Battle (First Contact)
                const type = (i === 0) ? 'battle' : this.rollNodeType(i + 1);
                const x = (j * sectionWidth) + (sectionWidth / 2) + (Math.random() * 10 - 5);
                nodes.push(this.createNode(i, type, x, i));
            }
        }

        // Layer 8: Boss (Last Layer)
        nodes.push(this.createNode(layers - 1, 'boss', 50, layers - 1));

        // Generate Connections
        this.connectNodes(nodes, layers);

        Game.state.currentRun.mapData = { nodes: nodes, layers: layers, height: mapHeight };
        Game.state.currentRun.currentNodeId = null; // No current node means "at start"
        Game.state.currentRun.clearedNodes = [];
    },

    rollNodeType: function (layer) {
        const r = Math.random();
        if (layer === 1) return 'battle';
        if (layer === 4) return r < 0.5 ? 'shop' : 'rest';
        if (layer === 7) return 'rest';

        if (r < 0.55) return 'battle';
        if (r < 0.80) return 'event';
        if (r < 0.92) return 'elite';
        return 'shop';
    },

    createNode: function (layer, type, x, yIdx) {
        return {
            id: `node_${layer}_${Math.floor(x)}`,
            layer: layer,
            type: type,
            x: Math.max(10, Math.min(90, x)),
            y: yIdx,
            parents: [],
            children: []
        };
    },

    connectNodes: function (nodes, totalLayers) {
        const layerNodes = Array.from({ length: totalLayers }, (_, i) =>
            nodes.filter(n => n.layer === i).sort((a, b) => a.x - b.x)
        );

        for (let i = 0; i < totalLayers - 1; i++) {
            const currentLayer = layerNodes[i];
            const nextLayer = layerNodes[i + 1];

            currentLayer.forEach(curr => {
                let closest = nextLayer[0];
                let minDist = Math.abs(curr.x - closest.x);

                nextLayer.forEach(next => {
                    const dist = Math.abs(curr.x - next.x);
                    if (dist < minDist) {
                        minDist = dist;
                        closest = next;
                    }
                });

                this.link(curr, closest);

                if (Math.random() < 0.4 && nextLayer.length > 1) {
                    const secondClosest = nextLayer.find(n => n !== closest && Math.abs(n.x - curr.x) < 40);
                    if (secondClosest) this.link(curr, secondClosest);
                }
            });

            nextLayer.forEach(next => {
                if (next.parents.length === 0) {
                    const closestParent = currentLayer.reduce((prev, curr) =>
                        Math.abs(curr.x - next.x) < Math.abs(prev.x - next.x) ? curr : prev
                    );
                    this.link(closestParent, next);
                }
            });
        }
    },

    link: function (parent, child) {
        if (!parent.children.includes(child.id)) parent.children.push(child.id);
        if (!child.parents.includes(parent.id)) child.parents.push(parent.id);
    },

    render: function () {
        const container = document.getElementById('map-visual-area');
        const mapData = Game.state.currentRun.mapData;
        const currentNodeId = Game.state.currentRun.currentNodeId;
        const clearedNodes = Game.state.currentRun.clearedNodes || [];

        container.innerHTML = '';

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "map-connections");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");

        mapData.nodes.forEach(node => {
            const yPercent = 90 - (node.layer / (mapData.layers - 1)) * 80;

            node.children.forEach(childId => {
                const child = mapData.nodes.find(n => n.id === childId);
                const childY = 90 - (child.layer / (mapData.layers - 1)) * 80;

                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", `${node.x}%`);
                line.setAttribute("y1", `${yPercent}%`);
                line.setAttribute("x2", `${child.x}%`);
                line.setAttribute("y2", `${childY}%`);
                line.setAttribute("stroke", "rgba(255,255,255,0.2)");
                line.setAttribute("stroke-width", "2");
                line.setAttribute("stroke-dasharray", "5,5");
                svg.appendChild(line);
            });

            const el = document.createElement('div');
            el.className = `map-node node-${node.type}`;
            el.style.left = `${node.x}%`;
            el.style.top = `${yPercent}%`;
            el.innerHTML = `<div class="node-icon">${this.nodeTypes[node.type].icon}</div>`;
            el.onclick = () => this.handleNodeClick(node);

            let status = 'locked';
            if (clearedNodes.includes(node.id)) {
                status = 'cleared';
            } else if (currentNodeId === null) {
                if (node.layer === 0) status = 'available';
            } else {
                const currentNode = mapData.nodes.find(n => n.id === currentNodeId);
                if (currentNode && currentNode.children.includes(node.id)) {
                    status = 'available';
                }
            }

            el.classList.add(status);
            if (status === 'available') el.classList.add('pulse-anim');
            container.appendChild(el);
        });

        container.appendChild(svg);
        container.scrollTop = container.scrollHeight;
    },

    handleNodeClick: function (node) {
        const mapData = Game.state.currentRun.mapData;
        const yPercent = 90 - (node.layer / (mapData.layers - 1)) * 80;
        const el = document.querySelector(`.map-node[style*="left: ${node.x}%"][style*="top: ${yPercent}%"]`);

        if (el && el.classList.contains('locked')) {
            Game.toast("そこへは移動できません", "error");
            return;
        }
        if (el && el.classList.contains('cleared')) {
            Game.toast("攻略済みの地点です", "warning");
            return;
        }

        Game.modal({
            title: `${this.nodeTypes[node.type].label} に到達`,
            content: "イベントを開始しますか？",
            actions: [
                {
                    label: "開始",
                    class: "btn-primary",
                    onClick: () => {
                        Game.closeModal();
                        this.executeNodeEvent(node);
                    }
                },
                { label: "キャンセル", onClick: () => Game.closeModal() }
            ]
        });
    },

    executeNodeEvent: function (node) {
        // 状態更新（移動確定）
        Game.state.currentRun.currentNodeId = node.id;
        if (!Game.state.currentRun.clearedNodes.includes(node.id)) {
            Game.state.currentRun.clearedNodes.push(node.id);
        }

        if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
            Game.switchScreen('screen-battle');
            const enemies = this.generateEnemies(node.type, node.layer);
            Battle.initBattle(Game.state.player.party, enemies);
        } else if (node.type === 'shop') {
            this.handleShopNode();
        } else if (node.type === 'rest') {
            this.handleRestNode();
        } else if (node.type === 'event') {
            this.handleEventNode();
        } else if (node.type === 'start') {
            Game.toast("ここが出発地点です。", "info");
            this.render();
        } else {
            Game.toast(`${this.nodeTypes[node.type].label} はまだ実装されていません`, "warning");
            this.render(); // status update only
        }
    },

    /**
     * 休憩ノード処理
     */
    handleRestNode: function () {
        Game.modal({
            title: "休憩ポイント (Rest)",
            content: "焚き火の跡を見つけました。何をして過ごしますか？",
            actions: [
                {
                    label: "休憩する (HP 50% 回復)",
                    class: "btn-primary",
                    onClick: () => {
                        Game.state.player.party.forEach(m => {
                            const healAmount = Math.floor(m.maxHp * 0.5);
                            m.currentHp = Math.min(m.maxHp, m.currentHp + healAmount);
                        });
                        Game.toast("パーティ全員のHPが回復しました！", "success");
                        UI.updatePartyView(Game.state.player);
                        Game.closeModal();
                        this.render();
                    }
                },
                {
                    label: "トレーニング (XP +100)",
                    onClick: () => {
                        let leveledUp = false;
                        Game.state.player.party.forEach(m => {
                            m.exp = (m.exp || 0) + 100;
                            // 簡易レベルアップ処理 (必要経験値: Level * 100 と仮定)
                            const nextLevelExp = m.level * 100;
                            if (m.exp >= nextLevelExp) {
                                m.level++;
                                m.exp -= nextLevelExp;
                                m.maxHp += 10; // ステータス上昇
                                m.stats.atk += 2;
                                m.stats.def += 1;
                                m.currentHp = m.maxHp; // レベルアップで全回復
                                leveledUp = true;
                            }
                        });

                        if (leveledUp) Game.toast("特訓の成果により、レベルアップしたユニットがいます！", "success");
                        else Game.toast("パーティ全員が経験値を得ました！ (XP+100)", "success");

                        UI.updatePartyView(Game.state.player);
                        Game.closeModal();
                        this.render();
                    }
                }
            ]
        });
    },

    /**
     * ショップノード処理
     */
    handleShopNode: function () {
        // ランダムな商品ラインナップ生成
        const inventory = [];

        // 1. ポーション
        inventory.push({ type: 'item', name: 'HPポーション', price: 50, effect: 'heal_party_50', desc: '味方全体のHPを50回復' });

        // 2. スキル (ランダム)
        const allMoves = Object.values(window.dbMoves);
        const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        inventory.push({ type: 'skill', name: `秘伝書: ${randomMove.name}`, price: 150, data: randomMove, desc: `スキル「${randomMove.name}」を習得する` });

        // 3. モンスター (ランダム)
        const allMonsters = window.dbMonsters.filter(m => m.id < 900);
        const randomMonster = allMonsters[Math.floor(Math.random() * allMonsters.length)];
        inventory.push({ type: 'monster', name: `傭兵: ${randomMonster.name}`, price: 200, data: randomMonster, desc: `${randomMonster.name} (Lv.1) をスカウトする` });

        // 商品リストHTML生成
        const inventoryHtml = inventory.map((item, index) => `
            <div class="shop-item" style="border:1px solid #444; padding:10px; margin-bottom:10px; background:rgba(0,0,0,0.3); display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="color:var(--neon-yellow); font-weight:bold;">${item.name}</div>
                    <div style="font-size:0.8em; color:#aaa;">${item.desc}</div>
                </div>
                <button class="btn-tiny" style="width:auto; padding:4px 8px;" onclick="MapSystem.buyItem(${index})">${item.price} G</button>
            </div>
        `).join('');

        // 一時的にインベントリを保存して参照できるようにする
        this.currentShopInventory = inventory;

        Game.modal({
            title: `行商人 (所持金: ${Game.state.player.gold} G)`,
            content: `<div id="shop-list">${inventoryHtml}</div>`,
            actions: [
                { label: "立ち去る", onClick: () => { Game.closeModal(); this.render(); } }
            ]
        });
    },

    buyItem: function (index) {
        const item = this.currentShopInventory[index];
        if (!item) return;

        if (Game.state.player.gold < item.price) {
            Game.toast("ゴールドが足りません！", "error");
            return;
        }

        // 購入処理
        Game.state.player.gold -= item.price;

        let successMsg = "";

        if (item.type === 'item') {
            if (item.effect === 'heal_party_50') {
                Game.state.player.party.forEach(m => {
                    m.currentHp = Math.min(m.maxHp, m.currentHp + 50);
                });
                successMsg = "購入しました！味方全員が回復しました。";
            }
        } else if (item.type === 'monster') {
            const newMonster = Game.createMonsterInstance(item.data.id, 1);
            if (Game.state.player.party.length < Game.state.player.maxPartySize) {
                Game.state.player.party.push(newMonster);
                successMsg = `${newMonster.name} がパーティに加わりました！`;
            } else {
                Game.state.player.box.push(newMonster);
                successMsg = `${newMonster.name} をBoxに送りました。`;
            }
        } else if (item.type === 'skill') {
            // スキルはとりあえず「アイテム」として付与するか、任意のキャラに覚えさせるか...
            // 簡易実装: ランダムなパーティメンバー1体が習得
            const target = Game.state.player.party[Math.floor(Math.random() * Game.state.player.party.length)];
            target.skills.push({ ...item.data, id: item.data.name }); // idは簡易的にnameを使用
            successMsg = `${target.name} が ${item.data.name} を覚えました！`;
        }

        Game.toast(successMsg, "success");
        UI.updatePartyView(Game.state.player);

        // 再描画 (所持金更新のため一度閉じて再度開く、あるいはDOM直接更新だが、今回は閉じる)
        Game.closeModal();
        this.render();
    },

    /**
     * イベントノード処理
     */
    handleEventNode: function () {
        const events = [
            {
                title: "謎の祠",
                text: "古びた祭壇があります。祈りますか？",
                actions: [
                    {
                        label: "祈る",
                        onClick: () => {
                            if (Math.random() < 0.5) {
                                const gold = 100;
                                Game.state.player.gold += gold;
                                Game.toast(`神のご加護だ！ ${gold} ゴールドを得た！`, "success");
                            } else {
                                Game.state.player.party.forEach(m => m.currentHp = Math.max(1, m.currentHp - 10));
                                Game.toast("呪われてしまった... HPが減少した。", "error");
                            }
                            UI.updatePartyView(Game.state.player);
                            Game.closeModal();
                            this.render();
                        }
                    },
                    {
                        label: "立ち去る",
                        onClick: () => { Game.closeModal(); this.render(); }
                    }
                ]
            },
            {
                title: "森の出会い",
                text: "迷子になっているモンスターを見かけました。",
                actions: [
                    {
                        label: "仲間に誘う",
                        onClick: () => {
                            const newMonster = Game.createMonsterInstance(1, 1); // フレイミー固定
                            if (Game.state.player.party.length < Game.state.player.maxPartySize) {
                                Game.state.player.party.push(newMonster);
                            } else {
                                Game.state.player.box.push(newMonster);
                            }
                            Game.toast(`${newMonster.name} が仲間になった！`, "success");
                            UI.updatePartyView(Game.state.player);
                            Game.closeModal();
                            this.render();
                        }
                    },
                    {
                        label: "見送る",
                        onClick: () => { Game.toast("彼らは森へ帰っていった..."); Game.closeModal(); this.render(); }
                    }
                ]
            }
        ];

        const event = events[Math.floor(Math.random() * events.length)];

        Game.modal({
            title: event.title,
            content: event.text,
            actions: event.actions
        });
    },

    /**
     * 敵生成ロジック
     */
    generateEnemies: function (type, layer) {
        const difficulty = Game.state.currentRun.difficulty;
        let count = 0;
        let pool = [];

        // 階層に基づいた敵候補の選定（簡易実装：ID範囲で区切るなど）
        // 今回はランダム選出
        const allMonsters = window.dbMonsters.filter(m => m.id < 900); // ボス以外

        if (type === 'boss') {
            // ボス呼び出し (ID 999)
            // TODO: layerに応じたボス変動
            const boss = window.dbMonsters.find(m => m.id === 999);
            return [boss || allMonsters[0]];
        }

        if (type === 'elite') {
            count = 2 + Math.floor(Math.random() * 2); // 2-3体
            // TODO: 強敵フラグやステータス強化
        } else {
            // 通常バトル
            count = 1 + Math.floor(Math.random() * 3); // 1-3体
        }

        const enemies = [];
        for (let i = 0; i < count; i++) {
            const template = allMonsters[Math.floor(Math.random() * allMonsters.length)];
            enemies.push(JSON.parse(JSON.stringify(template)));
        }

        return enemies;
    },
};
