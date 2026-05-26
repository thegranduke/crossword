#!/usr/bin/env python3
"""
Export your trained Keras model for Expo WEB recognition.

Why: @tensorflow/tfjs-tflite (0.0.1-alpha.10) uses an OLD TFLite WASM runtime.
Models converted with TensorFlow 2.17+ often use FULLY_CONNECTED v12, which that
runtime cannot load. TensorFlow.js format works on web with current TF versions.

Run in Colab or locally (same env you used to train):

  pip install tensorflow tensorflowjs

  python scripts/export_model_for_web.py --keras path/to/model.keras

Outputs:
  assets/models/character_classifier/model.json  (+ weight shards)
  public/character_classifier.tflite          (optional, for native later)

Then restart: npx expo start --web --clear
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--keras",
        required=True,
        help="Path to .keras / SavedModel / .h5 weights",
    )
    parser.add_argument(
        "--out-dir",
        default="assets/models/character_classifier",
        help="TF.js model output directory",
    )
    parser.add_argument(
        "--also-tflite",
        action="store_true",
        help="Also write public/character_classifier.tflite (may still fail on web TFLite WASM)",
    )
    args = parser.parse_args()

    import tensorflow as tf

    print("TensorFlow", tf.__version__)

    keras_path = Path(args.keras)
    if not keras_path.exists():
        raise SystemExit(f"Model not found: {keras_path}")

    model = tf.keras.models.load_model(str(keras_path))
    model.summary()

    out_dir = Path(args.out_dir)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    import tensorflowjs as tfjs

    tfjs.converters.save_keras_model(model, str(out_dir))
    print(f"Wrote TF.js model to {out_dir}/")

    public_dir = Path("public/models/character_classifier")
    if public_dir.exists():
        shutil.rmtree(public_dir)
    shutil.copytree(out_dir, public_dir)
    print(f"Copied to {public_dir}/ (Expo web serves this at /models/character_classifier/model.json)")

    if args.also_tflite:
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
        tflite_bytes = converter.convert()
        public_tflite = Path("public/character_classifier.tflite")
        assets_tflite = Path("assets/models/character_classifier.tflite")
        public_tflite.write_bytes(tflite_bytes)
        assets_tflite.write_bytes(tflite_bytes)
        print(f"Wrote {public_tflite} ({len(tflite_bytes)} bytes)")
        print("  -> Note: web TFLite WASM may still fail on TF 2.17+ ops; use TF.js on web.")


if __name__ == "__main__":
    main()
