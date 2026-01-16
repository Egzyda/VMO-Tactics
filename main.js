/**
 * VMO Tactics - Core Game Engine
 * Handles Initialization, Screen Management, and UI Systems
 */

const Game = {
  state: {
    currentScreen: 'screen-title',
    player: {
      gold: 0,
      party: [],
      inventory: []
    },
    currentRun: null
  },
  
  // 初期化処理
  init: function() {
    console.log("Initializing VMO Tactics...");
    
    // データの整合性チェック
    if (typeof window.dbMonsters === 'undefined' || typeof window.dbMoves === 'undefined') {
      this.toast("データファイルの読み込みに失敗しました", "error");
      return;
    }
    
    console.log(`Loaded ${window.dbMonsters.length} Monsters and ${Object.keys(window.dbMoves).length} Moves.`);
    this.switchScreen('screen-title');
  },
  
  // --- Screen Management ---
  switchScreen: function(screenId) {
    UI.switchScreen(screenId);
  },
  
  // --- Game Logic Stubs ---
  
  startNewRun: function() {
    // プレイヤー状態リセット
    this.state.player = { gold: 100, party: [], inventory: [] };
    
    // デッキ選択画面の描画
    UI.renderStarterDecks(StarterDecks, (deckId) => this.confirmStarter(deckId));
    this.switchScreen('screen-starter');
  },
  
  confirmStarter: function(deckId) {
    const deck = StarterDecks.find(d => d.id === deckId);
    if (!deck) return;
    
    // パーティ生成
    this.state.player.party = deck.monsters.map(id => this.createMonsterInstance(id));
    
    // ラン情報の初期化
    this.state.currentRun = {
      layer: 1,
      nodeStep: 0,
      difficulty: 'normal',
      mapSeed: Date.now()
    };
    
    this.toast(`${deck.name} で冒険を開始します！`, "success");
    this.switchScreen('screen-map');
    
    // マップ生成と描画
    MapSystem.generate(this.state.currentRun.difficulty);
    MapSystem.render();
    UI.updatePartyView(this.state.player);
  },
  
  createMonsterInstance: function(id, level = 1) {
    const data = window.dbMonsters.find(m => m.id === id);
    if (!data) return null;
    
    // 初期スキル：技リストの最初の2つを習得済みとする
    const initialSkills = [];
    if (data.moves && data.moves.length > 0) {
      // 最大2つまで習得
      for (let i = 0; i < Math.min(2, data.moves.length); i++) {
        const moveName = data.moves[i];
        if (window.dbMoves[moveName]) {
          // 技データにID(名前)を付与して格納
          initialSkills.push({ ...window.dbMoves[moveName], id: moveName });
        }
      }
    }
    
    return {
      ...JSON.parse(JSON.stringify(data)),
      uid: Date.now() + Math.random().toString(36).substr(2, 9),
      level: level,
      exp: 0,
      currentHp: data.stats.hp,
      maxHp: data.stats.hp,
      skills: initialSkills,
      equipment: [] // 装備スロット初期化
    };
  },
  
  showSettings: function() {
    UI.showModal({
      title: "設定",
      content: "音量設定などの項目がここに表示されます。",
      actions: [
        { label: "閉じる", onClick: () => UI.closeModal() }
      ]
    });
  },
  
  showCodex: function() {
    UI.showToast("図鑑機能はまだ実装されていません。", "warning");
  },
  
  openSystemMenu: function() {
    UI.showModal({
      title: "システムメニュー",
      content: "ゲームを中断しますか？",
      actions: [
        {
          label: "タイトルに戻る",
          onClick: () => {
            UI.closeModal();
            Game.switchScreen('screen-title');
          }
        },
        { label: "キャンセル", onClick: () => UI.closeModal() }
      ]
    });
  },
  
  // UIラッパー
  modal: function(options) {
    UI.showModal(options);
  },
  
  closeModal: function() {
    UI.closeModal();
  },
  
  toast: function(message, type = '') {
    UI.showToast(message, type);
  },
  
  // パーティ更新
  updatePartyView: function() {
    UI.updatePartyView(this.state.player);
  }
};



// Window Load Event
window.onload = function() {
  Game.init();
};


// スターターデッキ定義
const StarterDecks = [
  { id: "balance", name: "バランス編成", monsters: [1, 3, 5], desc: "火・水・草の基本セット。攻守のバランスが良い初心者向け。" },
  { id: "fire", name: "炎速攻", monsters: [1, 2, 11], desc: "攻撃的な炎属性パーティ。やられる前に焼き尽くす。" },
  { id: "defense", name: "鉄壁防衛", monsters: [3, 40, 20], desc: "防御力が高いモンスター編成。確実に耐えて反撃する。" }
];