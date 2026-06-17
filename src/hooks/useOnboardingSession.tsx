import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// P0.6 — Compressed onboarding session tracking.
// Stores progression through the 5-step flow. NOT a source of truth for
// professional state — that is derived from graph data via compute_user_state.

export interface OnboardingSession {
  id: string;
  user_id: string;
  current_step: number;
  completed_steps: number[];
  onboarding_intent: string | null;
  goal: string | null;
  availability: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
  abandoned_at: string | null;
}

async function emitEvent(
  userId: string,
  eventType:
    | "onboarding_started"
    | "onboarding_step_completed"
    | "onboarding_completed"
    | "first_recommendations_viewed"
    | "first_recommendation_clicked"
    | "cold_start_updated"
    | "cold_start_seeded",
  payload: Record<string, unknown> = {},
  aggregateId?: string,
) {
  await supabase.from("graph_events").insert({
    user_id: userId,
    event_type: eventType as never,
    event_version: 1,
    aggregate_type: "onboarding",
    aggregate_id: aggregateId ?? userId,
    source_module: "compressed_onboarding",
    idempotency_key: `${eventType}:v1:${userId}:${aggregateId ?? "session"}:${Date.now()}`,
    payload: payload as never,
    weight: 1,
    occurred_at: new Date().toISOString(),
  });
}

export function useOnboardingSession() {
  return useQuery({
    queryKey: ["onboarding_session"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("onboarding_sessions")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as OnboardingSession | null) ?? null;
    },
  });
}

export function useStartOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("onboarding_sessions")
        .upsert(
          [{ user_id: uid, current_step: 1, completed_steps: [] as never }],
          { onConflict: "user_id", ignoreDuplicates: false },
        )
        .select()
        .single();
      if (error) throw error;
      await emitEvent(uid, "onboarding_started");
      return data as unknown as OnboardingSession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding_session"] }),
  });
}

export function useCompleteStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      step: number;
      patch?: Partial<Pick<OnboardingSession, "onboarding_intent" | "goal" | "availability">>;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("onboarding_sessions")
        .select("completed_steps,current_step")
        .eq("user_id", uid)
        .maybeSingle();
      const completed = new Set<number>(
        ((existing?.completed_steps as unknown as number[]) ?? []).concat(input.step),
      );
      const isFinal = input.step >= 5;

      const { error } = await supabase
        .from("onboarding_sessions")
        .update({
          current_step: Math.min(6, input.step + 1),
          completed_steps: Array.from(completed) as never,
          completed_at: isFinal ? new Date().toISOString() : null,
          ...(input.patch ?? {}),
        })
        .eq("user_id", uid);
      if (error) throw error;

      await emitEvent(uid, "onboarding_step_completed", { step: input.step });
      if (isFinal) await emitEvent(uid, "onboarding_completed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding_session"] }),
  });
}

export function useEmitOnboardingEvent() {
  return useMutation({
    mutationFn: async (input: {
      type:
        | "first_recommendations_viewed"
        | "first_recommendation_clicked"
        | "cold_start_updated"
        | "cold_start_seeded";
      payload?: Record<string, unknown>;
      aggregateId?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      await emitEvent(uid, input.type, input.payload ?? {}, input.aggregateId);
    },
  });
}

export function useUserState() {
  return useQuery({
    queryKey: ["user_state_derived"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase.rpc("compute_user_state", { _user_id: uid });
      if (error) throw error;
      return data as unknown as {
        state: string;
        recommended_flow: string;
        signals: Record<string, number | boolean>;
      };
    },
  });
}
