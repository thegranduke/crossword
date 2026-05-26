#!/usr/bin/env python3
"""
Convert character_classifier.tflite → TF.js layers model.

Architecture (detected from flatbuffer):
  Input (1,28,28,1) → Conv2D(16,3) → MaxPool2D → Conv2D(32,3) → MaxPool2D
  → Flatten → Dense(64,relu) → Dense(26) → Softmax output

Run:
  /dev/shm/tfjs-venv/bin/python3 scripts/tflite_to_tfjs.py

Writes public/models/character_classifier/model.json + group1-shard1of1.bin
"""

from __future__ import annotations
import json
import struct
import sys
from pathlib import Path

import numpy as np

TFLITE_PATH = Path("assets/models/character_classifier.tflite")
OUT_DIR = Path("public/models/character_classifier")

# ---------------------------------------------------------------------------
# Suppress TF log noise
import os; os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import warnings; warnings.filterwarnings("ignore")

import tensorflow as tf

def get_tensor_data(interp: tf.lite.Interpreter, idx: int) -> np.ndarray:
    """Return tensor as float32 (dequantize int8 if needed)."""
    details = interp.get_tensor_details()[idx]
    raw = interp.get_tensor(idx)
    q = details.get("quantization_parameters", {})
    scales = q.get("scales", np.array([]))
    zp     = q.get("zero_points", np.array([]))
    if raw.dtype == np.int8 and len(scales) > 0:
        # per-channel or per-tensor dequantization
        if len(scales) > 1:
            # per-channel: axis is typically 0 for CONV, might be 0 for FC
            axis = q.get("quantized_dimension", 0)
            shape = [1] * raw.ndim
            shape[axis] = -1
            raw = (raw.astype(np.float32) - zp.reshape(shape)) * scales.reshape(shape)
        else:
            raw = (raw.astype(np.float32) - float(zp[0])) * float(scales[0])
    return raw.astype(np.float32)

