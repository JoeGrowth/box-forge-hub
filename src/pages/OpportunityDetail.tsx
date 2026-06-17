import { useParams, Navigate } from "react-router-dom";
import StartupOpportunityDetail from "./StartupOpportunityDetail";
import GenericOpportunityDetail from "@/components/opportunities/GenericOpportunityDetail";

// Unified dispatcher: /opportunities/:category/:id
// Truth surface for every opportunity node. Card = preview only.
// Legacy /opportunities/:id (no category) is handled by an App-level redirect
// that defaults to "startup", preserving prior links.
const OpportunityDetail = () => {
  const { category, id } = useParams<{ category?: string; id: string }>();

  if (!id) return <Navigate to="/opportunities" replace />;

  const cat = (category ?? "startup").toLowerCase();

  if (cat === "startup") {
    return <StartupOpportunityDetail />;
  }
  if (cat === "job" || cat === "training" || cat === "tender" || cat === "consulting") {
    return <GenericOpportunityDetail category={cat} id={id} />;
  }
  return <Navigate to="/opportunities" replace />;
};

export default OpportunityDetail;
