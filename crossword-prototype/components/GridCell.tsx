/**
 * Single crossword cell: type with keyboard or draw in-place.
 * Strokes are recognized after RECOGNITION_DEBOUNCE_MS and replace the cell value.
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
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { recognizeLetter } from '@/modules/recognition/mlRecognize';
import type { Point } from '@/modules/recognition/dollar';

const RECOGNITION_DEBOUNCE_MS = 1500;
const MIN_STROKE_POINTS = 5;
/** Fixed draw/recognition size — independent of grid cell pixel size */
const INPUT_CANVAS_SIZE = 120;

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

function stopPointerBubble(
  e: { stopPropagation?: () => void; nativeEvent?: { stopPropagation?: () => void } },
) {
  e.stopPropagation?.();
  e.nativeEvent?.stopPropagation?.();
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
  const completedStrokesRef = useRef<Point[][]>([]);
  const activeStrokeRef = useRef<Point[]>([]);
  const [completedStrokes, setCompletedStrokes] = useState<Point[][]>([]);
  const [activeStroke, setActiveStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [recognitionPending, setRecognitionPending] = useState(false);
  const recognitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecognizingRef = useRef(false);
  const showDrawLayerRef = useRef(false);

  const pad = Math.max(0, (INPUT_CANVAS_SIZE - width) / 2);
  const hasStrokes = completedStrokes.length > 0 || activeStroke.length > 0;
  const showDrawLayer = isSelected || recognitionPending || hasStrokes;
  showDrawLayerRef.current = showDrawLayer;

  const clearStrokes = useCallback(() => {
    completedStrokesRef.current = [];
    activeStrokeRef.current = [];
    setCompletedStrokes([]);
    setActiveStroke([]);
    setIsDrawing(false);
    setRecognitionPending(false);
  }, []);

  const runRecognition = useCallback(async () => {
    if (isRecognizingRef.current) return;
    recognitionTimer.current = null;

    const strokes = [...completedStrokesRef.current];
    if (activeStrokeRef.current.length > 0) {
      strokes.push([...activeStrokeRef.current]);
    }
    if (strokes.flat().length < MIN_STROKE_POINTS) {
      setRecognitionPending(false);
      return;
    }

    isRecognizingRef.current = true;
    setRecognitionPending(true);
    try {
      const rec = await recognizeLetter(
        strokes,
        INPUT_CANVAS_SIZE,
        INPUT_CANVAS_SIZE,
      );
      if (rec.name && rec.name !== '?') {
        onLetter(rec.name);
      }
    } finally {
      isRecognizingRef.current = false;
      clearStrokes();
    }
  }, [onLetter, clearStrokes]);

  const scheduleRecognition = useCallback(() => {
    setRecognitionPending(true);
    clearTimeout(recognitionTimer.current ?? undefined);
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
    if (isSelected) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }

    // Deselect: finish pending recognition instead of discarding strokes
    if (isRecognizingRef.current) return;

    const strokeCount =
      completedStrokesRef.current.flat().length + activeStrokeRef.current.length;
    if (strokeCount >= MIN_STROKE_POINTS || recognitionTimer.current) {
      flushRecognition();
    } else {
      clearStrokes();
    }
  }, [isSelected, flushRecognition, clearStrokes]);

  useEffect(() => {
    return () => {
      clearTimeout(recognitionTimer.current ?? undefined);
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => showDrawLayerRef.current,
      onMoveShouldSetPanResponder: () => showDrawLayerRef.current,

      onPanResponderGrant: (evt) => {
        stopPointerBubble(evt);
        clearTimeout(recognitionTimer.current ?? undefined);
        recognitionTimer.current = null;
        setRecognitionPending(false);
        setIsDrawing(true);
        inputRef.current?.blur();
        const { locationX: x, locationY: y } = evt.nativeEvent;
        activeStrokeRef.current = [{ x, y }];
        setActiveStroke([{ x, y }]);
      },

      onPanResponderMove: (evt) => {
        stopPointerBubble(evt);
        const { locationX: x, locationY: y } = evt.nativeEvent;
        activeStrokeRef.current = [...activeStrokeRef.current, { x, y }];
        setActiveStroke([...activeStrokeRef.current]);
        scheduleRecognition();
      },

      onPanResponderRelease: (evt) => {
        stopPointerBubble(evt);
        if (activeStrokeRef.current.length > 0) {
          completedStrokesRef.current = [
            ...completedStrokesRef.current,
            activeStrokeRef.current,
          ];
          setCompletedStrokes([...completedStrokesRef.current]);
          activeStrokeRef.current = [];
          setActiveStroke([]);
        }
        setIsDrawing(false);
        scheduleRecognition();
      },

      onPanResponderTerminate: (evt) => {
        stopPointerBubble(evt);
        if (activeStrokeRef.current.length > 0) {
          completedStrokesRef.current = [
            ...completedStrokesRef.current,
            activeStrokeRef.current,
          ];
          setCompletedStrokes([...completedStrokesRef.current]);
          activeStrokeRef.current = [];
          setActiveStroke([]);
        }
        setIsDrawing(false);
        scheduleRecognition();
      },
    }),
  ).current;

  const handleTextChange = (text: string) => {
    const letter = text.slice(-1).toUpperCase().replace(/[^A-Z]/g, '');
    clearTimeout(recognitionTimer.current ?? undefined);
    recognitionTimer.current = null;
    clearStrokes();
    onLetter(letter);
  };

  const showLetterInInput = isSelected && !isDrawing && !hasStrokes;

  function toSvgPoints(pts: Point[]) {
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  }

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
    (isSelected || recognitionPending) && styles.cellSelected,
  ];

  const drawOverlay = showDrawLayer ? (
    <View
      style={[
        styles.drawOverlay,
        { width: INPUT_CANVAS_SIZE, height: INPUT_CANVAS_SIZE, left: -pad, top: -pad },
      ]}
      {...panResponder.panHandlers}
      {...(Platform.OS === 'web'
        ? {
            onMouseDown: stopPointerBubble,
            onMouseUp: stopPointerBubble,
            onClick: stopPointerBubble,
            onPointerDown: stopPointerBubble,
            onPointerUp: stopPointerBubble,
          }
        : {})}
    >
      {hasStrokes && (
        <Svg
          width={INPUT_CANVAS_SIZE}
          height={INPUT_CANVAS_SIZE}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {completedStrokes.map((stroke, i) =>
            stroke.length > 1 ? (
              <Polyline
                key={i}
                points={toSvgPoints(stroke)}
                stroke="#1a1a2e"
                strokeWidth={3}
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
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>
      )}

      {isSelected && (
        <TextInput
          ref={inputRef}
          value={showLetterInInput ? userInput : ''}
          onChangeText={handleTextChange}
          maxLength={1}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          selectTextOnFocus
          style={styles.input}
          {...(Platform.OS === 'web'
            ? { inputMode: 'text' as const, enterKeyHint: 'next' as const }
            : {})}
        />
      )}
    </View>
  ) : null;

  const content = (
    <>
      {cellNumber !== undefined && (
        <Text style={styles.cellNumber}>{cellNumber}</Text>
      )}
      {drawOverlay}
      {!showDrawLayer && (
        <Text style={[styles.letter, letterStyle]}>{userInput}</Text>
      )}
      {showDrawLayer && !hasStrokes && !isDrawing && userInput ? (
        <Text style={[styles.letter, styles.letterCommitted, letterStyle]} pointerEvents="none">
          {userInput}
        </Text>
      ) : null}
    </>
  );

  if (!isSelected && !recognitionPending && !hasStrokes) {
    return (
      <Pressable
        onPress={(e) => {
          stopPointerBubble(e);
          onSelect();
        }}
        style={cellStyle}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={stopPointerBubble} style={cellStyle}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
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
    zIndex: 2,
  },
  drawOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderWidth: 1,
    borderColor: '#3a6ef5',
    borderRadius: 4,
    zIndex: 3,
  },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 48,
    fontWeight: '700',
    color: '#1a1a2e',
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  letter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  letterCommitted: {
    position: 'absolute',
    zIndex: 0,
    opacity: 0.35,
    fontSize: 13,
  },
});
