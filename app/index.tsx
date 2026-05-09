import React from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Text,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSessions } from '@/src/hooks/useSessions';
import { SessionCard } from '@/src/components/SessionCard';
import { EmptyState } from '@/src/components/EmptyState';
import { deleteSession } from '@/src/db/sessions';
import { Colors, Spacing } from '@/src/theme';
import type { SessionWithDetails } from '@/src/types';

export default function HomeScreen() {
  const { sessions, loading, refresh } = useSessions();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: Spacing.md }}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handlePress = (session: SessionWithDetails) => {
    if (session.status === 'note_generated') {
      router.push({ pathname: '/session/[id]', params: { id: session.id, mode: 'note' } });
    } else if (session.transcript) {
      router.push({ pathname: '/session/[id]', params: { id: session.id, mode: 'transcript' } });
    } else {
      router.push({ pathname: '/recording/[id]', params: { id: session.id } });
    }
  };

  const handleLongPress = (session: SessionWithDetails) => {
    Alert.alert(
      session.patientName,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Session',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(session.id);
            refresh();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => handlePress(item)}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={sessions.length === 0 ? { flex: 1 } : { paddingVertical: Spacing.sm }}
        ListEmptyComponent={
          <EmptyState
            title="No sessions yet"
            subtitle="Tap + to start recording a patient session."
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/session/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
