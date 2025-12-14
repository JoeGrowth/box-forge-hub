import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { AdminNotificationsTab } from "@/components/admin/AdminNotificationsTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminApplicationsTab } from "@/components/admin/AdminApplicationsTab";
import { Shield, Bell, Users, FileText } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, fetchNotifications, fetchUsers, notifications, users } = useAdmin();
  const [activeTab, setActiveTab] = useState("notifications");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      navigate("/", { replace: true });
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
      fetchUsers();
    }
  }, [isAdmin]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const applicationNotifications = notifications.filter(
    (n) => n.notification_type === "application_submission"
  );

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
            <p className="text-primary-foreground/80">
              Manage users, applications, and notifications
            </p>
          </div>
        </section>

        {/* Dashboard Content */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            {/* Stats Cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
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
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
                    <p className="text-sm text-muted-foreground">Unread Notifications</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-b4-coral/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-b4-coral" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{applicationNotifications.length}</p>
                    <p className="text-sm text-muted-foreground">Applications</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-b4-coral text-white text-xs">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="applications" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Applications
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Users
                </TabsTrigger>
              </TabsList>

              <TabsContent value="notifications">
                <AdminNotificationsTab 
                  notifications={notifications} 
                  onRefresh={fetchNotifications}
                />
              </TabsContent>

              <TabsContent value="applications">
                <AdminApplicationsTab 
                  applications={applicationNotifications}
                  onRefresh={fetchNotifications}
                />
              </TabsContent>

              <TabsContent value="users">
                <AdminUsersTab 
                  users={users}
                  onRefresh={fetchUsers}
                />
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
