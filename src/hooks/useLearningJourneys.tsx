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
      { 
        id: "identify_skills", 
        label: "Identify your top 3-5 skills", 
        type: "question",
        description: "List the skills you excel at and that come naturally to you. Consider technical skills, soft skills, and domain expertise. What do people often come to you for help with?"
      },
      { 
        id: "skill_examples", 
        label: "Provide examples of how you've used each skill", 
        type: "question",
        description: "For each skill you listed, describe a specific situation where you applied it successfully. Include the context, what you did, and the outcome achieved."
      },
      { 
        id: "skill_passion", 
        label: "Which skills do you enjoy using most?", 
        type: "question",
        description: "Identify which of your skills energize you the most. When do you feel most engaged and in flow? These often point to your natural role within a startup team."
      },
    ],
  },
  {
    number: 1,
    name: "Practice",
    description: "Learn the fundamentals of startup building and the B4 methodology",
    duration: "4-6 weeks",
    tasks: [
      { 
        id: "core_methodology", 
        label: "Complete core methodology training", 
        type: "checklist",
        description: "Study and understand the core principles of startup building, lean methodology, and agile practices that form the foundation of B4's approach."
      },
      { 
        id: "framework_basics", 
        label: "Learn B4 framework basics", 
        type: "checklist",
        description: "Master the B4 framework fundamentals: understanding natural roles, co-builder collaboration model, and the Practice-Train-Consult progression."
      },
      { 
        id: "self_assessment", 
        label: "Complete self-assessment", 
        type: "question",
        description: "Reflect on your learning journey: What key insights have you gained from the methodology training? How do you see your natural role fitting into the B4 framework? What areas do you feel confident in, and where do you need more practice?"
      },
    ],
  },
  {
    number: 2,
    name: "Train",
    description: "Apply your learning through real-world case studies and build your professional portfolio",
    duration: "6-8 weeks",
    tasks: [
      { 
        id: "case_study_1", 
        label: "Complete case study project 1", 
        type: "checklist",
        description: "Work through your first real-world case study. Apply the B4 methodology to analyze a startup challenge, identify key issues, and propose actionable solutions."
      },
      { 
        id: "case_study_2", 
        label: "Complete case study project 2", 
        type: "checklist",
        description: "Take on a more complex case study. Demonstrate deeper understanding by tackling a multi-faceted startup scenario that requires cross-functional thinking."
      },
      { 
        id: "portfolio", 
        label: "Build your professional portfolio", 
        type: "question",
        description: "Showcase your expertise: Describe your completed case studies, key learnings, and how you've applied the B4 methodology. Include links to any relevant work samples or documentation you've created."
      },
      { 
        id: "peer_review", 
        label: "Participate in peer review", 
        type: "checklist",
        description: "Engage with fellow co-builders by reviewing their case study work. Provide constructive feedback and learn from different perspectives and approaches."
      },
    ],
  },
  {
    number: 3,
    name: "Consult",
    description: "Share your expertise by mentoring others and taking on advisory responsibilities",
    duration: "Ongoing",
    tasks: [
      { 
        id: "mentoring_session", 
        label: "Complete first mentoring session", 
        type: "checklist",
        description: "Guide a newer co-builder through their journey. Share your experience, answer their questions, and help them navigate the Practice or Train phase."
      },
      { 
        id: "advisory_role", 
        label: "Take on an advisory role", 
        type: "checklist",
        description: "Step into a formal advisory position for a startup or project. Provide strategic guidance based on your natural role expertise and B4 methodology knowledge."
      },
      { 
        id: "certification_ready", 
        label: "Ready for certification review", 
        type: "checklist",
        description: "Confirm you have completed all requirements and are ready for admin review. Your mentoring and advisory contributions will be evaluated for certification approval."
      },
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
      { 
        id: "vision", 
        label: "Define your vision", 
        type: "question",
        description: "Paint a picture of the future you want to create. What does success look like in 5 years? How will the world be different because of your startup?"
      },
      { 
        id: "problem", 
        label: "Describe the problem you're solving", 
        type: "question",
        description: "Clearly articulate the pain point or gap in the market. Who experiences this problem? How severe is it? What are the consequences of not solving it?"
      },
      { 
        id: "market", 
        label: "Identify your target market", 
        type: "question",
        description: "Define your ideal customer profile. What are their demographics, behaviors, and needs? How large is this market segment and what's its growth potential?"
      },
    ],
  },
  {
    number: 1,
    name: "Structuring",
    description: "Build your business model and identify key roles",
    duration: "2-3 weeks",
    tasks: [
      { 
        id: "business_model", 
        label: "Define your business model", 
        type: "question",
        description: "How will your startup make money? Describe your revenue streams, pricing strategy, and cost structure. What makes your model sustainable and scalable?"
      },
      { 
        id: "key_roles", 
        label: "Identify key roles needed", 
        type: "question",
        description: "What natural roles are essential to execute your vision? Consider technical, creative, operational, and strategic needs. Which roles are most critical in the early stages?"
      },
      { 
        id: "value_proposition", 
        label: "Articulate your value proposition", 
        type: "question",
        description: "What unique value do you offer that competitors don't? Why should customers choose you? Craft a clear, compelling statement that resonates with your target market."
      },
    ],
  },
  {
    number: 2,
    name: "Team Building",
    description: "Find and onboard the right co-builders",
    duration: "3-4 weeks",
    tasks: [
      { 
        id: "role_requirements", 
        label: "Define role requirements", 
        type: "question",
        description: "For each key role, specify the skills, experience, and qualities you're looking for. What does an ideal candidate look like? What are must-haves vs. nice-to-haves?"
      },
      { 
        id: "cobuilder_search", 
        label: "Search for co-builders in directory", 
        type: "checklist",
        description: "Use the B4 co-builder directory to find potential team members. Review profiles, natural roles, and certifications. Reach out to candidates who match your requirements."
      },
      { 
        id: "team_formation", 
        label: "Form initial team", 
        type: "checklist",
        description: "Assemble your founding team. Ensure complementary skills and shared values. Establish clear roles, responsibilities, and decision-making processes from the start."
      },
    ],
  },
  {
    number: 3,
    name: "Launch",
    description: "Execute your plan with structured guidance",
    duration: "Ongoing",
    tasks: [
      { 
        id: "execution_plan", 
        label: "Create execution plan", 
        type: "question",
        description: "Develop a detailed roadmap for your first 90 days. Break down major milestones into actionable tasks. Assign owners and deadlines to maintain accountability."
      },
      { 
        id: "milestone_1", 
        label: "Complete first milestone", 
        type: "checklist",
        description: "Achieve your first significant milestone—whether it's launching an MVP, acquiring initial customers, or securing funding. Document learnings and adjust your plan accordingly."
      },
      { 
        id: "launch_ready", 
        label: "Ready for launch review", 
        type: "checklist",
        description: "Prepare for admin review by documenting your progress, team formation, and key achievements. Demonstrate readiness to move from planning to full execution."
      },
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
      { 
        id: "logo_name", 
        label: "Create Logo & Name for your entity", 
        type: "question",
        description: "Design a professional identity that represents your natural role and expertise. Your logo and name should be memorable, relevant to your services, and resonate with your target clients."
      },
      { 
        id: "services_3", 
        label: "Define 3 core services", 
        type: "question",
        description: "Identify three distinct services you can offer based on your natural role. Each service should solve a specific problem and have a clear deliverable and value proposition."
      },
      { 
        id: "website_link", 
        label: "Provide website link", 
        type: "question",
        description: "Create a professional online presence showcasing your services, experience, and portfolio. Include contact information and clear calls-to-action for potential clients."
      },
      { 
        id: "missions_10", 
        label: "List 10 missions delivered alone", 
        type: "question",
        description: "Document 10 projects or engagements you've completed independently. Include client type, scope, outcomes, and key learnings. This demonstrates your ability to deliver value solo."
      },
    ],
  },
  {
    number: 1,
    name: "Company Formation",
    description: "Establish your company with 70% ownership",
    duration: "4-6 weeks",
    tasks: [
      { 
        id: "company_brand", 
        label: "Create company Logo, Name & Brand", 
        type: "question",
        description: "Develop a distinct company identity separate from your personal brand. The company brand should reflect your expanded capabilities and appeal to larger clients and projects."
      },
      { 
        id: "company_services", 
        label: "Define services linked to natural role", 
        type: "question",
        description: "Expand your service offerings while staying true to your natural role expertise. Consider how you can package your knowledge to serve multiple clients or larger engagements."
      },
      { 
        id: "company_website", 
        label: "Set up company website", 
        type: "question",
        description: "Launch a professional company website with detailed service pages, case studies, team information, and a clear value proposition for enterprise clients."
      },
      { 
        id: "proposal_template", 
        label: "Create Technical & Financial Proposal template", 
        type: "question",
        description: "Develop standardized templates for client proposals. Include sections for scope, methodology, timeline, deliverables, pricing, and terms. Ensure professional formatting and branding."
      },
      { 
        id: "first_invoice", 
        label: "Create first invoice with external contributors", 
        type: "checklist",
        description: "Complete your first project that involves coordinating with external contributors. Handle invoicing, payments, and contractor relationships professionally."
      },
    ],
  },
  {
    number: 2,
    name: "Process Implementation",
    description: "Define and implement your process",
    duration: "6-8 weeks",
    tasks: [
      { 
        id: "define_process", 
        label: "Document 'The Process'", 
        type: "question",
        description: "Create comprehensive documentation of your methodology. Define each step, expected inputs/outputs, quality standards, and success criteria. Make it teachable to others."
      },
      { 
        id: "implement_process", 
        label: "Implement the process", 
        type: "checklist",
        description: "Put your documented process into action on real projects. Use tools, templates, and workflows that support consistent execution across all engagements."
      },
      { 
        id: "review_process", 
        label: "Review the process", 
        type: "question",
        description: "Evaluate process effectiveness after initial implementation. What worked well? What needs improvement? Gather feedback from team members and clients."
      },
      { 
        id: "mission_external_internal", 
        label: "Complete first mission with external and internal people", 
        type: "checklist",
        description: "Successfully deliver a project with a mixed team of internal staff and external contributors. Demonstrate your ability to coordinate complex team structures."
      },
    ],
  },
  {
    number: 3,
    name: "Optimization",
    description: "Optimize and deliver multiple missions",
    duration: "Ongoing",
    tasks: [
      { 
        id: "optimize_process", 
        label: "Optimize & enhance the process", 
        type: "question",
        description: "Based on learnings, refine your process for efficiency and quality. Identify bottlenecks, automate repetitive tasks, and strengthen areas that produced the best results."
      },
      { 
        id: "optimize_implementation", 
        label: "Optimize implementation", 
        type: "question",
        description: "Improve how your team executes the process. Enhance training materials, communication protocols, and project management practices for smoother delivery."
      },
      { 
        id: "missions_3", 
        label: "Complete 3 missions successfully", 
        type: "checklist",
        description: "Deliver three successful projects using your optimized process. Track metrics like client satisfaction, timeline adherence, and team efficiency."
      },
      { 
        id: "process_manager", 
        label: "Hire/assign process manager", 
        type: "checklist",
        description: "Bring on a dedicated process manager to oversee daily operations. This person ensures consistent execution while you focus on strategy and business development."
      },
    ],
  },
  {
    number: 4,
    name: "Scalability",
    description: "Achieve autonomous structure and operations",
    duration: "Ongoing",
    tasks: [
      { 
        id: "final_optimize", 
        label: "Final process optimization", 
        type: "question",
        description: "Make final refinements to achieve a fully scalable process. Ensure it can handle increased volume without proportional increases in your personal involvement."
      },
      { 
        id: "final_implementation", 
        label: "Final implementation optimization", 
        type: "question",
        description: "Optimize your organizational structure for autonomous operations. Document decision-making frameworks, escalation paths, and quality assurance checkpoints."
      },
      { 
        id: "missions_5", 
        label: "Complete 5 missions successfully", 
        type: "checklist",
        description: "Achieve five successful project completions with your scaled structure. Demonstrate that quality and client satisfaction remain high as you grow."
      },
      { 
        id: "structure_handler", 
        label: "Hire/assign structure handler", 
        type: "checklist",
        description: "Recruit a senior leader to manage overall company operations. This role handles strategic coordination, allowing you to focus on vision and growth opportunities."
      },
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
