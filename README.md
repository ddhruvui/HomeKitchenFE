# Home Kitchen — web app

React + Vite. The spec is [../PLANNING.md](../PLANNING.md); the API it talks to is in `../HomeKitchenBE`.

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api to the backend on :3000
npm test         # vitest
npm run build    # typecheck + production build into dist/
```

`VITE_API_URL` is empty in development (the Vite proxy handles it) and set to the backend's URL on Vercel.

`src/lib/types.ts` and `src/lib/format.ts` are a small, deliberate mirror of the backend's `shared` package — shapes and a fraction formatter, nothing that computes. All arithmetic comes from the API.
