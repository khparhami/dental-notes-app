import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getAllSessions } from '../db/sessions';
import type { SessionWithDetails } from '../types';

export function useSessions() {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllSessions();
      setSessions(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return { sessions, loading, error, refresh };
}
