/**
 * Download ONNX models from HuggingFace for local serving.
 * Run once: node download-models.js
 *
 * Downloads only the fp32 files needed for WebGPU backend.
 */

import { mkdirSync, existsSync, createWriteStream, statSync } from 'fs';
import { join } from 'path';

const MODELS_DIR = './models';

const MODELS = {
  // SAM 1 ViT-B
  'Xenova/sam-vit-base': [
    'config.json',
    'preprocessor_config.json',
    'onnx/vision_encoder.onnx',
    'onnx/prompt_encoder_mask_decoder.onnx',
  ],
  // SAM 2 Hiera-Tiny
  'onnx-community/sam2-hiera-tiny-ONNX': [
    'config.json',
    'preprocessor_config.json',
    'processor_config.json',
    'onnx/vision_encoder.onnx',
    'onnx/vision_encoder.onnx_data',
    'onnx/prompt_encoder_mask_decoder.onnx',
    'onnx/prompt_encoder_mask_decoder.onnx_data',
  ],
  // SAM 3 Tracker
  'onnx-community/sam3-tracker-ONNX': [
    'config.json',
    'preprocessor_config.json',
    'processor_config.json',
    'onnx/vision_encoder.onnx',
    'onnx/vision_encoder.onnx_data',
    'onnx/prompt_encoder_mask_decoder.onnx',
    'onnx/prompt_encoder_mask_decoder.onnx_data',
  ],
};

async function downloadFile(url, destPath, maxRedirects = 5) {
  const dir = destPath.substring(0, destPath.lastIndexOf('/'));
  mkdirSync(dir, { recursive: true });

  if (existsSync(destPath)) {
    const size = statSync(destPath).size;
    if (size > 0) {
      console.log(`  SKIP (exists, ${formatSize(size)}): ${destPath}`);
      return;
    }
  }

  console.log(`  GET: ${url}`);

  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);
  let downloaded = 0;

  const fileStream = createWriteStream(destPath);

  for await (const chunk of response.body) {
    fileStream.write(chunk);
    downloaded += chunk.length;
    if (totalBytes > 0) {
      const pct = ((downloaded / totalBytes) * 100).toFixed(1);
      process.stdout.write(`\r    ${formatSize(downloaded)} / ${formatSize(totalBytes)} (${pct}%)`);
    }
  }

  fileStream.end();
  await new Promise((resolve) => fileStream.on('finish', resolve));

  if (totalBytes > 0) process.stdout.write('\n');
  console.log(`    DONE: ${destPath} (${formatSize(downloaded)})`);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + 'MB';
  return (bytes / 1073741824).toFixed(2) + 'GB';
}

async function main() {
  console.log('=== SAM ONNX Model Downloader ===\n');
  console.log(`Destination: ${MODELS_DIR}\n`);

  for (const [modelId, files] of Object.entries(MODELS)) {
    console.log(`\n[${modelId}]`);
    for (const file of files) {
      const url = `https://huggingface.co/${modelId}/resolve/main/${file}`;
      const destPath = join(MODELS_DIR, modelId, file).replace(/\\/g, '/');
      try {
        await downloadFile(url, destPath);
      } catch (err) {
        console.error(`    ERROR: ${err.message}`);
      }
    }
  }

  // Verification
  console.log('\n\n=== Verification ===');
  let allOk = true;
  for (const [modelId, files] of Object.entries(MODELS)) {
    console.log(`\n[${modelId}]`);
    for (const file of files) {
      const destPath = join(MODELS_DIR, modelId, file).replace(/\\/g, '/');
      if (existsSync(destPath)) {
        const size = statSync(destPath).size;
        const ok = size > 0;
        console.log(`  ${ok ? '✓' : '✗'} ${file} (${formatSize(size)})`);
        if (!ok) allOk = false;
      } else {
        console.log(`  ✗ ${file} (MISSING)`);
        allOk = false;
      }
    }
  }

  console.log(`\n=== ${allOk ? 'All models downloaded successfully!' : 'Some files are missing — check errors above'} ===`);
  if (allOk) console.log('Restart server with: npm start');
}

main();
