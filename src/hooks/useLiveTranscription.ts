import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';

export function useLiveTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [partialResult, setPartialResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  const committedRef = useRef('');
  const [displayText, setDisplayText] = useState('');
  const stoppingRef = useRef(false);
  // Set to true after onSpeechResults fires so partial events don't re-show committed text
  const segmentDoneRef = useRef(false);

  const updateDisplay = useCallback((committed: string, partial: string) => {
    const separator = committed && partial ? ' ' : '';
    setDisplayText(committed + separator + partial);
  }, []);

  const startRecognition = useCallback(async () => {
    segmentDoneRef.current = false;
    try {
      await Voice.start('en-US');
    } catch (e: any) {
      // Ignore "already started" errors during auto-restart
      if (!e.message?.includes('already started')) {
        setError(e.message);
      }
    }
  }, []);

  useEffect(() => {
    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (segmentDoneRef.current) return;
      const partial = e.value?.[0] ?? '';
      setPartialResult(partial);
      updateDisplay(committedRef.current, partial);
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const result = e.value?.[0] ?? '';
      if (result) {
        committedRef.current = committedRef.current
          ? committedRef.current + ' ' + result
          : result;
      }
      segmentDoneRef.current = true;
      setPartialResult('');
      updateDisplay(committedRef.current, '');
    };

    // iOS fires onSpeechEnd after ~1 minute. Auto-restart to get continuous recording.
    Voice.onSpeechEnd = (_: SpeechEndEvent) => {
      if (!stoppingRef.current) {
        // Brief delay before restart to let onSpeechResults fire first
        setTimeout(() => {
          if (!stoppingRef.current) {
            startRecognition();
          }
        }, 300);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      const code = String(e.error?.code ?? '');
      // Code 7 = "no match" — harmless, restart silently
      if (code === '7') {
        if (!stoppingRef.current) {
          setTimeout(() => startRecognition(), 300);
        }
        return;
      }
      // Code 300 = recognizer init failed — permissions likely denied
      if (code === '300') {
        setIsRecording(false);
        Alert.alert(
          'Microphone Permission Required',
          'Please enable Microphone and Speech Recognition access in Settings → Privacy & Security.',
        );
        return;
      }
      setError(e.error?.message ?? 'Speech recognition error');
      setIsRecording(false);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [startRecognition, updateDisplay]);

  const start = useCallback(async () => {
    // Check permissions before starting
    const available = await Voice.isAvailable();
    if (!available) {
      Alert.alert(
        'Speech Recognition Unavailable',
        'Please enable Speech Recognition permission in Settings → Privacy & Security → Speech Recognition.',
      );
      return;
    }
    committedRef.current = '';
    stoppingRef.current = false;
    setDisplayText('');
    setPartialResult('');
    setError(null);
    setIsRecording(true);
    await startRecognition();
  }, [startRecognition]);

  const stop = useCallback(async (): Promise<string> => {
    stoppingRef.current = true;
    try {
      await Voice.stop();
    } catch {
      // ignore
    }
    setIsRecording(false);
    // Flush any partial result into committed
    const partial = partialResult;
    const final = committedRef.current
      ? (partial ? committedRef.current + ' ' + partial : committedRef.current)
      : partial;
    committedRef.current = '';
    setPartialResult('');
    setDisplayText('');
    return final;
  }, [partialResult]);

  return { isRecording, displayText, error, start, stop };
}
