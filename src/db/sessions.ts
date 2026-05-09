import { getDatabase } from './database';
import type { Session, Transcript, DentalNote, SessionWithDetails } from '../types';

export async function getAllSessions(): Promise<SessionWithDetails[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(`
    SELECT
      s.*,
      t.id AS tId, t.fullText, t.durationSeconds, t.recordedAt, t.editedText,
      n.id AS nId, n.patientName AS nPatient, n.date AS nDate,
      n.chiefComplaint AS nCC, n.clinicalFindings, n.treatmentPerformed,
      n.recommendationsFollowUp, n.rawContent, n.generatedAt, n.editedContent
    FROM sessions s
    LEFT JOIN transcripts t ON t.sessionId = s.id
    LEFT JOIN notes n ON n.sessionId = s.id
    ORDER BY s.date DESC, s.createdAt DESC
  `);
  return rows.map(mapRow);
}

export async function getSessionById(id: string): Promise<SessionWithDetails | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(`
    SELECT
      s.*,
      t.id AS tId, t.fullText, t.durationSeconds, t.recordedAt, t.editedText,
      n.id AS nId, n.patientName AS nPatient, n.date AS nDate,
      n.chiefComplaint AS nCC, n.clinicalFindings, n.treatmentPerformed,
      n.recommendationsFollowUp, n.rawContent, n.generatedAt, n.editedContent
    FROM sessions s
    LEFT JOIN transcripts t ON t.sessionId = s.id
    LEFT JOIN notes n ON n.sessionId = s.id
    WHERE s.id = ?
  `, [id]);
  return row ? mapRow(row) : null;
}

export async function insertSession(session: Session): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sessions (id, patientName, date, chiefComplaint, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [session.id, session.patientName, session.date, session.chiefComplaint,
     session.status, session.createdAt, session.updatedAt]
  );
}

export async function updateSessionStatus(id: string, status: Session['status']): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE sessions SET status = ?, updatedAt = ? WHERE id = ?',
    [status, new Date().toISOString(), id]
  );
}

export async function insertTranscript(transcript: Transcript): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO transcripts (id, sessionId, fullText, durationSeconds, recordedAt, editedText)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [transcript.id, transcript.sessionId, transcript.fullText,
     transcript.durationSeconds, transcript.recordedAt, transcript.editedText]
  );
}

export async function updateTranscriptEditedText(sessionId: string, editedText: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE transcripts SET editedText = ? WHERE sessionId = ?',
    [editedText, sessionId]
  );
}

export async function insertNote(note: DentalNote): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO notes
     (id, sessionId, patientName, date, chiefComplaint, clinicalFindings,
      treatmentPerformed, recommendationsFollowUp, rawContent, generatedAt, editedContent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [note.id, note.sessionId, note.patientName, note.date, note.chiefComplaint,
     note.clinicalFindings, note.treatmentPerformed, note.recommendationsFollowUp,
     note.rawContent, note.generatedAt, note.editedContent]
  );
}

export async function updateNoteEditedContent(noteId: string, editedContent: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE notes SET editedContent = ? WHERE id = ?',
    [editedContent, noteId]
  );
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

function mapRow(row: any): SessionWithDetails {
  const session: Session = {
    id: row.id,
    patientName: row.patientName,
    date: row.date,
    chiefComplaint: row.chiefComplaint,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  const transcript: Transcript | null = row.tId ? {
    id: row.tId,
    sessionId: row.id,
    fullText: row.fullText,
    durationSeconds: row.durationSeconds,
    recordedAt: row.recordedAt,
    editedText: row.editedText,
  } : null;

  const note: DentalNote | null = row.nId ? {
    id: row.nId,
    sessionId: row.id,
    patientName: row.nPatient,
    date: row.nDate,
    chiefComplaint: row.nCC,
    clinicalFindings: row.clinicalFindings,
    treatmentPerformed: row.treatmentPerformed,
    recommendationsFollowUp: row.recommendationsFollowUp,
    rawContent: row.rawContent,
    generatedAt: row.generatedAt,
    editedContent: row.editedContent,
  } : null;

  return { ...session, transcript, note };
}
