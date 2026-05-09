import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, Share, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/src/hooks/useSession';
import { NoteSection } from '@/src/components/NoteSection';
import {
  updateTranscriptEditedText,
  updateNoteEditedContent,
  updateSessionStatus,
} from '@/src/db/sessions';
import { Colors, FontSize, Spacing } from '@/src/theme';

export default function SessionScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { session, loading, error, refresh } = useSession(id);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Session not found.'}</Text>
      </View>
    );
  }

  // Decide which view to show
  const showNote = mode === 'note' || (session.status === 'note_generated' && mode !== 'transcript');
  const showTranscript = !showNote && session.transcript;

  // ── Transcript view ──────────────────────────────────────────────────────
  if (showTranscript || mode === 'transcript') {
    const transcript = session.transcript;
    const transcriptText = editingTranscript
      ? transcriptDraft
      : (transcript?.editedText ?? transcript?.fullText ?? '');

    const handleSaveTranscript = async () => {
      await updateTranscriptEditedText(id, transcriptDraft);
      setEditingTranscript(false);
      await refresh();
    };

    const handleGenerate = async () => {
      // Save any edits first
      if (editingTranscript) {
        await updateTranscriptEditedText(id, transcriptDraft);
        setEditingTranscript(false);
      }
      router.push({ pathname: '/processing', params: { sessionId: id } });
    };

    const handleReRecord = () => {
      Alert.alert('Re-record Session', 'This will discard the current transcript.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-record',
          style: 'destructive',
          onPress: () =>
            router.replace({ pathname: '/recording/[id]', params: { id } }),
        },
      ]);
    };

    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Patient banner */}
          <View style={styles.banner}>
            <Text style={styles.bannerName}>{session.patientName}</Text>
            <Text style={styles.bannerDate}>{formatDate(session.date)}</Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Session Transcript</Text>
            {!editingTranscript && (
              <TouchableOpacity
                onPress={() => {
                  setTranscriptDraft(transcriptText);
                  setEditingTranscript(true);
                }}
              >
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {editingTranscript ? (
            <TextInput
              style={styles.transcriptEdit}
              value={transcriptDraft}
              onChangeText={setTranscriptDraft}
              multiline
              autoFocus
            />
          ) : (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptText}>{transcriptText}</Text>
            </View>
          )}

          {transcript && (
            <Text style={styles.meta}>
              Duration: {formatDuration(transcript.durationSeconds)} · Words: {countWords(transcriptText)}
            </Text>
          )}
        </ScrollView>

        {/* Bottom action bar */}
        <View style={styles.bottomBar}>
          {editingTranscript ? (
            <>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditingTranscript(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveTranscript}>
                <Text style={styles.primaryBtnText}>Save Edits</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleReRecord}>
                <Text style={styles.secondaryBtnText}>Re-record</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerate}>
                <Text style={styles.primaryBtnText}>Generate Note</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── Note view ─────────────────────────────────────────────────────────────
  const note = session.note;
  if (!note) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No note found for this session.</Text>
      </View>
    );
  }

  const noteText = editingNote ? noteDraft : buildNoteText(note);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(buildNoteText(note));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({ message: buildNoteText(note), title: `${session.patientName} — ${session.date}` });
  };

  const handleSaveNote = async () => {
    await updateNoteEditedContent(note.id, noteDraft);
    setEditingNote(false);
    await refresh();
  };

  const handleRegenerate = () => {
    Alert.alert('Regenerate Note', 'The existing note will be replaced.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        onPress: () =>
          router.push({ pathname: '/processing', params: { sessionId: id } }),
      },
    ]);
  };

  const handleViewTranscript = () => {
    router.push({ pathname: '/session/[id]', params: { id, mode: 'transcript' } });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={handleCopy}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color={Colors.primary} />
            <Text style={styles.toolbarBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={Colors.primary} />
            <Text style={styles.toolbarBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={() => {
            setNoteDraft(buildNoteText(note));
            setEditingNote(true);
          }}>
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
            <Text style={styles.toolbarBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={handleRegenerate}>
            <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
            <Text style={styles.toolbarBtnText}>Redo</Text>
          </TouchableOpacity>
        </View>

        {/* Patient banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerName}>{session.patientName}</Text>
          <Text style={styles.bannerDate}>{formatDate(session.date)}</Text>
        </View>

        {editingNote ? (
          <TextInput
            style={styles.transcriptEdit}
            value={noteText}
            onChangeText={setNoteDraft}
            multiline
            autoFocus
          />
        ) : (
          <>
            <NoteSection label="Chief Complaint" content={note.chiefComplaint} />
            <NoteSection label="Clinical Findings" content={note.clinicalFindings} />
            <NoteSection label="Treatment Performed" content={note.treatmentPerformed} />
            <NoteSection label="Recommendations & Follow-up" content={note.recommendationsFollowUp} />
          </>
        )}

        <TouchableOpacity style={styles.viewTranscriptBtn} onPress={handleViewTranscript}>
          <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.viewTranscriptText}>View original transcript</Text>
        </TouchableOpacity>
      </ScrollView>

      {editingNote && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditingNote(false)}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveNote}>
            <Text style={styles.primaryBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function buildNoteText(note: NonNullable<ReturnType<typeof useSession>['session']>['note']): string {
  if (!note) return '';
  const edited = note.editedContent;
  if (edited) return edited;
  return [
    `CHIEF COMPLAINT\n${note.chiefComplaint}`,
    `CLINICAL FINDINGS\n${note.clinicalFindings}`,
    `TREATMENT PERFORMED\n${note.treatmentPerformed}`,
    `RECOMMENDATIONS & FOLLOW-UP\n${note.recommendationsFollowUp}`,
  ].join('\n\n');
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.md,
  },
  banner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  bannerDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  toolbarBtn: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
  },
  toolbarBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  transcriptBox: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  transcriptText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  transcriptEdit: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
    minHeight: 200,
    marginBottom: Spacing.sm,
    textAlignVertical: 'top',
  },
  meta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    padding: Spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  viewTranscriptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  viewTranscriptText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
