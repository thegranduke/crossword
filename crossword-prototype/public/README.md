# Static files for Expo web

## ML recognition on web (important)

Your `.tflite` file was likely exported with **TensorFlow 2.17+**. The browser package `@tensorflow/tfjs-tflite` uses an **old** WASM runtime and **cannot** load models with `FULLY_CONNECTED` version 12. You will see console errors and the app falls back to **$1 template matching** (poor accuracy).

### Fix: export TensorFlow.js format (recommended)

In **Google Colab** (or locally), from your **original Keras model** (not the broken `.tflite`):

```bash
pip install tensorflow tensorflowjs

python scripts/export_model_for_web.py --keras /path/to/your_model.keras
```

Then copy the output folder into this project:

```text
public/models/character_classifier/
  model.json
  group1-shard1of1.bin   (names may vary)
```

Restart:

```bash
npx expo start --web --clear
```

The drawing panel should show **ML (TensorFlow.js)** in green. Predictions will show **(ML)** in the footer.

### TFLite file (optional / native)

`character_classifier.tflite` in `public/` is kept for future **iOS/Android** (`react-native-fast-tflite`). It may still fail on web — that is expected.

### WASM runtime (fixed 404)

`public/tfjs-wasm/` is copied from `node_modules` on `npm install` (`postinstall` script). Do not delete — fixes `tflite_web_api_cc_simd.js` 404.

## Env vars

| Variable | Meaning |
|----------|---------|
| `EXPO_PUBLIC_TFJS_MODEL_URL` | Override URL to `model.json` |
| `EXPO_PUBLIC_TFLITE_MODEL_URL` | Override `.tflite` URL |
| `EXPO_PUBLIC_TFLITE_INVERT=1` | Black ink on white (if training used that) |
| `EXPO_PUBLIC_TFLITE_WEB=0` | Force $1 recognizer only |
| `EXPO_PUBLIC_TFLITE_CLASS_OFFSET` | Class 0 letter (default `65` = `A`) |
