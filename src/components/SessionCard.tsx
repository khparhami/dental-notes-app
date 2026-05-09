import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../theme';
import type { SessionWithDetails } from '../types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  recording: { label: 'In Progress', color: Colors.textSecondary },
  transcript_ready: { label: 'Transcript Ready', color: '#e67e22' },
  note_generated: { label: 'Note Ready', color: Colors.accent },
};

interface Props {
  session: SessionWithDetails;
  onPress: () => void;
  onLongPress: () => void;
}

export function SessionCard({ session, onPress, onLongPress }: Props) {
  const status = STATUS_LABELS[session.status] ?? STATUS_LABELS.recording;
  const preview = session.chiefComplaint || session.transcript?.fullText?.slice(0, 80) || '—';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{session.patientName}</Text>
        <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
          <View style={[styles.dot, { backgroundColor: status.color }]} />
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.date}>{formatDate(session.date)}</Text>
      <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
    </TouchableOpacity>
  );
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  preview: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
