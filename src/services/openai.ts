import OpenAI from 'openai';
import { loadApiKey } from './apiKey';
import type { Session } from '../types';

const SYSTEM_PROMPT = `You are a clinical documentation assistant for a licensed dentist.
You will receive a raw, unedited transcript of a live patient-dentist conversation.
Your task is to extract clinically relevant information and produce a structured professional dental progress note.

Output ONLY valid JSON with this exact shape (no markdown, no prose outside the JSON):
{
  "chiefComplaint": "...",
  "clinicalFindings": "...",
  "treatmentPerformed": "...",
  "recommendationsFollowUp": "..."
}

Guidelines:
- Convert casual patient language to precise dental terminology (e.g., "it hurts on the upper right when I bite" → "Patient reports occlusal sensitivity in the maxillary right quadrant").
- Include only facts mentioned in the transcript — never invent clinical details.
- If a field has no relevant information, write "Not documented in session transcript".
- Ignore small talk, scheduling discussion, and non-clinical conversation.
- Use objective third-person clinical tone throughout.
- Expand dental abbreviations (MOD, RCT, SRP, BWX, PFM, etc.).
- chiefComplaint: 1–2 sentences summarizing the patient's reported concern.
- clinicalFindings: dentist's observations, exam findings, and any radiographic findings mentioned.
- treatmentPerformed: each procedure with tooth numbers and surfaces where stated.
- recommendationsFollowUp: home care instructions, prescriptions, and next visit recommendations.`;

export interface GeneratedNoteContent {
  chiefComplaint: string;
  clinicalFindings: string;
  treatmentPerformed: string;
  recommendationsFollowUp: string;
  rawContent: string;
}

export async function generateDentalNote(
  session: Session,
  transcriptText: string
): Promise<GeneratedNoteContent> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add it in Settings.');
  }

  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
    // dangerouslyAllowBrowser is required by the SDK when running outside Node.js.
    // The key is stored in SecureStore and sent directly to api.openai.com over HTTPS.
    // In production, route through a HIPAA-compliant proxy instead.
  });

  const userMessage = `Patient: ${session.patientName}
Date: ${session.date}
Chief Complaint (from intake): ${session.chiefComplaint || 'Not specified'}

Session transcript:
"""
${transcriptText}
"""

Generate the structured dental progress note as JSON.`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? '';

  let parsed: Omit<GeneratedNoteContent, 'rawContent'>;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  return {
    chiefComplaint: parsed.chiefComplaint ?? '',
    clinicalFindings: parsed.clinicalFindings ?? '',
    treatmentPerformed: parsed.treatmentPerformed ?? '',
    recommendationsFollowUp: parsed.recommendationsFollowUp ?? '',
    rawContent,
  };
}
