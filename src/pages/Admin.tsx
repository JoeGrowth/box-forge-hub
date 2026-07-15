import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { AdminNotificationsTab } from "@/components/admin/AdminNotificationsTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminApplicationsTab } from "@/components/admin/AdminApplicationsTab";
import { AdminApprovalsTab } from "@/components/admin/AdminApprovalsTab";
import { AdminOpportunitiesTab } from "@/components/admin/AdminOpportunitiesTab";
import { AdminJourneyResponsesTab } from "@/components/admin/AdminJourneyResponsesTab";
import { AdminAnalyticsTab } from "@/components/admin/AdminAnalyticsTab";
import { AdminLearningJourneysTab } from "@/components/admin/AdminLearningJourneysTab";
import { AdminNRDecoderTab } from "@/components/admin/AdminNRDecoderTab";
import { AdminTrainingsTab } from "@/components/admin/AdminTrainingsTab";
import { AdminBoxesTab } from "@/components/admin/AdminBoxesTab";
import { AdminBugsTab } from "@/components/admin/AdminBugsTab";
import {
  Shield,
  Users,
  UserCheck,
  Rocket,
  ClipboardList,
  BarChart3,
  GraduationCap,
  Package,
  FileText,
  Award,
  ShieldCheck,
  Brain,
  Bug,
} from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, fetchNotifications, fetchUsers, notifications, users } = useAdmin();
  const [activeTab, setActiveTab] = useState("analytics");
  const [approvedOpportunities, setApprovedOpportunities] = useState(0);
  const [certifiedCoBuilders, setCertifiedCoBuilders] = useState(0);
  const [certifiedInitiators, setCertifiedInitiators] = useState(0);
  const [certifiedConsultants, setCertifiedConsultants] = useState(0);

  const fetchCounts = async () => {
    // Approved opportunities count
    const { count: approvedCount } = await supabase
      .from("startup_ideas")
      .select("*", { count: "exact", head: true })
      .eq("review_status", "approved");

    setApprovedOpportunities(approvedCount || 0);

    // Certified Co-Builders count
    const { count: cobuilderCount } = await supabase
      .from("user_certifications")
      .select("*", { count: "exact", head: true })
      .eq("certification_type", "cobuilder_b4");

    setCertifiedCoBuilders(cobuilderCount || 0);

    // Certified Initiators count
    const { count: initiatorCount } = await supabase
      .from("user_certifications")
      .select("*", { count: "exact", head: true })
      .eq("certification_type", "initiator_b4");

    setCertifiedInitiators(initiatorCount || 0);

    // Certified Consultants count
    const { count: consultantCount } = await supabase
      .from("user_certifications")
      .select("*", { count: "exact", head: true })
      .eq("certification_type", "consultant_b4");

    setCertifiedConsultants(consultantCount || 0);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchCounts();
    }
  }, [isAdmin]);

  useEffect(() => {
    // Only redirect if auth is fully loaded and user is not authenticated
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Only redirect if both auth and admin checks are fully loaded
    if (!adminLoading && !authLoading && user && !isAdmin) {
      const t = setTimeout(() => navigate("/dashboard", { replace: true }), 0);
      return () => clearTimeout(t);
    }
  }, [isAdmin, adminLoading, authLoading, user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
      fetchUsers();
    }
  }, [isAdmin]);

  // Realtime subscriptions for auto-refresh
  useEffect(() => {
    if (!isAdmin) return;

    // Subscribe to profiles changes (new users, profile updates)
    const profilesChannel = supabase
      .channel('admin-profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    // Subscribe to onboarding_state changes (user completes onboarding)
    const onboardingChannel = supabase
      .channel('admin-onboarding')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'onboarding_state' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    // Subscribe to user_certifications changes
    const certificationsChannel = supabase
      .channel('admin-certifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_certifications' },
        () => {
          fetchUsers();
          fetchCounts();
        }
      )
      .subscribe();

    // Subscribe to startup_ideas changes
    const ideasChannel = supabase
      .channel('admin-ideas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'startup_ideas' },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(onboardingChannel);
      supabase.removeChannel(certificationsChannel);
      supabase.removeChannel(ideasChannel);
    };
  }, [isAdmin]);

  if (authLoading || adminLoading) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!isAdmin) {
    return null;
  }

  const applicationNotifications = notifications.filter((n) => n.notification_type === "application_submission");
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        {/* Header */}
        <section className="py-8 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8" />
              <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-primary-foreground/80">Manage users, applications, and notifications</p>
          </div>
        </section>

        {/* Dashboard Content */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            {/* Stats Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-b4-teal/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-b4-teal" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{users.length}</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{approvedOpportunities}</p>
                    <p className="text-sm text-muted-foreground">Approved Ideas</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-b4-coral/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-b4-coral" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{certifiedCoBuilders}</p>
                    <p className="text-sm text-muted-foreground">Certified Co Builders</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{certifiedInitiators}</p>
                    <p className="text-sm text-muted-foreground">Certified Initiators</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{certifiedConsultants}</p>
                    <p className="text-sm text-muted-foreground">Certified Consultants</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-8 grid h-auto w-full grid-cols-2 gap-2 p-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-11">
                <TabsTrigger value="analytics" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <BarChart3 className="h-4 w-4 shrink-0" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="users" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <Users className="h-4 w-4 shrink-0" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="decoder" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <Brain className="h-4 w-4 shrink-0" />
                  NR Decoder
                </TabsTrigger>
                <TabsTrigger value="approvals" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <UserCheck className="h-4 w-4 shrink-0" />
                  To check
                </TabsTrigger>
                <TabsTrigger value="learning" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <GraduationCap className="h-4 w-4 shrink-0" />
                  Learning
                </TabsTrigger>
                <TabsTrigger value="opportunities" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <Rocket className="h-4 w-4 shrink-0" />
                  Opportunities
                </TabsTrigger>
                <TabsTrigger value="journeys" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  Journeys
                </TabsTrigger>
                <TabsTrigger value="trainings" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <GraduationCap className="h-4 w-4 shrink-0" />
                  Trainings
                </TabsTrigger>
                <TabsTrigger value="applications" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <FileText className="h-4 w-4 shrink-0" />
                  Applications
                </TabsTrigger>
                <TabsTrigger value="boxes" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <Package className="h-4 w-4 shrink-0" />
                  Boxes
                </TabsTrigger>
                <TabsTrigger value="bugs" className="flex min-h-11 min-w-0 items-center gap-2 whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                  <Bug className="h-4 w-4 shrink-0" />
                  Bugs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics">
                <AdminAnalyticsTab />
              </TabsContent>

              <TabsContent value="applications">
                <AdminApplicationsTab applications={applicationNotifications} onRefresh={fetchNotifications} />
              </TabsContent>

              <TabsContent value="approvals">
                <AdminApprovalsTab onRefresh={fetchUsers} />
              </TabsContent>

              <TabsContent value="opportunities">
                <AdminOpportunitiesTab onRefresh={fetchUsers} />
              </TabsContent>

              <TabsContent value="learning">
                <AdminLearningJourneysTab />
              </TabsContent>

              <TabsContent value="trainings">
                <AdminTrainingsTab />
              </TabsContent>

              <TabsContent value="journeys">
                <AdminJourneyResponsesTab />
              </TabsContent>

              <TabsContent value="decoder">
                <AdminNRDecoderTab />
              </TabsContent>

              <TabsContent value="users">
                <AdminUsersTab users={users} onRefresh={fetchUsers} />
              </TabsContent>

              <TabsContent value="boxes">
                <AdminBoxesTab />
              </TabsContent>

              <TabsContent value="bugs">
                <AdminBugsTab />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
