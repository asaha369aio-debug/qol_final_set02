// 画面をまたいで「全部まとめたExcel」を共有するための小さなストア。
// IndexedDBはfile://で開いた場合にブラウザ側でブロックされるため使わず、
// localStorageにdata URLとして保存する（file://でも動作する）。
// どこかの画面でExcelを読み込むとここに保存され、他の画面は起動時 or
// storageイベントで自動的に取り込んで、自分に関係あるシートだけを読む。
// 通常の<script>として読み込む前提。file://でも動くようグローバル名前空間に載せる。
(function (global) {
  const FILE_KEY = 'qol_xlsx_data';
  // storageイベントはブラウザ/タイミングによって他画面のiframeに届かないことがあるため、
  // 同一オリジンのiframe間で確実に届くBroadcastChannelでも二重に通知する。
  const channel = ('BroadcastChannel' in global) ? new BroadcastChannel('qol_xlsx_sync') : null;

  /** 読み込んだExcelファイルを保存する */
  function saveWorkbook(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        try {
          localStorage.setItem(FILE_KEY, reader.result);
        } catch (err) {
          reject(new Error('Excelの保存に失敗しました（ファイルサイズが大きすぎる可能性があります）'));
          return;
        }
        if (channel) channel.postMessage('changed');
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  /** 保存済みのExcelファイル（Blob）。無ければnull */
  async function loadWorkbook() {
    const dataUrl = localStorage.getItem(FILE_KEY);
    if (!dataUrl) return null;
    const res = await fetch(dataUrl);
    return res.blob();
  }

  /** 保存済みのExcelファイルを消す */
  function clearWorkbook() {
    localStorage.removeItem(FILE_KEY);
    if (channel) channel.postMessage('changed');
  }

  /** 別ウィンドウ/タブで開いているもう片方の画面がExcelを読み込んだら呼ばれる */
  function onWorkbookChange(cb) {
    window.addEventListener('storage', (e) => {
      if (e.key === FILE_KEY && e.newValue != null) cb();
    });
    if (channel) channel.addEventListener('message', () => cb());
  }

  global.QOL = global.QOL || {};
  global.QOL.xlsxSync = { saveWorkbook, loadWorkbook, clearWorkbook, onWorkbookChange };
})(window);
