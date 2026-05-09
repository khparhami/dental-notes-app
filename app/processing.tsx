import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getSessionById, insertNote, updateSessionStatus, deleteSession } from '@/src/db/sessions';
import { generateDentalNote } from '@/src/services/openai';
import { Colors, FontSize, Spacing } from '@/src/theme';
import type { DentalNote } from '@/src/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function ProcessingScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dotAnim]);

  const runGeneration = async () => {
    setErrorMessage(null);
    setRetrying(false);
    try {
      const session = await getSessionById(sessionId);
      if (!session) throw new Error('Session not found.');
      if (!session.transcript) throw new Error('No transcript found. Please record the session first.');

      const transcriptText = session.transcript.editedText ?? session.transcript.fullText;
      const result = await generateDentalNote(session, transcriptText);

      const note: DentalNote = {
        id: generateId(),
        sessionId,
        patientName: session.patientName,
        date: session.date,
        chiefComplaint: result.chiefComplaint,
        clinicalFindings: result.clinicalFindings,
        treatmentPerformed: result.treatmentPerformed,
        recommendationsFollowUp: result.recommendationsFollowUp,
        rawContent: result.rawContent,
        generatedAt: new Date().toISOString(),
        editedContent: null,
      };

      await insertNote(note);
      await updateSessionStatus(sessionId, 'note_generated');

      router.replace({ pathname: '/session/[id]', params: { id: sessionId, mode: 'note' } });
    } catch (e: any) {
      setErrorMessage(e.message ?? 'An unexpected error occurred.');
    }
  };

  useEffect(() => {
    runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    runGeneration();
  };

  const handleBack = async () => {
    router.replace({ pathname: '/session/[id]', params: { id: sessionId, mode: 'transcript' } });
  };

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Generation Failed</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} disabled={retrying}>
          <Text style={styles.retryText}>{retrying ? 'Retrying...' : 'Try Again'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backText}>Back to Transcript</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.title}>Generating your note</Text>
      <Text style={styles.subtitle}>Converting transcript to professional documentation…</Text>
      <Text style={styles.hint}>This usually takes 5–15 seconds</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  errorIcon: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.danger,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  retryText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  backButton: {
    padding: Spacing.md,
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
});