def main() -> None:
    print(f"Loading {TFLITE_PATH}")
    interp = tf.lite.Interpreter(model_path=str(TFLITE_PATH))
    interp.allocate_tensors()

    in_d  = interp.get_input_details()
    out_d = interp.get_output_details()
    all_t = interp.get_tensor_details()
    print(f"Input:  {in_d[0]['shape']}  Output: {out_d[0]['shape']}")

    # ------------------------------------------------------------------
    # Extract named tensors by shape/index (see architecture above)
    # Tensor layout from inspection:
    #  [1]  bias  Conv1   shape=[16]
    #  [2]  kernel Conv1  shape=[16,3,3,1]  (OHWI layout in TFLite)
    #  [5]  scalar reshape constant
    #  [6]  bias  Conv2   shape=[32]
    #  [7]  bias  Dense1  shape=[64]
    #  [8]  bias  Dense2  shape=[26]
    #  [9]  kernel Conv2  shape=[32,3,3,16]  int8
    # [10]  kernel Dense2 shape=[26,64]       int8
    # [11]  kernel Dense1 shape=[64,800]      int8
    # ------------------------------------------------------------------

    def t(idx: int) -> np.ndarray:
        return get_tensor_data(interp, idx)

    # Conv1 weights: TFLite OHWI [16,3,3,1] → TF.js HWIO [3,3,1,16]
    conv1_k = np.transpose(t(2), (1, 2, 3, 0))
    conv1_b = t(1)
    print(f"Conv1 kernel {conv1_k.shape}  bias {conv1_b.shape}")

    # Conv2 weights: TFLite OHWI [32,3,3,16] → TF.js HWIO [3,3,16,32]
    # t(7) shape=[32] is Conv2 bias; t(6) shape=[64] is Dense1 bias
    conv2_k = np.transpose(t(9), (1, 2, 3, 0))
    conv2_b = t(7)
    print(f"Conv2 kernel {conv2_k.shape}  bias {conv2_b.shape}")

    # Dense1: TFLite [64,800] → TF.js [800,64]  (transpose)
    dense1_k = np.transpose(t(11), (1, 0))
    dense1_b = t(6)
    print(f"Dense1 kernel {dense1_k.shape}  bias {dense1_b.shape}")

    # Dense2: TFLite [26,64] → TF.js [64,26]  (transpose)
    dense2_k = np.transpose(t(10), (1, 0))
    dense2_b = t(8)
    print(f"Dense2 kernel {dense2_k.shape}  bias {dense2_b.shape}")

    # ------------------------------------------------------------------
    # Build weight binary (float32 little-endian, concatenated)
    # ------------------------------------------------------------------
    weight_arrays = [
        conv1_k, conv1_b,
        conv2_k, conv2_b,
        dense1_k, dense1_b,
        dense2_k, dense2_b,
    ]
    weight_bytes = b"".join(arr.flatten().astype("<f4").tobytes() for arr in weight_arrays)
    total_floats = sum(a.size for a in weight_arrays)
    print(f"\nTotal weight bytes: {len(weight_bytes)}  ({total_floats} floats)")

    # ------------------------------------------------------------------
    # Build TF.js weight manifest entries
    # ------------------------------------------------------------------
    offset = 0
    weight_specs: list[dict] = []
    names = [
        "conv2d/kernel", "conv2d/bias",
        "conv2d_1/kernel", "conv2d_1/bias",
        "dense/kernel", "dense/bias",
        "dense_1/kernel", "dense_1/bias",
    ]
    for name, arr in zip(names, weight_arrays):
        weight_specs.append({
            "name": name,
            "shape": list(arr.shape),
            "dtype": "float32",
            "byteOffset": offset,
            "byteLength": arr.nbytes,
        })
        offset += arr.nbytes

    # ------------------------------------------------------------------
    # Build model.json (TF.js layers model format)
    # ------------------------------------------------------------------
    model_json = {
        "modelTopology": {
            "class_name": "Sequential",
            "config": {
                "name": "character_classifier",
                "layers": [
                    {
                        "class_name": "InputLayer",
                        "config": {
                            "batch_input_shape": [None, 28, 28, 1],
                            "dtype": "float32",
                            "name": "input_1",
                        },
                    },
                    {
                        "class_name": "Conv2D",
                        "config": {
                            "name": "conv2d",
                            "filters": 16,
                            "kernel_size": [3, 3],
                            "strides": [1, 1],
                            "padding": "valid",
                            "activation": "relu",
                            "use_bias": True,
                            "data_format": "channels_last",
                        },
                    },
                    {
                        "class_name": "MaxPooling2D",
                        "config": {
                            "name": "max_pooling2d",
                            "pool_size": [2, 2],
                            "strides": [2, 2],
                            "padding": "valid",
                            "data_format": "channels_last",
                        },
                    },
                    {
                        "class_name": "Conv2D",
                        "config": {
                            "name": "conv2d_1",
                            "filters": 32,
                            "kernel_size": [3, 3],
                            "strides": [1, 1],
                            "padding": "valid",
                            "activation": "relu",
                            "use_bias": True,
                            "data_format": "channels_last",
                        },
                    },
                    {
                        "class_name": "MaxPooling2D",
                        "config": {
                            "name": "max_pooling2d_1",
                            "pool_size": [2, 2],
                            "strides": [2, 2],
                            "padding": "valid",
                            "data_format": "channels_last",
                        },
                    },
                    {
                        "class_name": "Flatten",
                        "config": {
                            "name": "flatten",
                            "data_format": "channels_last",
                        },
                    },
                    {
                        "class_name": "Dense",
                        "config": {
                            "name": "dense",
                            "units": 64,
                            "activation": "relu",
                            "use_bias": True,
                        },
                    },
                    {
                        "class_name": "Dense",
                        "config": {
                            "name": "dense_1",
                            "units": 26,
                            "activation": "softmax",
                            "use_bias": True,
                        },
                    },
                ],
            },
            "keras_version": "2.x",
            "backend": "tensorflow",
        },
        "format": "layers-model",
        "generatedBy": "tflite_to_tfjs.py",
        "convertedBy": None,
        "weightsManifest": [
            {
                "paths": ["group1-shard1of1.bin"],
                "weights": weight_specs,
            }
        ],
    }

    # ------------------------------------------------------------------
    # Write output files
    # ------------------------------------------------------------------
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    model_json_path = OUT_DIR / "model.json"
    with open(model_json_path, "w") as f:
        json.dump(model_json, f, indent=2)
    print(f"\nWrote {model_json_path}")

    bin_path = OUT_DIR / "group1-shard1of1.bin"
    with open(bin_path, "wb") as f:
        f.write(weight_bytes)
    print(f"Wrote {bin_path} ({len(weight_bytes)} bytes)")

    # ------------------------------------------------------------------
    # Quick sanity-check: build Keras model, load weights, run dummy input
    # ------------------------------------------------------------------
    print("\nSanity check: building equivalent Keras model…")
    loaded = tf.keras.Sequential(name="character_classifier")
    loaded.add(tf.keras.layers.Conv2D(16, 3, activation="relu", padding="valid",
                                      input_shape=(28, 28, 1), name="conv2d"))
    loaded.add(tf.keras.layers.MaxPooling2D(2, name="max_pooling2d"))
    loaded.add(tf.keras.layers.Conv2D(32, 3, activation="relu", padding="valid",
                                      name="conv2d_1"))
    loaded.add(tf.keras.layers.MaxPooling2D(2, name="max_pooling2d_1"))
    loaded.add(tf.keras.layers.Flatten(name="flatten"))
    loaded.add(tf.keras.layers.Dense(64, activation="relu", name="dense"))
    loaded.add(tf.keras.layers.Dense(26, activation="softmax", name="dense_1"))

    # layers[0]=Conv2D(16), [1]=MaxPool, [2]=Conv2D(32), [3]=MaxPool,
    # [4]=Flatten, [5]=Dense(64), [6]=Dense(26)
    loaded.layers[0].set_weights([conv1_k, conv1_b])
    loaded.layers[2].set_weights([conv2_k, conv2_b])
    loaded.layers[5].set_weights([dense1_k, dense1_b])
    loaded.layers[6].set_weights([dense2_k, dense2_b])

    dummy = np.zeros((1, 28, 28, 1), dtype=np.float32)
    pred = loaded.predict(dummy, verbose=0)
    top = chr(65 + int(np.argmax(pred[0])))
    s = pred[0].sum()
    print(f"Dummy input → class '{top}' (argmax={np.argmax(pred[0])}, sum={s:.4f})")
    if abs(s - 1.0) < 0.01:
        print("✓ Output sums to ~1 — weights and architecture look correct")
    else:
        print("⚠ Output does not sum to 1 — check dequantization")

    # Also compare TFLite output on same dummy input
    interp.set_tensor(in_d[0]['index'], dummy)
    interp.invoke()
    tflite_pred = interp.get_tensor(out_d[0]['index'])[0]
    tflite_top = chr(65 + int(np.argmax(tflite_pred)))
    keras_top  = chr(65 + int(np.argmax(pred[0])))
    match = "✓ MATCH" if tflite_top == keras_top else "⚠ MISMATCH"
    print(f"TFLite top-1: '{tflite_top}'  Keras top-1: '{keras_top}'  {match}")

    print("\nDone. Restart Expo with: npx expo start --web --clear")

if __name__ == "__main__":
    main()
