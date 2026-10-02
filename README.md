# 星界覇王 - STELLAR DOMINION

GitHub Pagesだけで動く、スマホ向けインクリメンタル・ストラテジーゲームです。ビルド不要・外部API不要・外部CDN不要（フォントも同梱）。

## ゲーム要素
- 4資源のリアルタイム自動生産と指数的な成長
- 6種の施設強化、3兵種の艦隊編成
- 兵種比率が効く6段階の星域征服
- 連勝補正、ミッション、実績、恒久強化付きプレステージ
- 超越するたびに全敵戦力が +10%（線形、10回で2倍）
- 最大8時間のオフライン進行とLocalStorage自動保存
- PWA manifest + Service Workerによるホーム画面追加・オフライン起動

## ビジュアル / 操作
- 初回アクセス時のみ世界観を紹介するプロローグ画面を表示（セーブデータがあれば表示しない。「はじめる」を押すまで進行・保存しない）
- 施設はレベル帯（設計図 → TIER I〜III）で外観が進化するアイソメトリックSVGアート
- 艦隊は保有数に応じて編隊で表示、星域は種類ごとに描き分けた惑星
- 資源が獲得元からHUDへ飛ぶ演出、レベルアップ/建造エフェクト、出撃シネマティック（タップでスキップ）
- 強化・建造ボタンは長押しで連続実行、強化可能な施設には ↑ バッジ、不足時は準備完了までの残り時間を表示
- WebAudioによる合成効果音、バイブレーション、Canvasパーティクル（アイドル時は停止）
- DOMは一度だけ構築して差分更新（毎フレームの再描画なし）、アニメーションはtransform/opacity中心
- iPhone safe-area / 小画面 / reduced-motion（設定からも切替可）対応

## 構成
| ファイル | 役割 |
| --- | --- |
| `js/game-core.js` | ゲームロジック（バランス・ルール） |
| `js/app.js` | UI・入力・演出 |
| `js/view-cache.js` | 生産・戦力・コスト・次回強化の試算を依存値が変わるまで再利用 |
| `js/art.js` | 施設・艦船・惑星・アイコンの手続き的SVGアート |
| `js/fx.js` | パーティクルと資源フライ演出 |
| `js/audio.js` | 合成効果音 |
| `assets/fonts/` | 同梱フォント（Chakra Petch / M PLUS 1、SIL OFL） |

日本語の見出しフォントはゲーム内で使う文字だけにサブセット化しています。UIに新しい日本語テキストを追加したら再生成してください。

```bash
node tools/build-fonts.mjs
```

## テスト
```bash
npm test
```

軽量化の方針と品質確認の手順は [docs/performance-plan.md](docs/performance-plan.md) にまとめています。生産計算とUI試算をキャッシュし、通常のフレームレートと演出を維持します。

## GitHub Pages
`.github/workflows/pages.yml` を同梱しています。Repository Settings → Pages → Source を `GitHub Actions` にすると、mainへのpushで自動デプロイされます。
