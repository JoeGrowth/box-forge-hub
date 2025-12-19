import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export type JourneyType = "skill_ptc" | "idea_ptc" | "scaling_path";
export type JourneyStatus = "not_started" | "in_progress" | "pending_approval" | "approved" | "rejected";

export interface LearningJourney {
  id: string;
  user_id: string;
  journey_type: JourneyType;
  current_phase: number;
  status: JourneyStatus;
  started_at: string | null;
  completed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface JourneyPhaseResponse {
  id: string;
  journey_id: string;
  user_id: string;
  phase_number: number;
  phase_name: string;
  responses: Record<string, any>;
  completed_tasks: string[];
  uploaded_files: string[];
  notes: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCertification {
  id: string;
  user_id: string;
  certification_type: string;
  display_label: string;
  earned_at: string;
  verified: boolean;
}

// Phase definitions for each journey type
export const SKILL_PTC_PHASES = [
  {
    number: 0,
    name: "Skills Assessment",
    description: "Define your top skills and natural abilities",
    duration: "1-2 days",
    tasks: [
      { id: "identify_skills", label: "Identify your top 3-5 skills", type: "question" },
      { id: "skill_examples", label: "Provide examples of how you've used each skill", type: "question" },
      { id: "skill_passion", label: "Which skills do you enjoy using most?", type: "question" },
    ],
  },
  {
    number: 1,
    name: "Practice",
    description: "Learn the fundamentals of startup building",
    duration: "4-6 weeks",
    tasks: [
      { id: "core_methodology", label: "Complete core methodology training", type: "checklist" },
      { id: "framework_basics", label: "Learn B4 framework basics", type: "checklist" },
      { id: "self_assessment", label: "Complete self-assessment", type: "question" },
    ],
  },
  {
    number: 2,
    name: "Train",
    description: "Apply learning through real case studies",
    duration: "6-8 weeks",
    tasks: [
      { id: "case_study_1", label: "Complete case study project 1", type: "checklist" },
      { id: "case_study_2", label: "Complete case study project 2", type: "checklist" },
      { id: "portfolio", label: "Build your portfolio", type: "question" },
      { id: "peer_review", label: "Participate in peer review", type: "checklist" },
    ],
  },
  {
    number: 3,
    name: "Consult",
    description: "Mentor others and take on advisory roles",
    duration: "Ongoing",
    tasks: [
      { id: "mentoring_session", label: "Complete first mentoring session", type: "checklist" },
      { id: "advisory_role", label: "Take on an advisory role", type: "checklist" },
      { id: "certification_ready", label: "Ready for certification review", type: "checklist" },
    ],
  },
];

export const IDEA_PTC_PHASES = [
  {
    number: 0,
    name: "Ideation",
    description: "Define your vision, problem, and market opportunity",
    duration: "1-2 weeks",
    tasks: [
      { id: "vision", label: "Define your vision", type: "question" },
      { id: "problem", label: "Describe the problem you're solving", type: "question" },
      { id: "market", label: "Identify your target market", type: "question" },
    ],
  },
  {
    number: 1,
    name: "Structuring",
    description: "Build your business model and identify key roles",
    duration: "2-3 weeks",
    tasks: [
      { id: "business_model", label: "Define your business model", type: "question" },
      { id: "key_roles", label: "Identify key roles needed", type: "question" },
      { id: "value_proposition", label: "Articulate your value proposition", type: "question" },
    ],
  },
  {
    number: 2,
    name: "Team Building",
    description: "Find and onboard the right co-builders",
    duration: "3-4 weeks",
    tasks: [
      { id: "role_requirements", label: "Define role requirements", type: "question" },
      { id: "cobuilder_search", label: "Search for co-builders in directory", type: "checklist" },
      { id: "team_formation", label: "Form initial team", type: "checklist" },
    ],
  },
  {
    number: 3,
    name: "Launch",
    description: "Execute your plan with structured guidance",
    duration: "Ongoing",
    tasks: [
      { id: "execution_plan", label: "Create execution plan", type: "question" },
      { id: "milestone_1", label: "Complete first milestone", type: "checklist" },
      { id: "launch_ready", label: "Ready for launch review", type: "checklist" },
    ],
  },
];

export const SCALING_PATH_PHASES = [
  {
    number: 0,
    name: "Personal Entity",
    description: "Create your personal brand entity",
    duration: "2-4 weeks",
    tasks: [
      { id: "logo_name", label: "Create Logo & Name for your entity", type: "question" },
      { id: "services_3", label: "Define 3 core services", type: "question" },
      { id: "website_link", label: "Provide website link", type: "question" },
      { id: "missions_10", label: "List 10 missions delivered alone", type: "question" },
    ],
  },
  {
    number: 1,
    name: "Company Formation",
    description: "Establish your company with 70% ownership",
    duration: "4-6 weeks",
    tasks: [
      { id: "company_brand", label: "Create company Logo, Name & Brand", type: "question" },
      { id: "company_services", label: "Define services linked to natural role", type: "question" },
      { id: "company_website", label: "Set up company website", type: "question" },
      { id: "proposal_template", label: "Create Technical & Financial Proposal template", type: "question" },
      { id: "first_invoice", label: "Create first invoice with external contributors", type: "checklist" },
    ],
  },
  {
    number: 2,
    name: "Process Implementation",
    description: "Define and implement your process",
    duration: "6-8 weeks",
    tasks: [
      { id: "define_process", label: "Document 'The Process'", type: "question" },
      { id: "implement_process", label: "Implement the process", type: "checklist" },
      { id: "review_process", label: "Review the process", type: "question" },
      { id: "mission_external_internal", label: "Complete first mission with external and internal people", type: "checklist" },
    ],
  },
  {
    number: 3,
    name: "Optimization",
    description: "Optimize and deliver multiple missions",
    duration: "Ongoing",
    tasks: [
      { id: "optimize_process", label: "Optimize & enhance the process", type: "question" },
      { id: "optimize_implementation", label: "Optimize implementation", type: "question" },
      { id: "missions_3", label: "Complete 3 missions successfully", type: "checklist" },
      { id: "process_manager", label: "Hire/assign process manager", type: "checklist" },
    ],
  },
  {
    number: 4,
    name: "Scalability",
    description: "Achieve autonomous structure and operations",
    duration: "Ongoing",
    tasks: [
      { id: "final_optimize", label: "Final process optimization", type: "question" },
      { id: "final_implementation", label: "Final implementation optimization", type: "question" },
      { id: "missions_5", label: "Complete 5 missions successfully", type: "checklist" },
      { id: "structure_handler", label: "Hire/assign structure handler", type: "checklist" },
    ],
  },
];

interface LearningJourneysContextType {
  journeys: LearningJourney[];
  phaseResponses: JourneyPhaseResponse[];
  certifications: UserCertification[];
  loading: boolean;
  startJourney: (journeyType: JourneyType) => Promise<LearningJourney | null>;
  updatePhaseResponse: (
    journeyId: string,
    phaseNumber: number,
    phaseName: string,
    data: Partial<JourneyPhaseResponse>
  ) => Promise<void>;
  completePhase: (journeyId: string, phaseNumber: number) => Promise<void>;
  submitForApproval: (journeyId: string) => Promise<void>;
  getJourney: (journeyType: JourneyType) => LearningJourney | undefined;
  getPhaseResponse: (journeyId: string, phaseNumber: number) => JourneyPhaseResponse | undefined;
  refetch: () => Promise<void>;
}

const LearningJourneysContext = createContext<LearningJourneysContextType | null>(null);

export const LearningJourneysProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [journeys, setJourneys] = useState<LearningJourney[]>([]);
  const [phaseResponses, setPhaseResponses] = useState<JourneyPhaseResponse[]>([]);
  const [certifications, setCertifications] = useState<UserCertification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setJourneys([]);
      setPhaseResponses([]);
      setCertifications([]);
      setLoading(false);
      return;
    }

