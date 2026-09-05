// 画面をまたいでPDFと表示中ページを共有するための小さなストア。
// IndexedDBはfile://で開いた場合にブラウザ側でブロックされるため使わず、
// PDF本体・現在ページとも localStorage で共有する（file://でも動作する）。
// 通常の<script>として読み込む前提。file://でも動くようグローバル名前空間に載せる。
(function (global) {
  const FILE_KEY = 'qol_pdf_data';
  const PAGE_KEY = 'qol_pdf_page';

  /** 読み込んだPDFファイルを保存し、表示ページを1に戻す */
  function savePdf(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        try {
          localStorage.setItem(FILE_KEY, reader.result);
        } catch (err) {
          reject(new Error('PDFの保存に失敗しました（ファイルサイズが大きすぎる可能性があります）'));
          return;
        }
        setPage(1);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  /** 保存済みのPDFファイル（Blob）。無ければnull */
  async function loadPdf() {
    const dataUrl = localStorage.getItem(FILE_KEY);
    if (!dataUrl) return null;
    const res = await fetch(dataUrl);
    return res.blob();
  }

  function getPage() {
    return Math.max(1, Number(localStorage.getItem(PAGE_KEY)) || 1);
  }

  function setPage(page) {
    localStorage.setItem(PAGE_KEY, String(page));
  }

  /** 別ウィンドウ/タブで開いているもう片方の画面がページを進めたら呼ばれる */
  function onPageChange(cb) {
    window.addEventListener('storage', (e) => {
      if (e.key === PAGE_KEY && e.newValue != null) cb(Number(e.newValue) || 1);
    });
  }

  global.QOL = global.QOL || {};
  global.QOL.pdfSync = { savePdf, loadPdf, getPage, setPage, onPageChange };
})(window);
