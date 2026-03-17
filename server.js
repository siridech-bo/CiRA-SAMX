import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3333;
const MODELS_DIR = join(__dirname, 'models');
const hasLocalModels = existsSync(MODELS_DIR);

// COOP/COEP headers required for SharedArrayBuffer (ONNX multithreading)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Serve local models at /models/ with proper CORS + caching
// Transformers.js requests: /models/{org}/{model}/resolve/main/{file}
// Rewrite to strip /resolve/main/ and serve from flat directory
if (hasLocalModels) {
  app.use('/models', (req, res, next) => {
    // Strip /resolve/main/ or /resolve/{revision}/ from the path
    req.url = req.url.replace(/\/resolve\/[^/]+\//, '/');
    next();
  }, express.static(MODELS_DIR, {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }));
}

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log('');
  console.log('  SAM Browser Test Server');
  console.log('  ========================');
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('');
  console.log('  COOP/COEP headers: ACTIVE');
  if (hasLocalModels) {
    console.log('  Local models:     SERVING from ./models/');
  } else {
    console.log('  Local models:     NOT FOUND — run "node download-models.js" first');
    console.log('                    (falling back to HuggingFace CDN)');
  }
  console.log('');
});
