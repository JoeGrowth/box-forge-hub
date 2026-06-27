import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import { LearningJourneysProvider } from "@/hooks/useLearningJourneys";
import { UserStatusProvider } from "@/hooks/useUserStatus";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PersistentNavbarLayout } from "@/components/layout/PersistentNavbarLayout";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import LandingV1 from "./pages/LandingV1";
import About from "./pages/About";
import Boxes from "./pages/Boxes";
import BoxDetail from "./pages/BoxDetail";
import Programs from "./pages/Programs";
import Join from "./pages/Join";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
// ChoosePath retired — /choose-path now redirects to /onboarding
import EntrepreneurialOnboarding from "./pages/EntrepreneurialOnboarding";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminOpportunityDetail from "./pages/AdminOpportunityDetail";
import BetaConsole from "./pages/BetaConsole";
import LifecycleIntegrity from "./pages/admin/LifecycleIntegrity";
import Organizations from "./pages/Organizations";
import OrganizationPage from "./pages/Organization";
import CompressedOnboarding from "./pages/CompressedOnboarding";
import ProfessionalMap from "./pages/ProfessionalMap";
import Opportunities from "./pages/Opportunities";
import OpportunityDetail from "./pages/OpportunityDetail";
import CoBuilders from "./pages/CoBuilders";
import Journey from "./pages/Journey";
import Mask from "./pages/Mask";
import Scale from "./pages/Scale";
import Checklist from "./pages/Checklist";
import Resume from "./pages/Resume";
import TrackRecord from "./pages/TrackRecord";
import Track from "./pages/Track";
import CreateIdea from "./pages/CreateIdea";
import EditIdea from "./pages/EditIdea";
import Stories from "./pages/Stories";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Chat from "./pages/Chat";
import DirectChat from "./pages/DirectChat";
import Messages from "./pages/Messages";
import NRDecoder from "./pages/NRDecoder";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";
import Advisory from "./pages/Advisory";
import Paths from "./pages/Paths";
import Career from "./pages/Career";
import Entrepreneurship from "./pages/Entrepreneurship";
import Consulting from "./pages/Consulting";
import StartStructuring from "./pages/StartStructuring";
import StartScaling from "./pages/StartScaling";
import TrainingManagement from "./pages/TrainingManagement";
import ConsultingManagement from "./pages/ConsultingManagement";
import OpsManagement from "./pages/OpsManagement";
import ThreeS from "./pages/ThreeS";
import Procuring from "./pages/Procuring";
import ElSpace from "./pages/ElSpace";
import PublishConsulting from "./pages/PublishConsulting";
import PublishTraining from "./pages/PublishTraining";
import PublishJob from "./pages/PublishJob";
import Declaration from "./pages/Declaration";
import PGP from "./pages/PGP";
import PublicProfile from "./pages/PublicProfile";
import Characters from "./pages/Characters";
import JourneyTimeline from "./pages/JourneyTimeline";
import ActivationHub from "./pages/ActivationHub";
import AdvisorWorkQueue from "./pages/AdvisorWorkQueue";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserStatusProvider>
        <OnboardingProvider>
          <LearningJourneysProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/LPV1" element={<LandingV1 />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/boxes" element={<Boxes />} />
                  <Route path="/boxes/:boxId" element={<BoxDetail />} />
                  <Route path="/programs" element={<Programs />} />
                  <Route path="/join" element={<Join />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/signup" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  {/* P0: single activation funnel = /onboarding (compressed).
                      Legacy 9-step flows live on as optional enrichment tracks. */}
                  <Route path="/onboarding" element={<CompressedOnboarding />} />
                  <Route path="/onboarding/map" element={<ProfessionalMap />} />
                  <Route path="/professional-track" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  <Route path="/entrepreneurial-track" element={<ProtectedRoute><EntrepreneurialOnboarding /></ProtectedRoute>} />
                  {/* Legacy redirects — preserve bookmarks / emails. */}
                  <Route path="/professional-onboarding" element={<Navigate to="/professional-track" replace />} />
                  <Route path="/entrepreneurial-onboarding" element={<Navigate to="/entrepreneurial-track" replace />} />
                  <Route path="/choose-path" element={<Navigate to="/onboarding" replace />} />
                  <Route path="/activation" element={<ProtectedRoute><ActivationHub /></ProtectedRoute>} />
                  <Route path="/advisor" element={<ProtectedRoute><AdvisorWorkQueue /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                  <Route path="/admin" element={<ProtectedRoute requireLevel="admin"><Admin /></ProtectedRoute>} />
                  <Route path="/admin/opportunity/:id" element={<ProtectedRoute requireLevel="admin"><AdminOpportunityDetail /></ProtectedRoute>} />
                  <Route path="/admin/beta" element={<ProtectedRoute requireLevel="admin"><BetaConsole /></ProtectedRoute>} />
                  <Route path="/admin/lifecycle-integrity" element={<ProtectedRoute requireLevel="admin"><LifecycleIntegrity /></ProtectedRoute>} />
                  <Route element={<PersistentNavbarLayout />}>
                  <Route path="/opportunities" element={<Opportunities />} />
                  <Route path="/organizations" element={<Organizations />} />
                  <Route path="/org/:slug" element={<OrganizationPage />} />
                  <Route path="/people" element={<CoBuilders />} />
                  <Route path="/journey" element={<Journey />} />
                  <Route path="/start" element={<Scale />} />
                  <Route path="/track" element={<Track />} />
                  <Route path="/advisory" element={<Advisory />} />
                  <Route path="/3S" element={<ThreeS />} />
                  <Route path="/opsmanagement" element={<OpsManagement />} />
                  <Route path="/consultingmanagement" element={<ConsultingManagement />} />
                  <Route path="/trainingmanagement" element={<TrainingManagement />} />
                  <Route path="/publish-consulting" element={<PublishConsulting />} />
                  <Route path="/publish-training" element={<PublishTraining />} />
                  <Route path="/publish-job" element={<PublishJob />} />
                  </Route>
                  <Route path="/opportunities/:category/:id" element={<OpportunityDetail />} />
                  {/* Legacy: old links pointed at startup ideas only. */}
                  <Route path="/opportunities/:id" element={<OpportunityDetail />} />
                  <Route path="/mask" element={<Mask />} />
                  <Route path="/checklist" element={<Checklist />} />
                  <Route path="/resume" element={<Resume />} />
                  <Route path="/track-record" element={<TrackRecord />} />
                  <Route path="/create-idea" element={<CreateIdea />} />
                  <Route path="/edit-idea/:id" element={<EditIdea />} />
                  <Route path="/chat/:applicationId" element={<Chat />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/messages/:conversationId" element={<Messages />} />
                  <Route path="/stories" element={<Stories />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/decoder" element={<NRDecoder />} />
                  <Route path="/coming-soon" element={<ComingSoon />} />
                  <Route path="/paths" element={<Paths />} />
                  <Route path="/career" element={<Career />} />
                  <Route path="/entrepreneurship" element={<Entrepreneurship />} />
                  <Route path="/consulting" element={<Consulting />} />
                  <Route path="/startstructuring" element={<StartStructuring />} />
                  <Route path="/startscaling" element={<StartScaling />} />
                  
                  <Route path="/brand-identity" element={<Mask />} />
                  <Route path="/procuring" element={<Procuring />} />
                  <Route path="/el-space" element={<ElSpace />} />
                  <Route path="/declaration" element={<Declaration />} />
                  <Route path="/PGP" element={<PGP />} />
                  <Route path="/characters" element={<ProtectedRoute><Characters /></ProtectedRoute>} />
                  <Route path="/journey-timeline" element={<ProtectedRoute><JourneyTimeline /></ProtectedRoute>} />
                  <Route path="/timeline" element={<Navigate to="/journey-timeline" replace />} />
                  <Route path="/pgp" element={<Navigate to="/PGP" replace />} />

                  {/* Intuitive aliases — keep growth loop intact for guessed URLs */}
                  <Route path="/consulting/new" element={<Navigate to="/publish-consulting" replace />} />
                  <Route path="/consulting/publish" element={<Navigate to="/publish-consulting" replace />} />
                  <Route path="/services" element={<Navigate to="/opportunities?tab=consulting" replace />} />
                  <Route path="/services/new" element={<Navigate to="/publish-consulting" replace />} />
                  <Route path="/jobs" element={<Navigate to="/opportunities?tab=job" replace />} />
                  <Route path="/jobs/new" element={<Navigate to="/publish-job" replace />} />
                  <Route path="/job/new" element={<Navigate to="/publish-job" replace />} />
                  <Route path="/training" element={<Navigate to="/opportunities?tab=training" replace />} />
                  <Route path="/trainings" element={<Navigate to="/opportunities?tab=training" replace />} />
                  <Route path="/training/new" element={<Navigate to="/publish-training" replace />} />
                  <Route path="/idea/new" element={<Navigate to="/create-idea" replace />} />
                  <Route path="/ideas/new" element={<Navigate to="/create-idea" replace />} />
                  <Route path="/startup/new" element={<Navigate to="/create-idea" replace />} />
                  <Route path="/startups" element={<Navigate to="/opportunities?tab=startup" replace />} />
                  <Route path="/onboarding/professional" element={<Navigate to="/professional-track" replace />} />
                  <Route path="/onboarding/entrepreneur" element={<Navigate to="/entrepreneurial-track" replace />} />
                  <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
                  <Route path="/me" element={<Navigate to="/profile" replace />} />
                  <Route path="/u/:slug" element={<PublicProfile />} />
                  <Route path="/account" element={<Navigate to="/profile" replace />} />
                  <Route path="/settings" element={<Navigate to="/profile" replace />} />
                  <Route path="/inbox" element={<Navigate to="/messages" replace />} />
                  <Route path="/chat" element={<Navigate to="/messages" replace />} />
                  <Route path="/cobuilders" element={<Navigate to="/people" replace />} />
                  <Route path="/network" element={<Navigate to="/people" replace />} />
                  <Route path="/match" element={<Navigate to="/opportunities" replace />} />
                  <Route path="/matches" element={<Navigate to="/opportunities" replace />} />
                  <Route path="/discover" element={<Navigate to="/opportunities" replace />} />
                  <Route path="/feed" element={<Navigate to="/opportunities" replace />} />
                  <Route path="/scale" element={<Navigate to="/start" replace />} />
                  <Route path="/projects" element={<Navigate to="/start" replace />} />
                  <Route path="/projects/new" element={<Navigate to="/create-idea" replace />} />
                  <Route path="/track-record/new" element={<Navigate to="/track-record" replace />} />
                  <Route path="/cv" element={<Navigate to="/resume" replace />} />
                  <Route path="/explore" element={<Navigate to="/paths" replace />} />
                  <Route path="/growth" element={<Navigate to="/paths" replace />} />
                  <Route path="/map" element={<Navigate to="/onboarding/map" replace />} />
                  <Route path="/beta" element={<Navigate to="/admin/beta" replace />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </LearningJourneysProvider>
        </OnboardingProvider>
      </UserStatusProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