    try {
      const [journeysResult, responsesResult, certsResult] = await Promise.all([
        supabase
          .from("learning_journeys")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("journey_phase_responses")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("user_certifications")
          .select("*")
          .eq("user_id", user.id),
      ]);

      if (journeysResult.data) {
        setJourneys(journeysResult.data as LearningJourney[]);
      }
      if (responsesResult.data) {
        setPhaseResponses(responsesResult.data as JourneyPhaseResponse[]);
      }
      if (certsResult.data) {
        setCertifications(certsResult.data as UserCertification[]);
      }
    } catch (error) {
      console.error("Error fetching learning journeys:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startJourney = async (journeyType: JourneyType): Promise<LearningJourney | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("learning_journeys")
        .insert({
          user_id: user.id,
          journey_type: journeyType,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const journey = data as LearningJourney;
      setJourneys((prev) => [...prev, journey]);

      toast({
        title: "Journey Started",
        description: `You've started your ${journeyType.replace("_", " ").toUpperCase()} journey!`,
      });

      return journey;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start journey",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePhaseResponse = async (
    journeyId: string,
    phaseNumber: number,
    phaseName: string,
    data: Partial<JourneyPhaseResponse>
  ) => {
    if (!user) return;

    try {
      const existing = phaseResponses.find(
        (r) => r.journey_id === journeyId && r.phase_number === phaseNumber
      );

      if (existing) {
        const { error } = await supabase
          .from("journey_phase_responses")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;

        setPhaseResponses((prev) =>
          prev.map((r) => (r.id === existing.id ? { ...r, ...data } : r))
        );
      } else {
        const { data: newResponse, error } = await supabase
          .from("journey_phase_responses")
          .insert({
            journey_id: journeyId,
            user_id: user.id,
            phase_number: phaseNumber,
            phase_name: phaseName,
            ...data,
          })
          .select()
          .single();

        if (error) throw error;

        setPhaseResponses((prev) => [...prev, newResponse as JourneyPhaseResponse]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save progress",
        variant: "destructive",
      });
    }
  };

  const completePhase = async (journeyId: string, phaseNumber: number) => {
    if (!user) return;

    try {
      // Mark phase as completed
      const existing = phaseResponses.find(
        (r) => r.journey_id === journeyId && r.phase_number === phaseNumber
      );

      if (existing) {
        await supabase
          .from("journey_phase_responses")
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }

      // Update journey current phase
      const journey = journeys.find((j) => j.id === journeyId);
      if (journey) {
        await supabase
          .from("learning_journeys")
          .update({
            current_phase: phaseNumber + 1,
          })
          .eq("id", journeyId);

        setJourneys((prev) =>
          prev.map((j) =>
            j.id === journeyId ? { ...j, current_phase: phaseNumber + 1 } : j
          )
        );
      }

      await fetchData();

      toast({
        title: "Phase Completed",
        description: "You've completed this phase! Moving to the next one.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete phase",
        variant: "destructive",
      });
    }
  };

  const submitForApproval = async (journeyId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("learning_journeys")
        .update({
          status: "pending_approval",
          completed_at: new Date().toISOString(),
        })
        .eq("id", journeyId);

      if (error) throw error;

      // Create admin notification
      const journey = journeys.find((j) => j.id === journeyId);
      await supabase.from("admin_notifications").insert({
        user_id: user.id,
        notification_type: "journey_approval_request",
        message: `User has completed their ${journey?.journey_type.replace("_", " ").toUpperCase()} journey and is awaiting approval.`,
      });

      setJourneys((prev) =>
        prev.map((j) =>
          j.id === journeyId
            ? { ...j, status: "pending_approval", completed_at: new Date().toISOString() }
            : j
        )
      );

      toast({
        title: "Submitted for Approval",
        description: "Your journey has been submitted for admin review.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit for approval",
        variant: "destructive",
      });
    }
  };

  const getJourney = (journeyType: JourneyType) => {
    return journeys.find((j) => j.journey_type === journeyType);
  };

  const getPhaseResponse = (journeyId: string, phaseNumber: number) => {
    return phaseResponses.find(
      (r) => r.journey_id === journeyId && r.phase_number === phaseNumber
    );
  };

  return (
    <LearningJourneysContext.Provider
      value={{
        journeys,
        phaseResponses,
        certifications,
        loading,
        startJourney,
        updatePhaseResponse,
        completePhase,
        submitForApproval,
        getJourney,
        getPhaseResponse,
        refetch: fetchData,
      }}
    >
      {children}
    </LearningJourneysContext.Provider>
  );
};

export const useLearningJourneys = () => {
  const context = useContext(LearningJourneysContext);
  if (!context) {
    throw new Error("useLearningJourneys must be used within a LearningJourneysProvider");
  }
  return context;
};
