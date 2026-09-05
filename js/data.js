// 各画面のサンプルデータ。実運用時はここをAPI/JSON差し替えにする想定。
// 通常の<script>として読み込む前提。file://でも動くようグローバル名前空間に載せる。
(function (global) {

const rouletteItems = [
  { label: 'ビジュアルクイズ', color: '#ff5c8a' },
  { label: 'テキストカード', color: '#4aa8ff' },
  { label: '歌詞問題', color: '#3ddc97' },
  { label: '大喜利', color: '#ffd54a' },
  { label: 'すごろく', color: '#b07cff' },
  { label: 'チャンス!', color: '#ff8a3d' },
];

const visualQuizzes = [
  {
    image: 'https://placehold.co/900x520/1b2060/ffd54a?text=Q1',
    question: 'この写真に写っているものは何でしょう？',
    choices: ['ネコ', 'イヌ', 'ハムスター', 'ウサギ'],
    answer: 0,
    hint: '「にゃー」と鳴きます',
  },
  {
    image: 'https://placehold.co/900x520/2a1b60/3ddc97?text=Q2',
    question: 'モザイクの向こうにある建物はどれ？',
    choices: ['東京タワー', 'スカイツリー', '通天閣', '名古屋テレビ塔'],
    answer: 1,
    hint: '高さは634m',
  },
  {
    image: 'https://placehold.co/900x520/601b3a/ff5c8a?text=Q3',
    question: 'このシルエットの動物は？',
    choices: ['キリン', 'ゾウ', 'シマウマ', 'カバ'],
    answer: 0,
    hint: '首がとても長い',
  },
];

const textCards = [
  { category: '雑学', question: '日本で一番面積が大きい都道府県は？', answer: '北海道' },
  { category: '歴史', question: '江戸幕府を開いた人物は？', answer: '徳川家康' },
  { category: '理科', question: '水の化学式は？', answer: 'H2O' },
  { category: 'ことば', question: '「五里霧中」の読み方は？', answer: 'ごりむちゅう' },
];

const lyricsCards = [
  {
    title: '楽曲A',
    artist: 'アーティストA',
    // ○ の部分が伏せ字になる
    lines: ['きらきら光る', 'おそらの{ほし}よ'],
    answer: 'ほし',
  },
  {
    title: '楽曲B',
    artist: 'アーティストB',
    lines: ['もういくつ寝ると', '{おしょうがつ}'],
    answer: 'おしょうがつ',
  },
  {
    title: '楽曲C',
    artist: 'アーティストC',
    lines: ['ふるさとの{やま}に', '向かひて言ふことなし'],
    answer: 'やま',
  },
];

const ogiriThemes = [
  'こんな運動会は嫌だ。どんな運動会？',
  '写真で一言',
  '最強にダサいヒーローの必殺技名は？',
  '売れないコンビニの新商品、その名前は？',
  '宇宙人が地球に来て最初に言った一言は？',
];

const players = [
  { name: 'プレイヤー1', color: '#ff5c8a' },
  { name: 'プレイヤー2', color: '#4aa8ff' },
  { name: 'プレイヤー3', color: '#3ddc97' },
  { name: 'プレイヤー4', color: '#ffd54a' },
  { name: 'プレイヤー5', color: '#b07cff' },
  { name: 'プレイヤー6', color: '#ff8a3d' },
  { name: 'プレイヤー7', color: '#4ae0d0' },
  { name: 'プレイヤー8', color: '#f06292' },
];

// すごろくマス。イベントは無く、番号(1〜45)どおりに進むだけのシンプルな盤面。
const sugorokuCells = [
  { no: 0, label: 'スタート', type: 'start' },
  ...Array.from({ length: 45 }, (_, i) => ({ no: i + 1, label: '', type: 'normal' })),
  { no: 46, label: 'ゴール', type: 'goal' },
];

// 用意された盤面画像（assets/sugoroku-board.jpg, 1280x720）の上に駒を重ねるための座標。
// 各マスの中心をその画像のピクセル座標で指定し、sugoroku.html側で%に変換して配置する。
const sugorokuBoard = {
  image: 'assets/sugoroku-board.jpg',
  width: 1280,
  height: 720,
  start: { x: 133, y: 583 },
  goal: { x: 1180, y: 115 },
  // 黄→緑→青→紫→赤の順。xStart→xEndへマス数ぶん均等割りして座標を作る
  rows: [
    { count: 10, y: 632, xStart: 261,  xEnd: 1112 }, // 1-10
    { count: 9,  y: 500, xStart: 1108, xEnd: 343  }, // 11-19
    { count: 10, y: 380, xStart: 263,  xEnd: 1122 }, // 20-29
    { count: 8,  y: 248, xStart: 1032, xEnd: 367  }, // 30-37
    { count: 8,  y: 108, xStart: 394,  xEnd: 1057 }, // 38-45
  ],
};

global.QOL = global.QOL || {};
global.QOL.data = {
  rouletteItems, visualQuizzes, textCards, lyricsCards,
  ogiriThemes, players, sugorokuCells, sugorokuBoard,
};
})(window);
