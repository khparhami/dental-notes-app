import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { insertSession } from '@/src/db/sessions';
import { Colors, FontSize, Spacing } from '@/src/theme';
import type { Session } from '@/src/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewSessionScreen() {
  const [patientName, setPatientName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!patientName.trim()) e.patientName = 'Patient name is required.';
    return e;
  };

  const handleStart = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    const now = new Date().toISOString();
    const session: Session = {
      id: generateId(),
      patientName: patientName.trim(),
      date,
      chiefComplaint: chiefComplaint.trim(),
      status: 'recording',
      createdAt: now,
      updatedAt: now,
    };
    await insertSession(session);
    router.push({ pathname: '/recording/[id]', params: { id: session.id } });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Field
            label="Patient Name *"
            placeholder="e.g. Jane Smith"
            value={patientName}
            onChangeText={(v) => { setPatientName(v); setErrors((e) => ({ ...e, patientName: '' })); }}
            autoCapitalize="words"
            error={errors.patientName}
          />
          <Field
            label="Date"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            keyboardType="numeric"
          />
          <Field
            label="Chief Complaint (optional)"
            placeholder="e.g. Toothache upper right"
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
            autoCapitalize="sentences"
          />
        </View>

        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>Start Recording Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'numeric';
  error?: string;
}

function Field({ label, placeholder, value, onChangeText, autoCapitalize, keyboardType, error }: FieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined]}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize ?? 'none'}
        keyboardType={keyboardType ?? 'default'}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    marginTop: 4,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  startButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
});
