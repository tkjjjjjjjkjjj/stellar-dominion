# 星界覇王 - STELLAR DOMINION

GitHub Pagesだけで動く、スマホ向けインクリメンタル・ストラテジーゲームです。ビルド不要・外部API不要・外部CDN不要。

## ゲーム要素
- 4資源のリアルタイム自動生産と指数的な成長
- 6種の施設強化、3兵種の艦隊編成
- 兵種比率が効く6段階の星域征服
- 連勝補正、ミッション、実績、恒久強化付きプレステージ
- 最大8時間のオフライン進行とLocalStorage自動保存
- WebAudio効果音、バイブレーション、Canvasパーティクル
- PWA manifest + Service Workerによるホーム画面追加・オフライン起動
- iPhone safe-area / 小画面 / reduced-motion対応

## テスト
```bash
npm test
```

## GitHub Pages
`.github/workflows/pages.yml` を同梱しています。Repository Settings → Pages → Source を `GitHub Actions` にすると、mainへのpushで自動デプロイされます。
