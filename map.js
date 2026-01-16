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
    generate: function(difficulty) {
        console.log("Generating Map...");
        const layers = 9; // 全9層 (0:Start - 8:Boss)
        const mapHeight = 1200;
        const nodes = [];

        // Layer 0: Start
        nodes.push(this.createNode(0, 'start', 50, 0));

        // Layer 1-7: Content
        for (let i = 1; i < layers - 1; i++) {
            const nodeCount = 2 + Math.floor(Math.random() * 3);
            const sectionWidth = 100 / nodeCount;

            for (let j = 0; j < nodeCount; j++) {
                const type = this.rollNodeType(i);
                const x = (j * sectionWidth) + (sectionWidth / 2) + (Math.random() * 10 - 5);
                nodes.push(this.createNode(i, type, x, i));
            }
        }

        // Layer 8: Boss
        nodes.push(this.createNode(layers - 1, 'boss', 50, layers - 1));

        // コネクション生成
        this.connectNodes(nodes, layers);

        Game.state.currentRun.mapData = { nodes: nodes, layers: layers, height: mapHeight };
        Game.state.currentRun.currentNodeId = null; 
        Game.state.currentRun.clearedNodes = [];
    },

    rollNodeType: function(layer) {
        const r = Math.random();
        if (layer === 1) return 'battle';
        if (layer === 4) return r < 0.5 ? 'shop' : 'rest';
        if (layer === 7) return 'rest';

        if (r < 0.55) return 'battle';
        if (r < 0.80) return 'event';
        if (r < 0.92) return 'elite';
        return 'shop';
    },

    createNode: function(layer, type, x, yIdx) {
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

    connectNodes: function(nodes, totalLayers) {
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

    link: function(parent, child) {
        if (!parent.children.includes(child.id)) parent.children.push(child.id);
        if (!child.parents.includes(parent.id)) child.parents.push(parent.id);
    },

    render: function() {
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

    handleNodeClick: function(node) {
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

        Game.state.currentRun.currentNodeId = node.id;
        Game.state.currentRun.clearedNodes.push(node.id);

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

    executeNodeEvent: function(node) {
        if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
            Game.switchScreen('screen-battle');
            // Battle.initBattle の呼び出し等は battle.js 実装後に連携
        } else {
            Game.toast(`${this.nodeTypes[node.type].label} はまだ実装されていません`, "warning");
            this.render();
        }
    }
};
