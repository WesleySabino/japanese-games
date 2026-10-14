
/* Kana catalogue and accepted readings. Reusable by kana games.
   Item shape follows spec §5.2 (Kana interface) + `alt` accepted romanizations + `confusables`. */
(function (root) {
  'use strict';
  // [romaji, hiragana, katakana, row, col, kind, alt?]
  var T = [
    ['a','あ','ア','a','a','basic'],['i','い','イ','a','i','basic'],['u','う','ウ','a','u','basic'],['e','え','エ','a','e','basic'],['o','お','オ','a','o','basic'],
    ['ka','か','カ','k','a','basic'],['ki','き','キ','k','i','basic'],['ku','く','ク','k','u','basic'],['ke','け','ケ','k','e','basic'],['ko','こ','コ','k','o','basic'],
    ['sa','さ','サ','s','a','basic'],['shi','し','シ','s','i','basic',['si']],['su','す','ス','s','u','basic'],['se','せ','セ','s','e','basic'],['so','そ','ソ','s','o','basic'],
    ['ta','た','タ','t','a','basic'],['chi','ち','チ','t','i','basic',['ti']],['tsu','つ','ツ','t','u','basic',['tu']],['te','て','テ','t','e','basic'],['to','と','ト','t','o','basic'],
    ['na','な','ナ','n','a','basic'],['ni','に','ニ','n','i','basic'],['nu','ぬ','ヌ','n','u','basic'],['ne','ね','ネ','n','e','basic'],['no','の','ノ','n','o','basic'],
    ['ha','は','ハ','h','a','basic'],['hi','ひ','ヒ','h','i','basic'],['fu','ふ','フ','h','u','basic',['hu']],['he','へ','ヘ','h','e','basic'],['ho','ほ','ホ','h','o','basic'],
    ['ma','ま','マ','m','a','basic'],['mi','み','ミ','m','i','basic'],['mu','む','ム','m','u','basic'],['me','め','メ','m','e','basic'],['mo','も','モ','m','o','basic'],
    ['ya','や','ヤ','y','a','basic'],['yu','ゆ','ユ','y','u','basic'],['yo','よ','ヨ','y','o','basic'],
    ['ra','ら','ラ','r','a','basic'],['ri','り','リ','r','i','basic'],['ru','る','ル','r','u','basic'],['re','れ','レ','r','e','basic'],['ro','ろ','ロ','r','o','basic'],
    ['wa','わ','ワ','w','a','basic'],['wo','を','ヲ','w','o','basic',['o']],['n','ん','ン','nn','-','basic',['nn']],
    ['ga','が','ガ','g','a','dakuten'],['gi','ぎ','ギ','g','i','dakuten'],['gu','ぐ','グ','g','u','dakuten'],['ge','げ','ゲ','g','e','dakuten'],['go','ご','ゴ','g','o','dakuten'],
    ['za','ざ','ザ','z','a','dakuten'],['ji','じ','ジ','z','i','dakuten',['zi']],['zu','ず','ズ','z','u','dakuten'],['ze','ぜ','ゼ','z','e','dakuten'],['zo','ぞ','ゾ','z','o','dakuten'],
    ['da','だ','ダ','d','a','dakuten'],['ji','ぢ','ヂ','d','i','dakuten',['di']],['zu','づ','ヅ','d','u','dakuten',['du']],['de','で','デ','d','e','dakuten'],['do','ど','ド','d','o','dakuten'],
    ['ba','ば','バ','b','a','dakuten'],['bi','び','ビ','b','i','dakuten'],['bu','ぶ','ブ','b','u','dakuten'],['be','べ','ベ','b','e','dakuten'],['bo','ぼ','ボ','b','o','dakuten'],
    ['pa','ぱ','パ','p','a','handakuten'],['pi','ぴ','ピ','p','i','handakuten'],['pu','ぷ','プ','p','u','handakuten'],['pe','ぺ','ペ','p','e','handakuten'],['po','ぽ','ポ','p','o','handakuten']
  ];
  var Y = [['k','き','キ','ky'],['s','し','シ','sh'],['t','ち','チ','ch'],['n','に','ニ','ny'],['h','ひ','ヒ','hy'],['m','み','ミ','my'],['r','り','リ','ry'],
           ['g','ぎ','ギ','gy'],['z','じ','ジ','j'],['b','び','ビ','by'],['p','ぴ','ピ','py']];
  var SM = [['ゃ','ャ','a'],['ゅ','ュ','u'],['ょ','ョ','o']];
  var ALTY = { sh: 'sy', ch: 'ty', j: 'zy' };
  Y.forEach(function (y) { SM.forEach(function (s) {
    var r = y[3] + s[2], alt = [];
    if (ALTY[y[3]]) alt.push(ALTY[y[3]] + s[2]);
    if (y[3] === 'j') alt.push('jy' + s[2]);
    T.push([r, y[1] + s[0], y[2] + s[1], y[0] + 'y', s[2], 'yoon', alt]);
  }); });

  // Visual confusion graph (global seed; the learner's personal confusions are added on top).
  var CONF = [
    'ぬめ','ねれわ','るろ','さち','きさ','はほま','いり','こに','あお','けは','たな','うら','つし','くへ','そん','ソンシツ','クケタ','ウワフ','コユ','アマ','ヌス','チテ','ノメ','ラヲ','シミ','ナメ','ルレ','ロコ',
    'ぎき','ぱば','ぴび','ぷぶ','ぺべ','ぽぼ','パバ','ピビ','プブ','ペベ','ポボ','じぢ','ずづ','ジヂ','ズヅ','しゃしょ','きゃきょ','しゅしょ','ちゃちょ','りゃりょ','にゃにょ'
  ];
  function splitKana(s) { // split into kana units (handles yoon pairs)
    var out = [], small = 'ゃゅょャュョ';
    for (var i = 0; i < s.length; i++) { if (small.indexOf(s[i]) >= 0 && out.length) out[out.length - 1] += s[i]; else out.push(s[i]); }
    return out;
  }
  var kana = [], byChar = {};
  T.forEach(function (t) {
    [['hiragana', t[1]], ['katakana', t[2]]].forEach(function (sc) {
      var k = { id: 'kana:' + sc[1], char: sc[1], script: sc[0], romaji: t[0], alt: t[6] || [], row: t[3], col: t[4],
                kind: t[5], pairId: 'pair:' + t[0] + (t[3] === 'd' && (t[4] === 'i' || t[4] === 'u') ? '_d' : ''), confusables: [] };
      kana.push(k); byChar[k.char] = k;
    });
  });
  CONF.forEach(function (g) {
    var units = /[ゃゅょャュョ]/.test(g) ? [g.slice(0, 2), g.slice(2)] : splitKana(g);
    units.forEach(function (a) { units.forEach(function (b) {
      if (a !== b && byChar[a] && byChar[b] && byChar[a].confusables.indexOf('kana:' + b) < 0) byChar[a].confusables.push('kana:' + b);
    }); });
  });
  // curriculum order: unlock groups (spec: one row → full gojūon → dakuten/combos), hiragana first then katakana
  var ROWS = ['a','k','s','t','n','h','m','y','r','w','nn','g','z','d','b','p','ky','sy','ty','ny','hy','my','ry','gy','zy','by','py'];
  kana.forEach(function (k) { k.order = (k.script === 'katakana' ? 100 : 0) + ROWS.indexOf(k.row); });

  // The input accepts one kana unit, including a compound such as きゃ.
  function toRomaji(symbol) { var k = byChar[String(symbol).normalize('NFC')]; return k ? k.romaji : ''; }
  function romajiVariants(symbol) { var k = byChar[String(symbol).normalize('NFC')]; return k ? [k.romaji].concat(k.alt) : []; }
  root.JPData = { kana: kana, kanaByChar: byChar, kanaById: kana.reduce(function (m, k) { m[k.id] = k; return m; }, {}),
                  toRomaji: toRomaji, romajiVariants: romajiVariants, rowsOrder: ROWS };
})(typeof window !== 'undefined' ? window : globalThis);
