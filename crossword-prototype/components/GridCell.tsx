/**
 * Single crossword cell: draw in the cell bounds, or type via a hidden input.
 * Web uses pointer events; native uses PanResponder.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  PanResponder,
  Platform,
  type GestureResponderEvent,
} from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { recognizeLetter } from '@/modules/recognition/mlRecognize';
import type { Point } from '@/modules/recognition/dollar';

const RECOGNITION_DEBOUNCE_MS = 1500;
const MIN_STROKE_POINTS = 4;

type RecognitionPhase = 'idle' | 'drawing' | 'waiting' | 'recognizing';

type Props = {
  cellNumber?: number;
  userInput: string;
  cellBg: string;
  borderColor: string;
  borderWidth: number;
  letterStyle?: object;
  width: number;
  height: number;
  left: number;
  top: number;
  isSelected: boolean;
  onSelect: () => void;
  onLetter: (letter: string) => void;
};

function getLocalPoint(
  e: GestureResponderEvent,
  layout: { x: number; y: number; width: number; height: number } | null,
): Point {
  const ne = e.nativeEvent as {
    locationX?: number;
    locationY?: number;
    pageX?: number;
    pageY?: number;
  };
  if (ne.locationX != null && ne.locationY != null) {
    return { x: ne.locationX, y: ne.locationY };
  }
  if (layout && ne.pageX != null && ne.pageY != null) {
    return { x: ne.pageX - layout.x, y: ne.pageY - layout.y };
  }
  return { x: 0, y: 0 };
}

export function GridCell({
  cellNumber,
  userInput,
  cellBg,
  borderColor,
  borderWidth,
  letterStyle,
  width,
  height,
  left,
  top,
  isSelected,
  onSelect,
  onLetter,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const drawSurfaceRef = useRef<View>(null);
  const layoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const completedStrokesRef = useRef<Point[][]>([]);
  const activeStrokeRef = useRef<Point[]>([]);
  const [completedStrokes, setCompletedStrokes] = useState<Point[][]>([]);
  const [activeStroke, setActiveStroke] = useState<Point[]>([]);
  const [phase, setPhase] = useState<RecognitionPhase>('idle');
  const recognitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecognizingRef = useRef(false);
  const isSelectedRef = useRef(isSelected);
  const isDrawingRef = useRef(false);
  isSelectedRef.current = isSelected;

  const hasStrokes = completedStrokes.length > 0 || activeStroke.length > 0;
  const strokeWidth = Math.max(1.5, Math.min(width, height) * 0.14);

  const snapshotStrokes = useCallback((): Point[][] => {
    const strokes = [...completedStrokesRef.current];
    if (activeStrokeRef.current.length > 0) {
      strokes.push([...activeStrokeRef.current]);
    }
    return strokes;
  }, []);

  const clearStrokes = useCallback(() => {
    completedStrokesRef.current = [];
    activeStrokeRef.current = [];
    setCompletedStrokes([]);
    setActiveStroke([]);
    isDrawingRef.current = false;
    setPhase('idle');
  }, []);

  const runRecognition = useCallback(async () => {
    if (isRecognizingRef.current) return;
    recognitionTimer.current = null;

    const strokes = snapshotStrokes();
    if (strokes.flat().length < MIN_STROKE_POINTS) {
      setPhase('idle');
      return;
    }

    isRecognizingRef.current = true;
    setPhase('recognizing');
    try {
      const rec = await recognizeLetter(strokes, width, height);
      if (__DEV__) {
        console.info('[GridCell] recognized', rec);
      }
      if (rec.name && rec.name !== '?') {
        onLetter(rec.name);
      }
    } catch (err) {
      console.warn('[GridCell] recognition failed', err);
    } finally {
      isRecognizingRef.current = false;
      clearStrokes();
    }
  }, [onLetter, clearStrokes, width, height, snapshotStrokes]);

  const scheduleRecognition = useCallback(() => {
    clearTimeout(recognitionTimer.current ?? undefined);
    setPhase('waiting');
    recognitionTimer.current = setTimeout(() => {
      void runRecognition();
    }, RECOGNITION_DEBOUNCE_MS);
  }, [runRecognition]);

  const flushRecognition = useCallback(() => {
    if (recognitionTimer.current) {
      clearTimeout(recognitionTimer.current);
      recognitionTimer.current = null;
      void runRecognition();
    }
  }, [runRecognition]);

  useEffect(() => {
    if (!isSelected) {
      const strokeCount = snapshotStrokes().flat().length;
      if (strokeCount >= MIN_STROKE_POINTS || recognitionTimer.current) {
        flushRecognition();
      } else {
        clearTimeout(recognitionTimer.current ?? undefined);
        recognitionTimer.current = null;
        if (!isRecognizingRef.current) {
          clearStrokes();
        }
      }
      return;
    }

    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isSelected, clearStrokes, flushRecognition, snapshotStrokes]);

  useEffect(() => {
    return () => clearTimeout(recognitionTimer.current ?? undefined);
  }, []);

  const measureSurface = useCallback(() => {
    drawSurfaceRef.current?.measureInWindow((x, y, w, h) => {
      layoutRef.current = { x, y, width: w, height: h };
    });
  }, []);

  const beginStroke = useCallback(
    (point: Point) => {
      clearTimeout(recognitionTimer.current ?? undefined);
      recognitionTimer.current = null;
      isDrawingRef.current = true;
      setPhase('drawing');
      inputRef.current?.blur();
      activeStrokeRef.current = [point];
      setActiveStroke([point]);
    },
    [],
  );

  const appendPoint = useCallback(
    (point: Point) => {
      activeStrokeRef.current = [...activeStrokeRef.current, point];
      setActiveStroke([...activeStrokeRef.current]);
      scheduleRecognition();
    },
    [scheduleRecognition],
  );

  const endStroke = useCallback(() => {
    if (activeStrokeRef.current.length > 0) {
      completedStrokesRef.current = [
        ...completedStrokesRef.current,
        activeStrokeRef.current,
      ];
      setCompletedStrokes([...completedStrokesRef.current]);
      activeStrokeRef.current = [];
      setActiveStroke([]);
    }
    isDrawingRef.current = false;
    scheduleRecognition();
  }, [scheduleRecognition]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isSelectedRef.current,
      onMoveShouldSetPanResponder: () => isSelectedRef.current,
      onPanResponderGrant: (evt) => {
        beginStroke(getLocalPoint(evt, layoutRef.current));
      },
      onPanResponderMove: (evt) => {
        appendPoint(getLocalPoint(evt, layoutRef.current));
      },
      onPanResponderRelease: () => endStroke(),
      onPanResponderTerminate: () => endStroke(),
    }),
  ).current;

  const webPointerHandlers =
    Platform.OS === 'web'
      ? {
          onPointerDown: (e: GestureResponderEvent) => {
            if (!isSelectedRef.current) return;
            e.preventDefault?.();
            (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
            measureSurface();
            const target = e.currentTarget as unknown as {
              setPointerCapture?: (id: number) => void;
            };
            const pid = (e.nativeEvent as { pointerId?: number }).pointerId;
            if (pid != null) target.setPointerCapture?.(pid);
            beginStroke(getLocalPoint(e, layoutRef.current));
          },
          onPointerMove: (e: GestureResponderEvent) => {
            if (!isDrawingRef.current) return;
            e.preventDefault?.();
            appendPoint(getLocalPoint(e, layoutRef.current));
          },
          onPointerUp: (e: GestureResponderEvent) => {
            if (!isDrawingRef.current && activeStrokeRef.current.length === 0) return;
            e.preventDefault?.();
            (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
            endStroke();
          },
          onPointerCancel: () => endStroke(),
          onPointerLeave: () => {
            if (isDrawingRef.current) endStroke();
          },
        }
      : {};

  const handleTextChange = (text: string) => {
    const letter = text.slice(-1).toUpperCase().replace(/[^A-Z]/g, '');
    clearTimeout(recognitionTimer.current ?? undefined);
    recognitionTimer.current = null;
    clearStrokes();
    if (letter) onLetter(letter);
  };

  function toSvgPoints(pts: Point[]) {
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  }

  const inkVisible =
    hasStrokes || phase === 'waiting' || phase === 'recognizing' || phase === 'drawing';
  const showLetter = userInput && !inkVisible;

  const cellStyle = [
    styles.cell,
    {
      width,
      height,
      left,
      top,
      backgroundColor: cellBg,
      borderColor,
      borderWidth,
    },
    isSelected && styles.cellSelected,
  ];

  const inner = (
    <>
      {cellNumber !== undefined && (
        <Text style={styles.cellNumber} pointerEvents="none">
          {cellNumber}
        </Text>
      )}

      {(isSelected || inkVisible) && (
        <View
          ref={drawSurfaceRef}
          style={[
            styles.drawSurface,
            Platform.OS === 'web' && styles.drawSurfaceWeb,
            !isSelected && styles.drawSurfacePending,
          ]}
          onLayout={measureSurface}
          {...(isSelected
            ? Platform.OS === 'web'
              ? webPointerHandlers
              : panResponder.panHandlers
            : {})}
        >
          {inkVisible && (
            <Svg
              width={width}
              height={height}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              {completedStrokes.map((stroke, i) =>
                stroke.length > 1 ? (
                  <Polyline
                    key={`c-${i}`}
                    points={toSvgPoints(stroke)}
                    stroke="#1a1a2e"
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                  />
                ) : stroke.length === 1 ? (
                  <Circle
                    key={`c-${i}`}
                    cx={stroke[0].x}
                    cy={stroke[0].y}
                    r={strokeWidth / 2}
                    fill="#1a1a2e"
                  />
                ) : null,
              )}
              {activeStroke.map((p, i) =>
                i === 0 && activeStroke.length === 1 ? (
                  <Circle
                    key="a-dot"
                    cx={p.x}
                    cy={p.y}
                    r={strokeWidth / 2}
                    fill="#1a1a2e"
                  />
                ) : null,
              )}
              {activeStroke.length > 1 && (
                <Polyline
                  points={toSvgPoints(activeStroke)}
                  stroke="#1a1a2e"
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </Svg>
          )}
        </View>
      )}

      {isSelected && (
        <TextInput
          ref={inputRef}
          value={showLetter ? userInput : ''}
          onChangeText={handleTextChange}
          maxLength={1}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          caretHidden
          style={styles.hiddenInput}
          pointerEvents="none"
          {...(Platform.OS === 'web'
            ? { inputMode: 'text' as const, enterKeyHint: 'next' as const }
            : {})}
        />
      )}

      {(showLetter || (!isSelected && userInput)) ? (
        <Text style={[styles.letter, letterStyle]} pointerEvents="none">
          {userInput}
        </Text>
      ) : null}
    </>
  );

  if (!isSelected) {
    return (
      <Pressable
        onPress={(e) => {
          if ('stopPropagation' in e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
          }
          onSelect();
        }}
        style={cellStyle}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View
      style={cellStyle}
      onStartShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  cellSelected: {
    zIndex: 10,
  },
  cellNumber: {
    position: 'absolute',
    top: 1,
    left: 2,
    fontSize: 7,
    fontWeight: '700',
    color: '#555',
    lineHeight: 9,
    zIndex: 4,
  },
  drawSurface: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  drawSurfaceWeb: {
    touchAction: 'none',
    cursor: 'crosshair',
    userSelect: 'none',
  } as object,
  drawSurfacePending: {
    pointerEvents: 'none',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    zIndex: 1,
  },
  letter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    zIndex: 3,
  },
});
