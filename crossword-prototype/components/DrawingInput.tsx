/**
 * DrawingInput — stylus/finger drawing panel for letter entry.
 *
 * Architecture:
 *  - PanResponder captures pointer/touch/mouse events (works on web + native).
 *  - react-native-svg renders each stroke as a separate Polyline so there's no
 *    ugly connecting line when the pen briefly lifts between strokes.
 *  - Recognition is DEBOUNCED: inference runs 2 seconds after the last
 *    pointer-move event, so multi-stroke letters (T, H, etc.) work too.
 *  - Web: TensorFlow.js + TFLite (`public/character_classifier.tflite`), with
 *    $1 Unistroke fallback if the model fails to load. Native: $1 only.
 *
 * Translates to Apple Pencil on iPad — same stroke capture; web uses TFLite when
 * the model is present, otherwise $1. Native currently uses $1 only.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Platform,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import {
  recognizeLetter,
  preloadTfliteModel,
  getTfliteModelStatus,
  getTfliteLoadError,
  getWebMlBackend,
} from '@/modules/recognition/mlRecognize';
import type { Point, RecognitionResult } from '@/modules/recognition/dollar';

const CANVAS_HEIGHT = 220;
const CONFIDENCE_THRESHOLD = 0.58;
const AUTO_CONFIRM_DELAY_MS = 600;
const RECOGNITION_DEBOUNCE_MS = 2000; // wait this long after last move before recognising

type Props = {
  cellLabel: string;
  onConfirm: (letter: string) => void;
  onDismiss: () => void;
};

export function DrawingInput({ cellLabel, onConfirm, onDismiss }: Props) {
  // Each "pen-down → pen-up" segment is stored as a separate stroke.
  // All strokes together form the current letter attempt.
  const completedStrokesRef = useRef<Point[][]>([]);
  const activeStrokeRef = useRef<Point[]>([]);

  // Mirror refs into state so the SVG re-renders.
  const [completedStrokes, setCompletedStrokes] = useState<Point[][]>([]);
  const [activeStroke, setActiveStroke] = useState<Point[]>([]);

  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const autoConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measured in onLayout so the SVG always has real pixel dimensions.
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: CANVAS_HEIGHT });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setModelStatus('loading');
    preloadTfliteModel().then((status) => setModelStatus(status));
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const clearCanvas = useCallback(() => {
    clearTimeout(autoConfirmTimer.current ?? undefined);
    clearTimeout(recognitionTimer.current ?? undefined);
    completedStrokesRef.current = [];
    activeStrokeRef.current = [];
    setCompletedStrokes([]);
    setActiveStroke([]);
    setResult(null);
  }, []);

  const runRecognition = useCallback(async () => {
    const strokes = [...completedStrokesRef.current];
    if (activeStrokeRef.current.length > 0) {
      strokes.push([...activeStrokeRef.current]);
    }
    const flat = strokes.flat();
    if (flat.length < 5) return;

    const rec = await recognizeLetter(strokes, canvasSize.width, canvasSize.height);
    setResult(rec);

    if (rec.score >= CONFIDENCE_THRESHOLD && rec.name !== '?') {
      autoConfirmTimer.current = setTimeout(() => {
        onConfirm(rec.name);
        clearCanvas();
      }, AUTO_CONFIRM_DELAY_MS);
    }
  }, [onConfirm, clearCanvas, canvasSize.width, canvasSize.height]);

  /** Schedule recognition after 2 s of no new pointer events. */
  const scheduleRecognition = useCallback(() => {
    clearTimeout(recognitionTimer.current ?? undefined);
    recognitionTimer.current = setTimeout(runRecognition, RECOGNITION_DEBOUNCE_MS);
  }, [runRecognition]);

  // ── PanResponder ─────────────────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        // Cancel any pending auto-confirm when user starts a new stroke.
        clearTimeout(autoConfirmTimer.current ?? undefined);
        clearTimeout(recognitionTimer.current ?? undefined);
        setResult(null);

        const { locationX: x, locationY: y } = evt.nativeEvent;
        activeStrokeRef.current = [{ x, y }];
        setActiveStroke([{ x, y }]);
      },

      onPanResponderMove: (evt) => {
        const { locationX: x, locationY: y } = evt.nativeEvent;
        activeStrokeRef.current = [...activeStrokeRef.current, { x, y }];
        setActiveStroke([...activeStrokeRef.current]);
        // Reset the debounce timer on every move.
        scheduleRecognition();
      },

      onPanResponderRelease: () => {
        // Save the finished stroke; do NOT recognise yet — wait for debounce.
        if (activeStrokeRef.current.length > 0) {
          completedStrokesRef.current = [
            ...completedStrokesRef.current,
            activeStrokeRef.current,
          ];
          setCompletedStrokes([...completedStrokesRef.current]);
          activeStrokeRef.current = [];
          setActiveStroke([]);
        }
      },

      onPanResponderTerminate: () => {
        // Same as release.
        if (activeStrokeRef.current.length > 0) {
          completedStrokesRef.current = [
            ...completedStrokesRef.current,
            activeStrokeRef.current,
          ];
          setCompletedStrokes([...completedStrokesRef.current]);
          activeStrokeRef.current = [];
          setActiveStroke([]);
        }
      },
    }),
  ).current;

  // ── Derived UI ───────────────────────────────────────────────────────────────

  function handleManualConfirm() {
    if (!result) return;
    clearTimeout(autoConfirmTimer.current ?? undefined);
    onConfirm(result.name);
    clearCanvas();
  }

  const hasStrokes =
    completedStrokes.length > 0 || activeStroke.length > 0;
  const isHighConfidence = (result?.score ?? 0) >= CONFIDENCE_THRESHOLD;

  const mlBackend = getWebMlBackend();
  const loadErr = getTfliteLoadError();

  const recognizerLabel =
    Platform.OS === 'web'
      ? modelStatus === 'loading'
        ? 'Loading ML…'
        : modelStatus === 'ready'
          ? mlBackend === 'tfjs'
            ? 'ML (TensorFlow.js)'
            : 'ML (TFLite)'
          : loadErr
            ? 'ML failed — using $1'
            : 'Template match ($1)'
      : 'Template match';

  const backendTag =
    result?.backend === 'tflite' ? 'ML' : result?.backend === 'dollar' ? '$1' : '';

  // Build "x1,y1 x2,y2 …" string for a stroke.
  function toSvgPoints(pts: Point[]) {
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  }

  return (
    <View style={styles.panel}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.cellLabel} numberOfLines={1}>{cellLabel}</Text>
          <Text
            style={[
              styles.recognizerPill,
              modelStatus === 'ready' && styles.recognizerPillMl,
            ]}
          >
            {recognizerLabel}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* ── Drawing surface ── */}
      <View
        style={styles.canvasWrapper}
        onLayout={(e) =>
          setCanvasSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
        {...panResponder.panHandlers}
      >
        {/* Dashed midline guide */}
        <View style={styles.guideLines} pointerEvents="none">
          <View style={styles.guideMid} />
        </View>

        {/* Ghost preview of recognised letter — shown behind strokes */}
        {result && (
          <View style={styles.ghostContainer} pointerEvents="none">
            <Text style={[styles.ghostLetter, isHighConfidence && styles.ghostHigh]}>
              {result.name}
            </Text>
          </View>
        )}

        {/* SVG strokes — each pen-down segment rendered separately */}
        {canvasSize.width > 0 && (
          <Svg
            width={canvasSize.width}
            height={canvasSize.height}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {completedStrokes.map((stroke, i) =>
              stroke.length > 1 ? (
                <Polyline
                  key={i}
                  points={toSvgPoints(stroke)}
                  stroke="#1a1a2e"
                  strokeWidth={3.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : null,
            )}
            {activeStroke.length > 1 && (
              <Polyline
                points={toSvgPoints(activeStroke)}
                stroke="#1a1a2e"
                strokeWidth={3.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </Svg>
        )}

        {/* Placeholder shown when canvas is empty */}
        {!hasStrokes && !result && (
          <View style={styles.emptyHint} pointerEvents="none">
            <Text style={styles.emptyHintText}>Draw here</Text>
          </View>
        )}
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={clearCanvas}
          activeOpacity={0.7}
        >
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>

        {result ? (
          <View style={styles.resultRow}>
            <Text style={[styles.resultBadge, isHighConfidence && styles.resultBadgeHigh]}>
              {result.name}  {Math.round(result.score * 100)}%
              {backendTag ? `  (${backendTag})` : ''}
            </Text>
            <TouchableOpacity
              style={[styles.useBtn, isHighConfidence && styles.useBtnHigh]}
              onPress={handleManualConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.useBtnText}>Use {result.name}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.hint}>
            {hasStrokes ? 'Recognising in 2 s…' : 'Draw a letter above'}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#f8f8f2',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingBottom: 8,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  cellLabel: {
    fontSize: 13,
    color: '#555',
  },
  recognizerPill: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: '#888',
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  recognizerPillMl: {
    color: '#1a5a1a',
    backgroundColor: '#e0f0e0',
  },
  doneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3a6ef5',
  },

  canvasWrapper: {
    height: CANVAS_HEIGHT,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    overflow: 'hidden',
  },
  guideLines: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  guideMid: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderStyle: 'dashed',
  },
  ghostContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLetter: {
    fontSize: 140,
    fontWeight: '100',
    color: 'rgba(180, 180, 200, 0.35)',
    lineHeight: 160,
  },
  ghostHigh: {
    color: 'rgba(58, 110, 245, 0.25)',
  },
  emptyHint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHintText: {
    fontSize: 15,
    color: '#ccc',
    fontStyle: 'italic',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
    minHeight: 44,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  clearText: {
    fontSize: 14,
    color: '#444',
  },
  hint: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#aaa',
    fontStyle: 'italic',
  },
  resultRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultBadge: {
    fontSize: 14,
    color: '#888',
    fontVariant: ['tabular-nums'],
  },
  resultBadgeHigh: {
    color: '#2a7a2a',
    fontWeight: '600',
  },
  useBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#e8e8e8',
  },
  useBtnHigh: {
    backgroundColor: '#3a6ef5',
  },
  useBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
