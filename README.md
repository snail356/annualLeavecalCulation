# Annual Leave Calculation — Vite + TypeScript (scaffold)

This project was migrated to a Vite + TypeScript dev setup while keeping the existing vanilla JS app.

Quick start

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

Notes
- The project uses Vite + TypeScript as the build/dev setup, while UI behavior remains legacy DOM-driven.
- Legacy runtime behavior is handled by `src/legacy.ts` (loaded from `src/main.ts`) to preserve original logic and screen rendering.
- Static assets (e.g. `data/forms.json`, `data/annual_leave.xlsx`) are left in the `data/` folder and are available under `/data/...` in dev and build.
