import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useLiveTranscription } from '@/src/hooks/useLiveTranscription';
import { RecordButton } from '@/src/components/RecordButton';
import { insertTranscript, updateSessionStatus, deleteSession } from '@/src/db/sessions';
import { Colors, FontSize, Spacing } from '@/src/theme';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function RecordingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isRecording, displayText, error, start, stop } = useLiveTranscription();
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptScrollRef = useRef<ScrollView>(null);
  const startTimeRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - seconds * 1000;
    timerRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }, [seconds]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // Auto-start recording when screen mounts
  useEffect(() => {
    start();
    startTimer();
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll transcript to bottom as text grows
  useEffect(() => {
    transcriptScrollRef.current?.scrollToEnd({ animated: true });
  }, [displayText]);

  const handlePauseResume = async () => {
    if (isPaused) {
      await start();
      startTimer();
      setIsPaused(false);
    } else {
      await stop();
      stopTimer();
      setIsPaused(true);
    }
  };

  const handleEndSession = async () => {
    if (!isRecording && !isPaused && displayText.trim() === '') {
      Alert.alert('No transcript', 'Please record some audio before ending the session.');
      return;
    }

    const finalTranscript = await stop();
    stopTimer();

    if (!finalTranscript.trim()) {
      Alert.alert('Empty transcript', 'No speech was detected. Please try again.', [
        { text: 'OK' },
      ]);
      await start();
      startTimer();
      return;
    }

    await insertTranscript({
      id: generateId(),
      sessionId: id,
      fullText: finalTranscript,
      durationSeconds: seconds,
      recordedAt: new Date().toISOString(),
      editedText: null,
    });
    await updateSessionStatus(id, 'transcript_ready');

    router.replace({ pathname: '/session/[id]', params: { id, mode: 'transcript' } });
  };

  const handleCancel = () => {
    Alert.alert('Cancel Session', 'This will delete the session and all recorded audio.', [
      { text: 'Keep Recording', style: 'cancel' },
      {
        text: 'Delete Session',
        style: 'destructive',
        onPress: async () => {
          await stop().catch(() => {});
          await deleteSession(id);
          router.back();
        },
      },
    ]);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
    return `${pad(m)}:${pad(sec)}`;
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.timerContainer}>
          {(isRecording || isPaused) && (
            <View style={[styles.liveIndicator, isPaused && styles.pausedIndicator]} />
          )}
          <Text style={styles.timer}>{formatTime(seconds)}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Live transcript */}
      <ScrollView
        ref={transcriptScrollRef}
        style={styles.transcriptArea}
        contentContainerStyle={styles.transcriptContent}
      >
        {displayText ? (
          <Text style={styles.transcriptText}>{displayText}</Text>
        ) : (
          <Text style={styles.placeholderText}>
            {isPaused ? 'Recording paused.' : 'Listening... speak clearly near the microphone.'}
          </Text>
        )}
        {error ? (
          <Text style={styles.errorText}>⚠ {error}</Text>
        ) : null}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.pauseButton} onPress={handlePauseResume}>
          <Text style={styles.pauseButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>

        <RecordButton isRecording={isRecording} onPress={handleEndSession} />

        <View style={{ width: 80 }} />
      </View>

      <Text style={styles.hint}>Tap stop to end and review transcript</Text>
    </View>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  cancelButton: {
    width: 60,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.recording,
  },
  pausedIndicator: {
    backgroundColor: '#e67e22',
  },
  timer: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  transcriptArea: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  transcriptContent: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  transcriptText: {
    color: Colors.white,
    fontSize: FontSize.md,
    lineHeight: 24,
  },
  placeholderText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    color: Colors.recording,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  pauseButton: {
    width: 80,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingBottom: Spacing.xl,
  },
});
