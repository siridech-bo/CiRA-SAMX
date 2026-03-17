# SAM Browser Evaluation — 2026-03-17

## Test Environment
- **Platform**: Windows 11 Pro, Intel iGPU (8GB device memory)
- **Browser**: Chrome (WebGPU backend)
- **Runtime**: Transformers.js v3 + ONNX Runtime (WebGPU/WASM)
- **Image**: 663x900 construction worker scene

## Model Specifications

| | SAM 1 ViT-B | SAM 2 Hiera-Tiny | SAM 3 Tracker |
|---|---|---|---|
| **HuggingFace ID** | Xenova/sam-vit-base | onnx-community/sam2-hiera-tiny-ONNX | onnx-community/sam3-tracker-ONNX |
| **API Class** | SamModel | Sam2Model | Sam2Model |
| **Parameters** | ~93M | ~39M | — |
| **ONNX Size** | ~358MB | ~148MB | ~1.76GB |
| **Input Resolution** | — | 1024 | 1008 |
| **Precision** | fp32 | fp32 | fp32 |

## Performance Results (WebGPU, Intel iGPU)

| Metric | SAM 1 ViT-B | SAM 2 Hiera-Tiny | SAM 3 Tracker |
|---|---|---|---|
| **Model Load** | 1.9s | 1.1s | 3.7s |
| **Image Encode** | 10,609ms | 0ms (at predict) | 0ms (at predict) |
| **Decoder / Segment** | 325ms | 2,832ms | 37,580ms |
| **Total per Segment** | 325ms* | 2,832ms | 37,580ms |
| **IoU Score** | **0.9720** | 0.2620 | 0.0580 |

*SAM1 encoder runs once per image; subsequent segments only run the decoder.

## Architecture Differences

### SAM 1 (ViT-B)
- Separate encoder/decoder pipeline
- Encoder runs once per image (~10.6s), cached as embeddings
- Decoder runs per click/segment (~325ms) — very fast interactive use
- Best IoU scores for point-based prompting

### SAM 2 (Hiera-Tiny)
- Unified encode+decode per prediction
- Designed for video tracking, adapted for image segmentation
- Lower IoU on single-image point prompts (may need API tuning)
- Smaller model size (148MB vs 358MB)

### SAM 3 (Tracker)
- Largest model (1.76GB ONNX)
- Supports text/concept-based prompting (open vocabulary)
- Very slow on Intel iGPU (~37s per segment)
- Low IoU on basic point prompts — designed for concept segmentation

## Key Findings

1. **SAM 1 is best for browser-based interactive segmentation** — fast decoder, high IoU
2. **SAM 2/3 IoU scores are low** — likely needs API/point-format adjustments for image-only use
3. **SAM 3 is impractical on iGPU** — 37s per segment, needs discrete GPU
4. **All models cache in browser** — no re-download after first load
5. **WebGPU ONNX warnings are normal** — some ops fall back to CPU

## Notes
- SAM 2/3 use `Sam2Model` class from Transformers.js (tracker variant)
- SAM 1 uses `SamModel` with explicit `get_image_embeddings()` step
- Console warnings about "nodes not assigned to preferred execution providers" are expected
- Test used 2 positive points per model for comparison
