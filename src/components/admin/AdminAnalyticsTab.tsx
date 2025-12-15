import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Users,
  Rocket,
  TrendingUp,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  totalUsers: number;
  approvedCobuilders: number;
  pendingApprovals: number;
  totalOpportunities: number;
  approvedOpportunities: number;
  pendingOpportunities: number;
  totalJourneyResponses: number;
  completedJourneys: number;
  inProgressJourneys: number;
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
}

export function AdminAnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    totalUsers: 0,
    approvedCobuilders: 0,
    pendingApprovals: 0,
    totalOpportunities: 0,
    approvedOpportunities: 0,
    pendingOpportunities: 0,
    totalJourneyResponses: 0,
    completedJourneys: 0,
    inProgressJourneys: 0,
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch user counts
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch approved co-builders
      const { count: approvedCobuilders } = await supabase
        .from("onboarding_state")
        .select("*", { count: "exact", head: true })
        .in("journey_status", ["approved", "entrepreneur_approved"]);

      // Fetch pending approvals
      const { count: pendingApprovals } = await supabase
        .from("onboarding_state")
        .select("*", { count: "exact", head: true })
        .eq("journey_status", "pending_approval");

      // Fetch opportunity counts
      const { count: totalOpportunities } = await supabase
        .from("startup_ideas")
        .select("*", { count: "exact", head: true });

      const { count: approvedOpportunities } = await supabase
        .from("startup_ideas")
        .select("*", { count: "exact", head: true })
        .eq("review_status", "approved");

      const { count: pendingOpportunities } = await supabase
        .from("startup_ideas")
        .select("*", { count: "exact", head: true })
        .in("review_status", ["pending", "under_review"]);

      // Fetch journey response counts
      const { data: journeyResponses } = await supabase
        .from("entrepreneur_journey_responses")
        .select("vision, problem, market, business_model, roles_needed, cobuilder_plan, execution_plan");

      const totalJourneyResponses = journeyResponses?.length || 0;
      let completedJourneys = 0;
      let inProgressJourneys = 0;

      journeyResponses?.forEach((response) => {
        const filledFields = [
          response.vision,
          response.problem,
          response.market,
          response.business_model,
          response.roles_needed,
          response.cobuilder_plan,
          response.execution_plan,
        ].filter(Boolean).length;

        if (filledFields === 7) {
          completedJourneys++;
        } else if (filledFields > 0) {
          inProgressJourneys++;
        }
      });

      // Fetch application counts
      const { count: totalApplications } = await supabase
        .from("startup_applications")
        .select("*", { count: "exact", head: true });

      const { count: pendingApplications } = await supabase
        .from("startup_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: acceptedApplications } = await supabase
        .from("startup_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted");

      setData({
        totalUsers: totalUsers || 0,
        approvedCobuilders: approvedCobuilders || 0,
        pendingApprovals: pendingApprovals || 0,
        totalOpportunities: totalOpportunities || 0,
        approvedOpportunities: approvedOpportunities || 0,
        pendingOpportunities: pendingOpportunities || 0,
        totalJourneyResponses,
        completedJourneys,
        inProgressJourneys,
        totalApplications: totalApplications || 0,
        pendingApplications: pendingApplications || 0,
        acceptedApplications: acceptedApplications || 0,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-b4-teal" />
      </div>
    );
  }

  const journeyCompletionRate = data.totalJourneyResponses > 0 
    ? Math.round((data.completedJourneys / data.totalJourneyResponses) * 100) 
    : 0;

  const opportunityApprovalRate = data.totalOpportunities > 0 
    ? Math.round((data.approvedOpportunities / data.totalOpportunities) * 100) 
    : 0;

  const applicationAcceptanceRate = data.totalApplications > 0 
    ? Math.round((data.acceptedApplications / data.totalApplications) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-b4-teal" />
          <h3 className="font-semibold text-foreground">Platform Analytics</h3>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {data.approvedCobuilders} approved co-builders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalOpportunities}</div>
            <p className="text-xs text-muted-foreground">
              {data.approvedOpportunities} approved, {data.pendingOpportunities} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Journey Responses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalJourneyResponses}</div>
            <p className="text-xs text-muted-foreground">
              {data.completedJourneys} completed, {data.inProgressJourneys} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              {data.pendingApplications} pending, {data.acceptedApplications} accepted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-b4-teal" />
              Journey Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{journeyCompletionRate}%</span>
              <span className="text-xs text-muted-foreground">
                {data.completedJourneys} / {data.totalJourneyResponses}
              </span>
            </div>
            <Progress value={journeyCompletionRate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Rocket className="w-4 h-4 text-b4-teal" />
              Opportunity Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{opportunityApprovalRate}%</span>
              <span className="text-xs text-muted-foreground">
                {data.approvedOpportunities} / {data.totalOpportunities}
              </span>
            </div>
            <Progress value={opportunityApprovalRate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-b4-teal" />
              Application Acceptance Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{applicationAcceptanceRate}%</span>
              <span className="text-xs text-muted-foreground">
                {data.acceptedApplications} / {data.totalApplications}
              </span>
            </div>
            <Progress value={applicationAcceptanceRate} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">User Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-b4-teal"></div>
                <span className="text-sm">Approved Co-Builders</span>
              </div>
              <span className="font-medium">{data.approvedCobuilders}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm">Pending Approval</span>
              </div>
              <span className="font-medium">{data.pendingApprovals}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                <span className="text-sm">Other Users</span>
              </div>
              <span className="font-medium">
                {data.totalUsers - data.approvedCobuilders - data.pendingApprovals}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Opportunity Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-b4-teal"></div>
                <span className="text-sm">Approved</span>
              </div>
              <span className="font-medium">{data.approvedOpportunities}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm">Pending Review</span>
              </div>
              <span className="font-medium">{data.pendingOpportunities}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                <span className="text-sm">Other</span>
              </div>
              <span className="font-medium">
                {data.totalOpportunities - data.approvedOpportunities - data.pendingOpportunities}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
