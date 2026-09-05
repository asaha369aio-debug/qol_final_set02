// 依存ライブラリ無しの最小 xlsx リーダー。
// xlsx は ZIP なので、中央ディレクトリを読んで必要な XML だけ取り出す。
// 解凍はブラウザ標準の DecompressionStream('deflate-raw') を使う。
// 通常の<script>として読み込む前提。file://でも動くようグローバル名前空間に載せる。
(function (global) {

const SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function findEocd(view) {
  // EOCD(0x06054b50) はファイル末尾付近にある（コメント最大64KB）
  const start = Math.max(0, view.byteLength - 65558);
  for (let i = view.byteLength - 22; i >= start; i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  throw new Error('ZIP形式として読めません（xlsxファイルを指定してください）');
}

async function inflate(bytes, method) {
  if (method === 0) return bytes;
  if (method !== 8) throw new Error(`未対応の圧縮方式: ${method}`);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** ArrayBuffer → { ファイル名: Uint8Array } */
async function unzip(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const eocd = findEocd(view);
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);

  const files = {};
  const decoder = new TextDecoder();

  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));

    const lNameLen = view.getUint16(localOffset + 26, true);
    const lExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;

    files[name] = await inflate(bytes.subarray(dataStart, dataStart + compSize), method);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const parseXml = (bytes) =>
  new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');

/** "B3" → { col: 1, row: 2 }（0始まり） */
function refToIndex(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col: col - 1, row: Number(m[2]) - 1 };
}

/** シート名からワークシートXMLのファイルパスを探す（見つからなければnull） */
function findSheetFileByName(files, sheetNamePattern) {
  if (!sheetNamePattern || !files['xl/workbook.xml'] || !files['xl/_rels/workbook.xml.rels']) return null;

  const wbDoc = parseXml(files['xl/workbook.xml']);
  const sheetEl = [...wbDoc.getElementsByTagNameNS(SHEET_NS, 'sheet')]
    .find((s) => sheetNamePattern.test(s.getAttribute('name') || ''));
  if (!sheetEl) return null;

  const rId = sheetEl.getAttributeNS(REL_NS, 'id') || sheetEl.getAttribute('r:id');
  if (!rId) return null;

  const relsDoc = parseXml(files['xl/_rels/workbook.xml.rels']);
  const rel = [...relsDoc.getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === rId);
  const target = rel?.getAttribute('Target');
  if (!target) return null;

  const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  return files[path] ? path : null;
}

/**
 * xlsxをシートの二次元配列（文字列）で返す。
 * sheetNamePatternを指定すると、その名前にマッチするシートを優先して読む
 * （見つからなければ従来どおり1枚目のシートにフォールバックする）。
 * @param {File|Blob|ArrayBuffer} input
 * @param {RegExp} [sheetNamePattern]
 */
async function readSheet(input, sheetNamePattern) {
  const buffer = input instanceof ArrayBuffer ? input : await input.arrayBuffer();
  const files = await unzip(buffer);

  // <rPh>（ふりがな読み）配下の<t>かどうかを、名前空間を気にせず親をたどって判定する
  function isInsideRuby(node) {
    for (let p = node.parentNode; p; p = p.parentNode) {
      if (p.localName === 'rPh') return true;
    }
    return false;
  }

  // 共有文字列
  // <rPh>はふりがな（フリガナ読み）の別要素で、本文とは別に<t>を持つ。
  // 単純に全<t>を拾うと「全員」+「ゼンイン」のように本文とふりがなが連結されてしまうため除外する。
  const shared = [];
  if (files['xl/sharedStrings.xml']) {
    const doc = parseXml(files['xl/sharedStrings.xml']);
    for (const si of doc.getElementsByTagNameNS(SHEET_NS, 'si')) {
      const texts = [...si.getElementsByTagNameNS(SHEET_NS, 't')]
        .filter((t) => !isInsideRuby(t))
        .map((t) => t.textContent);
      shared.push(texts.join(''));
    }
  }

  const sheetName = findSheetFileByName(files, sheetNamePattern) ?? Object.keys(files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort()[0];
  if (!sheetName) throw new Error('シートが見つかりません');

  const doc = parseXml(files[sheetName]);
  const rows = [];

  for (const c of doc.getElementsByTagNameNS(SHEET_NS, 'c')) {
    const pos = refToIndex(c.getAttribute('r') || '');
    if (!pos) continue;

    const type = c.getAttribute('t');
    let value = '';
    if (type === 's') {
      const v = c.getElementsByTagNameNS(SHEET_NS, 'v')[0];
      value = v ? shared[Number(v.textContent)] ?? '' : '';
    } else if (type === 'inlineStr') {
      value = [...c.getElementsByTagNameNS(SHEET_NS, 't')].map((t) => t.textContent).join('');
    } else {
      const v = c.getElementsByTagNameNS(SHEET_NS, 'v');
      value = v.length ? v[0].textContent : '';
    }

    (rows[pos.row] ??= [])[pos.col] = value;
  }

  return rows.map((r) => [...(r ?? [])].map((v) => v ?? ''));
}

/**
 * A列=番号 / B列=問題 / C列=答え の想定でカードデータに変換する。
 * 1行目がヘッダー（「問題」「答え」等）の場合は読み飛ばす。
 */
function rowsToCards(rows) {
  const cards = [];
  rows.forEach((row, i) => {
    const [no = '', question = '', answer = ''] = row;
    if (!question.trim()) return;
    if (i === 0 && /問題|question/i.test(question) && /答|answer/i.test(answer)) return; // ヘッダー行
    cards.push({ no: String(no).trim() || String(cards.length + 1), question, answer });
  });
  return cards;
}

global.QOL = global.QOL || {};
global.QOL.xlsxLite = { readSheet, rowsToCards };
})(window);
