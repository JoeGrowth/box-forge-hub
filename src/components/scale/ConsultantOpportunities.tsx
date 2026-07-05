import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Briefcase,
  Calendar,
  Building2,
  FileText,
  Loader2,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
  Upload,
  ExternalLink,
  Users,
  Linkedin,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

interface ConsultantOpportunity {
  id: string;
  user_id: string;
  source: "word_of_mouth" | "linkedin" | "other";
  source_other: string | null;
  title: string;
  client_name: string;
  consulting_firm: string;
  offer_date: string;
  description: string | null;
  technical_offer_url: string | null;
  number_of_days: number;
  amount_per_day: number;
  total_amount: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

type Currency = "TND" | "USD" | "EUR" | "GBP" | "MAD" | "DZD" | "EGP" | "SAR" | "AED";

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: "TND", label: "TND - Tunisian Dinar", symbol: "TND" },
  { value: "USD", label: "USD - US Dollar", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - British Pound", symbol: "£" },
  { value: "MAD", label: "MAD - Moroccan Dirham", symbol: "MAD" },
  { value: "DZD", label: "DZD - Algerian Dinar", symbol: "DZD" },
  { value: "EGP", label: "EGP - Egyptian Pound", symbol: "EGP" },
  { value: "SAR", label: "SAR - Saudi Riyal", symbol: "SAR" },
  { value: "AED", label: "AED - UAE Dirham", symbol: "AED" },
];

interface FormData {
  source: "word_of_mouth" | "linkedin" | "other";
  source_other: string;
  title: string;
  client_name: string;
  consulting_firm: string;
  offer_date: string;
  description: string;
  number_of_days: number;
  amount_per_day: number;
  currency: Currency;
}

const MAX_OPPORTUNITIES = 20;

