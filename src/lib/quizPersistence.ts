import { supabase } from "@/integrations/supabase/client";

/**
 * localStorage-based draft persistence for quiz dialogs.
 * Prevents losing typed answers when the browser tab is switched
 * or the component re-renders due to focus / auth-refresh events.
 */
export const quizStorageKey = (
  userId: string,
  journeyType: string,
  stepNumber: number,
) => `b4:quiz-draft:${userId}:${journeyType}:${stepNumber}`;

export function loadQuizDraft<T = any>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export function saveQuizDraft(key: string, snapshot: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // ignore quota / access errors
  }
}

export function clearQuizDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Fetch an existing phase response for a completed step so the
 * dialog can render in read-only "review" mode.
 */
export async function fetchExistingPhaseResponse(
  journeyId: string,
  phaseNumber: number,
) {
  const { data } = await supabase
    .from("journey_phase_responses")
    .select("responses, is_completed, completed_at")
    .eq("journey_id", journeyId)
    .eq("phase_number", phaseNumber)
    .maybeSingle();
  return data;
}

/**
 * Extract raw {quizId: answer} map from a stored phase response.
 * Stored shape: { quiz_<id>: { question, type, answer, isCorrect } }
 */
export function extractAnswers(
  responses: Record<string, any> | null | undefined,
): Record<string, any> {
  if (!responses) return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(responses)) {
    if (k.startsWith("quiz_") && v && typeof v === "object" && "answer" in v) {
      out[k.replace(/^quiz_/, "")] = (v as any).answer;
    }
  }
  return out;
}
