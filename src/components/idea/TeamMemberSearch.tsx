import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CoBuilder {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  primary_skills: string | null;
  natural_role_description: string | null;
}

interface TeamMember {
  id: string;
  member_user_id: string;
  role_type: "MVCB" | "MMCB" | "MLCB";
  full_name: string | null;
  avatar_url: string | null;
}

interface TeamMemberSearchProps {
  startupId: string;
  currentUserId: string;
  onTeamUpdated: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  MVCB: "Most Valuable Co-Builder",
  MMCB: "Most Matching Co-Builder",
  MLCB: "Most Loyal Co-Builder",
};

export const TeamMemberSearch = ({ startupId, currentUserId, onTeamUpdated }: TeamMemberSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CoBuilder[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedRole, setSelectedRole] = useState<"MVCB" | "MMCB" | "MLCB">("MVCB");
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch existing team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      setLoadingTeam(true);
      const { data: members, error } = await supabase
        .from("startup_team_members")
        .select("id, member_user_id, role_type")
        .eq("startup_id", startupId);

      if (error) {
        console.error("Error fetching team members:", error);
        setLoadingTeam(false);
        return;
      }

      if (!members || members.length === 0) {
        setTeamMembers([]);
        setLoadingTeam(false);
        return;
      }

      // Fetch profile info for each team member
      const userIds = members.map((m) => m.member_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const enrichedMembers: TeamMember[] = members.map((m) => {
        const profile = profiles?.find((p) => p.user_id === m.member_user_id);
        return {
          id: m.id,
          member_user_id: m.member_user_id,
          role_type: m.role_type as "MVCB" | "MMCB" | "MLCB",
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
        };
      });

      setTeamMembers(enrichedMembers);
      setLoadingTeam(false);
    };

    fetchTeamMembers();
  }, [startupId]);

  // Search for co-builders
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // Get profiles matching the search query
      // The RLS policy on profiles already ensures we can only see approved co-builders
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url, primary_skills")
        .ilike("full_name", `%${query}%`)
        .limit(20);

      if (profilesError) {
        console.error("Profile search error:", profilesError);
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      if (!profiles || profiles.length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Get natural roles for these users
      const userIds = profiles.map((p) => p.user_id);
      const { data: naturalRoles } = await supabase
        .from("natural_roles")
        .select("user_id, description")
        .in("user_id", userIds);

      // Combine data and exclude current user and existing team members
      const existingMemberIds = teamMembers.map((m) => m.member_user_id);
      const results: CoBuilder[] = profiles
        .filter((p) => p.user_id !== currentUserId && !existingMemberIds.includes(p.user_id))
        .map((profile) => {
          const naturalRole = naturalRoles?.find((nr) => nr.user_id === profile.user_id);
          return {
            ...profile,
            natural_role_description: naturalRole?.description || null,
          };
        });

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search for co-builders");
    } finally {
      setIsSearching(false);
    }
  }, [teamMembers, currentUserId]);

  // Debounced search on input change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Add member to team
  const handleAddMember = async (cobuilder: CoBuilder) => {
    setIsAdding(true);
    try {
      const { error } = await supabase.from("startup_team_members").insert({
        startup_id: startupId,
        member_user_id: cobuilder.user_id,
        role_type: selectedRole,
        added_by: currentUserId,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This co-builder is already on your team");
        } else {
          throw error;
        }
        return;
      }

      // Add to local state
      setTeamMembers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          member_user_id: cobuilder.user_id,
          role_type: selectedRole,
          full_name: cobuilder.full_name,
          avatar_url: cobuilder.avatar_url,
        },
      ]);

      // Remove from search results
      setSearchResults((prev) => prev.filter((r) => r.user_id !== cobuilder.user_id));

      toast.success(`${cobuilder.full_name || "Co-builder"} added as ${ROLE_LABELS[selectedRole]}`);
      onTeamUpdated();
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member");
    } finally {
      setIsAdding(false);
    }
  };

  // Remove member from team
  const handleRemoveMember = async (member: TeamMember) => {
    try {
      const { error } = await supabase
        .from("startup_team_members")
        .delete()
        .eq("startup_id", startupId)
        .eq("member_user_id", member.member_user_id);

      if (error) throw error;

      setTeamMembers((prev) => prev.filter((m) => m.member_user_id !== member.member_user_id));
      toast.success(`${member.full_name || "Co-builder"} removed from team`);
      onTeamUpdated();
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Current Team Members */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">Current Team</h4>
        {loadingTeam ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : teamMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No team members added yet. Search below to add co-builders.</p>
        ) : (
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-b4-teal/10 flex items-center justify-center text-b4-teal text-sm font-medium">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name || ""}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(member.full_name)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.full_name || "Unknown"}</p>
                    <Badge variant="outline" className="text-xs">
                      {ROLE_LABELS[member.role_type]}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(member)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Add Team Members</h4>
        
        {/* Role Selection */}
        <div className="flex gap-2">
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "MVCB" | "MMCB" | "MLCB")}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MVCB">MVCB - Most Valuable</SelectItem>
              <SelectItem value="MMCB">MMCB - Most Matching</SelectItem>
              <SelectItem value="MLCB">MLCB - Most Loyal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search co-builders by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
            {searchResults.map((cobuilder) => (
              <div
                key={cobuilder.id}
                className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-b4-teal/10 flex items-center justify-center text-b4-teal text-sm font-medium">
                    {cobuilder.avatar_url ? (
                      <img
                        src={cobuilder.avatar_url}
                        alt={cobuilder.full_name || ""}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(cobuilder.full_name)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{cobuilder.full_name || "Unknown"}</p>
                    {cobuilder.natural_role_description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {cobuilder.natural_role_description}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="teal"
                  onClick={() => handleAddMember(cobuilder)}
                  disabled={isAdding}
                >
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}

        {searchQuery && searchResults.length === 0 && !isSearching && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No co-builders found matching "{searchQuery}"
          </p>
        )}
      </div>
    </div>
  );
};