export const ConsultantOpportunities = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [opportunities, setOpportunities] = useState<ConsultantOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState<ConsultantOpportunity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [technicalOfferFile, setTechnicalOfferFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    source: "word_of_mouth",
    source_other: "",
    title: "",
    client_name: "",
    consulting_firm: "",
    offer_date: "",
    description: "",
    number_of_days: 1,
    amount_per_day: 0,
    currency: "TND",
  });

  const fetchOpportunities = useCallback(async () => {
    if (!user) return;
    
    // Only show loading spinner on initial fetch, not on refetches
    if (!hasFetched) {
      setLoading(true);
    }
    
    const { data, error } = await supabase
      .from("consultant_opportunities")
      .select("*")
      .eq("user_id", user.id)
      .order("offer_date", { ascending: false });
    
    if (error) {
      console.error("Error fetching opportunities:", error);
      toast({
        title: "Error",
        description: "Failed to load your opportunities.",
        variant: "destructive",
      });
    } else if (data) {
      // Cast to correct type since DB returns string for source
      setOpportunities(data as ConsultantOpportunity[]);
    }
    setLoading(false);
    setHasFetched(true);
  }, [user, toast, hasFetched]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const resetForm = () => {
    setFormData({
      source: "word_of_mouth",
      source_other: "",
      title: "",
      client_name: "",
      consulting_firm: "",
      offer_date: "",
      description: "",
      number_of_days: 1,
      amount_per_day: 0,
      currency: "TND",
    });
    setTechnicalOfferFile(null);
    setEditingId(null);
  };

  const openAddDialog = () => {
    if (opportunities.length >= MAX_OPPORTUNITIES) {
      toast({
        title: "Limit Reached",
        description: `You can only add up to ${MAX_OPPORTUNITIES} opportunities.`,
        variant: "destructive",
      });
      return;
    }
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (opportunity: ConsultantOpportunity) => {
    setEditingId(opportunity.id);
    setFormData({
      source: opportunity.source,
      source_other: opportunity.source_other || "",
      title: opportunity.title,
      client_name: opportunity.client_name,
      consulting_firm: opportunity.consulting_firm,
      offer_date: opportunity.offer_date,
      description: opportunity.description || "",
      number_of_days: opportunity.number_of_days,
      amount_per_day: Number(opportunity.amount_per_day),
      currency: ((opportunity as any).currency as Currency) || "TND",
    });
    setDialogOpen(true);
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("journey-documents")
      .upload(fileName, file);
    
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from("journey-documents")
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    // Validation
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Title is required.", variant: "destructive" });
      return;
    }
    if (!formData.client_name.trim()) {
      toast({ title: "Error", description: "Client name is required.", variant: "destructive" });
      return;
    }
    if (!formData.consulting_firm.trim()) {
      toast({ title: "Error", description: "Consulting firm name is required.", variant: "destructive" });
      return;
    }
    if (!formData.offer_date) {
      toast({ title: "Error", description: "Offer date is required.", variant: "destructive" });
      return;
    }
    if (formData.source === "other" && !formData.source_other.trim()) {
      toast({ title: "Error", description: "Please specify the source.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    
    try {
      let technicalOfferUrl: string | null = null;
      
      // Handle file upload if a new file is selected
      if (technicalOfferFile) {
        setUploadingFile(true);
        technicalOfferUrl = await handleFileUpload(technicalOfferFile);
        setUploadingFile(false);
        
        if (!technicalOfferUrl) {
          toast({
            title: "Upload Failed",
            description: "Failed to upload the technical offer PDF.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
      }
      
      const payload = {
        user_id: user.id,
        source: formData.source,
        source_other: formData.source === "other" ? formData.source_other : null,
        title: formData.title.trim(),
        client_name: formData.client_name.trim(),
        consulting_firm: formData.consulting_firm.trim(),
        offer_date: formData.offer_date,
        description: formData.description.trim() || null,
        number_of_days: formData.number_of_days,
        amount_per_day: formData.amount_per_day,
        currency: formData.currency,
        ...(technicalOfferUrl && { technical_offer_url: technicalOfferUrl }),
      };
      
      if (editingId) {
        const { error } = await supabase
          .from("consultant_opportunities")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);
        
        if (error) throw error;
        
        toast({
          title: "Updated",
          description: "Opportunity updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from("consultant_opportunities")
          .insert(payload);
        
        if (error) throw error;
        
        toast({
          title: "Added",
          description: "New opportunity added successfully.",
        });
      }
      
      setDialogOpen(false);
      resetForm();
      fetchOpportunities();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save opportunity.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkComplete = async (opportunity: ConsultantOpportunity) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("consultant_opportunities")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", opportunity.id)
      .eq("user_id", user.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to mark as complete.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Completed",
        description: `"${opportunity.title}" marked as done.`,
      });
      fetchOpportunities();
    }
  };

  const handleDelete = async () => {
    if (!user || !opportunityToDelete) return;
    
    setIsDeleting(true);
    const { error } = await supabase
      .from("consultant_opportunities")
      .delete()
      .eq("id", opportunityToDelete.id)
      .eq("user_id", user.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete opportunity.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: `"${opportunityToDelete.title}" has been deleted.`,
      });
      fetchOpportunities();
    }
    
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setOpportunityToDelete(null);
  };

  const canMarkComplete = (opportunity: ConsultantOpportunity) => {
    if (opportunity.is_completed) return false;
    const offerDate = parseISO(opportunity.offer_date);
    const daysSinceOffer = differenceInDays(new Date(), offerDate);
    return daysSinceOffer >= 14;
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "word_of_mouth":
        return <MessageCircle className="w-4 h-4" />;
      case "linkedin":
        return <Linkedin className="w-4 h-4" />;
      default:
        return <MoreHorizontal className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string, sourceOther?: string | null) => {
    switch (source) {
      case "word_of_mouth":
        return "Word of Mouth";
      case "linkedin":
        return "LinkedIn";
      default:
        return sourceOther || "Other";
    }
  };

  const totalAmount = formData.number_of_days * formData.amount_per_day;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-b4-teal/20 bg-gradient-to-br from-b4-teal/5 to-emerald-500/5">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-b4-teal to-emerald-500">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">Step 0</Badge>
                <span className="text-xs text-muted-foreground">
                  {opportunities.length}/{MAX_OPPORTUNITIES} opportunities
                </span>
              </div>
              <CardTitle className="text-xl">Work as Consultant</CardTitle>
              <CardDescription className="mt-1">
                Track your consulting opportunities, offers, and completed missions
              </CardDescription>
            </div>
            <Button variant="teal" onClick={openAddDialog} disabled={opportunities.length >= MAX_OPPORTUNITIES}>
              <Plus className="w-4 h-4 mr-2" />
              Add Opportunity
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Opportunities List */}
      {opportunities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Opportunities Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your consulting work by adding your first opportunity.
            </p>
            <Button variant="teal" onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Opportunity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {opportunities.map((opportunity) => (
            <Card 
              key={opportunity.id} 
              className={`border-border/50 hover:shadow-md transition-shadow ${
                opportunity.is_completed ? "bg-emerald-500/5 border-emerald-500/20" : ""
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-display font-bold text-foreground">
                        {opportunity.title}
                      </h3>
                      {opportunity.is_completed ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          In Progress
                        </Badge>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">{opportunity.client_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4 shrink-0" />
                        <span className="truncate">{opportunity.consulting_firm}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>{format(parseISO(opportunity.offer_date), "dd MMM yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {getSourceIcon(opportunity.source)}
                        <span>{getSourceLabel(opportunity.source, opportunity.source_other)}</span>
                      </div>
                    </div>
                    
                    {/* Description */}
                    {opportunity.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {opportunity.description}
                      </p>
                    )}
                    
                    {/* Financial info */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-foreground font-medium">
                        <span className="text-b4-teal font-semibold">Amount:</span>
                        <span>{opportunity.number_of_days} days × {opportunity.amount_per_day.toLocaleString()} = </span>
                        <span className="text-b4-teal font-bold">
                          {Number(opportunity.total_amount).toLocaleString()} {(opportunity as any).currency || "TND"}
                        </span>
                      </div>
                      {opportunity.technical_offer_url && (
                        <a
                          href={opportunity.technical_offer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <FileText className="w-4 h-4" />
                          Technical Offer
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {canMarkComplete(opportunity) && (
                      <Button
                        size="sm"
                        variant="teal"
                        onClick={() => handleMarkComplete(opportunity)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Done
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(opportunity)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setOpportunityToDelete(opportunity);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Opportunity" : "Add New Opportunity"}
            </DialogTitle>
            <DialogDescription>
              {editingId 
                ? "Update the details of your consulting opportunity." 
                : "Track a new consulting opportunity you're working on."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Source */}
            <div className="space-y-2">
              <Label>How did you hear about this opportunity?</Label>
              <Select
                value={formData.source}
                onValueChange={(value: "word_of_mouth" | "linkedin" | "other") =>
                  setFormData({ ...formData, source: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="word_of_mouth">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Word of Mouth
                    </div>
                  </SelectItem>
                  <SelectItem value="linkedin">
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4" />
                      LinkedIn
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <MoreHorizontal className="w-4 h-4" />
                      Other
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {formData.source === "other" && (
                <Input
                  placeholder="Specify the source..."
                  value={formData.source_other}
                  onChange={(e) => setFormData({ ...formData, source_other: e.target.value })}
                />
              )}
            </div>
            
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Opportunity Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Digital Security Consultation"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            {/* Client & Consulting Firm */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client Name *</Label>
                <Input
                  id="client"
                  placeholder="e.g., Association Calam Tunisia"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firm">Consulting Firm *</Label>
                <Input
                  id="firm"
                  placeholder="e.g., Angry Penguin"
                  value={formData.consulting_firm}
                  onChange={(e) => setFormData({ ...formData, consulting_firm: e.target.value })}
                />
              </div>
            </div>
            
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Offer Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.offer_date}
                onChange={(e) => setFormData({ ...formData, offer_date: e.target.value })}
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Objective / Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and objectives of this consultation..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
            
            {/* Technical Offer PDF */}
            <div className="space-y-2">
              <Label>Technical Offer (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setTechnicalOfferFile(file);
                  }}
                  className="flex-1"
                />
                {technicalOfferFile && (
                  <Badge variant="outline" className="shrink-0">
                    <FileText className="w-3 h-3 mr-1" />
                    {technicalOfferFile.name}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Financial Offer */}
            <div className="space-y-3">
              <Label>Financial Offer</Label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="days" className="text-xs text-muted-foreground">
                    Number of Days
                  </Label>
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    value={formData.number_of_days}
                    onChange={(e) => setFormData({ ...formData, number_of_days: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate" className="text-xs text-muted-foreground">
                    Amount per Day
                  </Label>
                  <Input
                    id="rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount_per_day}
                    onChange={(e) => setFormData({ ...formData, amount_per_day: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-xs text-muted-foreground">
                    Currency
                  </Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value: Currency) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr.value} value={curr.value}>
                          {curr.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-b4-teal/10 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground mb-1">Total Amount</div>
                  <div className="text-lg font-bold text-b4-teal">
                    {totalAmount.toLocaleString()} {formData.currency}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="teal" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingFile ? "Uploading..." : "Saving..."}
                </>
              ) : (
                editingId ? "Update" : "Add Opportunity"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{opportunityToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
