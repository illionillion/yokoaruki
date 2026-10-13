# よこあるき

カニが道路を渡るゲーム。車の下をくぐり、向かってくるタイヤを避ける。名前は仮で、蟹の横歩きと道路の横断を掛けている。

いまのリポジトリは Vite + React + TypeScript の土台。描画とゲーム本体はまだない。作りたい範囲は [docs/mvp.md](docs/mvp.md)。

## 開発

```bash
pnpm install
pnpm dev
```

http://localhost:5173 を開く。

## Scripts

| Command              | Description           |
| -------------------- | --------------------- |
| `pnpm dev`           | 開発サーバー起動      |
| `pnpm build`         | 本番ビルド            |
| `pnpm preview`       | ビルド結果の確認      |
| `pnpm lint`          | ESLint                |
| `pnpm lint:fix`      | ESLint（自動修正）    |
| `pnpm type-check`    | TypeScript 型チェック |
| `pnpm format`        | Prettier で整形       |
| `pnpm format:check`  | Prettier チェック     |
| `pnpm test`          | Vitest（watch）       |
| `pnpm test:run`      | Vitest（一回実行）    |
| `pnpm test:coverage` | Vitest + coverage     |

## Development tooling

- **Lint / Format**: ESLint + Prettier
- **Test**: Vitest + Testing Library
- **Git hooks**: lefthook（pre-commit / commit-msg）
- **Commit message**: Conventional Commits（commitlint）
- **CI**: GitHub Actions（`.github/workflows/ci.yml`）
