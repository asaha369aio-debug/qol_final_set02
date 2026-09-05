// 全画面共通のユーティリティ。
// 通常の<script>（type="module"ではない）として読み込む前提。
// file:// で直接開いても動くよう、ES modulesは使わずグローバル名前空間に載せる。
(function (global) {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const randInt = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[randInt(arr.length)];

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * 画面タイトルを設定し、左上3色ドット＋中央タイトルのウィンドウ風ヘッダーをbody先頭に差し込む。
   * サジェスト画面のように独自の .header-row を持つ画面では二重に出さないよう何もしない。
   */
  function mountTopbar(title) {
    document.title = title;
    if (document.querySelector('.header-row')) return null;

    const header = document.createElement('div');
    header.className = 'window-header';

    const dots = document.createElement('div');
    dots.className = 'dots';
    dots.innerHTML = '<span class="dot red"></span><span class="dot yellow"></span><span class="dot blue"></span>';

    const h1 = document.createElement('h1');
    h1.className = 'title';
    h1.textContent = title;

    header.append(dots, h1);
    document.body.prepend(header);
    return header;
  }

  /** カウントダウンタイマー。要素に残り秒を描画する */
  function createTimer(el, { seconds = 30, onEnd } = {}) {
    let remain = seconds;
    let id = null;

    const render = () => {
      el.textContent = remain.toFixed(0);
      el.classList.toggle('danger', remain <= 5);
    };

    const stop = () => {
      clearInterval(id);
      id = null;
    };

    render();
    return {
      start() {
        if (id) return;
        id = setInterval(() => {
          remain = Math.max(0, remain - 1);
          render();
          if (remain === 0) {
            stop();
            onEnd?.();
          }
        }, 1000);
      },
      stop,
      reset(sec = seconds) {
        stop();
        remain = sec;
        render();
      },
      get remain() { return remain; },
      get running() { return id !== null; },
    };
  }

  /** スペースキーなどのショートカット登録 */
  function onKey(map) {
    window.addEventListener('keydown', (e) => {
      const fn = map[e.key];
      if (!fn) return;
      e.preventDefault();
      fn(e);
    });
  }

  global.QOL = Object.assign(global.QOL || {}, {
    $, $$, clamp, randInt, pick, shuffle, mountTopbar, createTimer, onKey,
  });
})(window);
