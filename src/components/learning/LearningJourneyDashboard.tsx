import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLearningJourneys, JourneyType } from "@/hooks/useLearningJourneys";
import { useOnboarding } from "@/hooks/useOnboarding";
import { JourneySelection } from "./JourneySelection";
import { JourneyPhaseView } from "./JourneyPhaseView";
import { Award, CheckCircle, Shield } from "lucide-react";

export const LearningJourneyDashboard = () => {
  const { certifications, loading } = useLearningJourneys();
  const { onboardingState } = useOnboarding();
  const [selectedJourney, setSelectedJourney] = useState<JourneyType | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading journeys...</div>
        </CardContent>
      </Card>
    );
  }

  // Check if user is approved co-builder
  const isApprovedCoBuilder = onboardingState?.journey_status === "approved" || 
    onboardingState?.journey_status === "entrepreneur_approved";

  if (!isApprovedCoBuilder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Learning Journeys</CardTitle>
          <CardDescription>
            Complete your onboarding and get approved to access learning journeys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Learning journeys are available after your Co-Builder application is approved.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-xl">Learning Journeys</CardTitle>
            <CardDescription>
              Continue your development with structured learning paths
            </CardDescription>
          </div>
          {certifications.length > 0 && (
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-b4-teal" />
              <span className="text-sm font-medium">{certifications.length} Certification(s)</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Show certifications */}
        {certifications.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-b4-teal/10 to-b4-purple/10 border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-b4-teal" />
              Your Certifications
            </h3>
            <div className="flex flex-wrap gap-2">
              {certifications.map((cert) => (
                <Badge
                  key={cert.id}
                  className="bg-gradient-to-r from-b4-teal to-b4-purple text-white py-1 px-3"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {cert.display_label}
                  {cert.verified && (
                    <Shield className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {selectedJourney ? (
          <JourneyPhaseView
            journeyType={selectedJourney}
            onBack={() => setSelectedJourney(null)}
          />
        ) : (
          <JourneySelection onSelectJourney={setSelectedJourney} />
        )}
      </CardContent>
    </Card>
  );
};
