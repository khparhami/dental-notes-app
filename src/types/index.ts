export interface Session {
  id: string;
  patientName: string;
  date: string; // "YYYY-MM-DD"
  chiefComplaint: string;
  status: 'recording' | 'transcript_ready' | 'note_generated';
  createdAt: string;
  updatedAt: string;
}

export interface Transcript {
  id: string;
  sessionId: string;
  fullText: string;
  durationSeconds: number;
  recordedAt: string;
  editedText: string | null;
}

export interface DentalNote {
  id: string;
  sessionId: string;
  patientName: string;
  date: string;
  chiefComplaint: string;
  clinicalFindings: string;
  treatmentPerformed: string;
  recommendationsFollowUp: string;
  rawContent: string;
  generatedAt: string;
  editedContent: string | null;
}

export interface SessionWithDetails extends Session {
  transcript: Transcript | null;
  note: DentalNote | null;
}
