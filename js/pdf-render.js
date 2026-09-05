// pdf.js（js/vendor/pdfjs/pdf.min.js）を使ってPDFページをcanvasに直接描画するヘルパー。
// ブラウザ内蔵PDFビューア(iframe)と違い、スクロールが起こらず・ページ切り替えも
// 読み込み済みの文書から即座に描画できるので速い。
// 通常の<script>として読み込む前提。file://でも動くようグローバル名前空間に載せる。
(function (global) {
  let workerConfigured = false;
  function ensureWorker() {
    if (workerConfigured) return;
    global.pdfjsLib.GlobalWorkerOptions.workerSrc = '../js/vendor/pdfjs/pdf.worker.min.js';
    workerConfigured = true;
  }

  /** PDFファイル（Blob）を読み込み、PDFDocumentProxyを返す */
  async function loadDocument(blob) {
    ensureWorker();
    const data = await blob.arrayBuffer();
    return global.pdfjsLib.getDocument({ data }).promise;
  }

  const renderTasks = new WeakMap();

  /** 指定ページをcanvasいっぱい（アスペクト比維持）に描画する。実際に描画したページ番号を返す */
  async function renderPage(pdfDoc, pageNum, canvas) {
    const pageIndex = Math.min(Math.max(1, pageNum), pdfDoc.numPages);
    const pdfPage = await pdfDoc.getPage(pageIndex);

    const rect = canvas.parentElement.getBoundingClientRect();
    const base = pdfPage.getViewport({ scale: 1 });
    const scale = Math.max(0.1, Math.min(rect.width / base.width, rect.height / base.height));
    const dpr = global.devicePixelRatio || 1;
    const viewport = pdfPage.getViewport({ scale: scale * dpr });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${scale * base.width}px`;
    canvas.style.height = `${scale * base.height}px`;

    const prevTask = renderTasks.get(canvas);
    if (prevTask) prevTask.cancel();

    const task = pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport });
    renderTasks.set(canvas, task);
    try {
      await task.promise;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') throw err;
    }
    return pageIndex;
  }

  global.QOL = global.QOL || {};
  global.QOL.pdfRender = { loadDocument, renderPage };
})(window);
