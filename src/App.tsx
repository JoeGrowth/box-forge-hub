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
import ChoosePath from "./pages/ChoosePath";
import EntrepreneurialOnboarding from "./pages/EntrepreneurialOnboarding";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminOpportunityDetail from "./pages/AdminOpportunityDetail";
import BetaConsole from "./pages/BetaConsole";
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
                  <Route path="/professional-onboarding" element={<Onboarding />} />
                  <Route path="/choose-path" element={<ChoosePath />} />
                  <Route path="/entrepreneurial-onboarding" element={<EntrepreneurialOnboarding />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/opportunity/:id" element={<AdminOpportunityDetail />} />
                  <Route path="/admin/beta" element={<BetaConsole />} />
                  <Route path="/onboarding" element={<CompressedOnboarding />} />
                  <Route path="/onboarding/map" element={<ProfessionalMap />} />
                  <Route element={<PersistentNavbarLayout />}>
                  <Route path="/opportunities" element={<Opportunities />} />
                  <Route path="/cobuilders" element={<CoBuilders />} />
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
                  <Route path="/onboarding/professional" element={<Navigate to="/professional-onboarding" replace />} />
                  <Route path="/onboarding/entrepreneur" element={<Navigate to="/entrepreneurial-onboarding" replace />} />
                  <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
                  <Route path="/me" element={<Navigate to="/profile" replace />} />
                  <Route path="/account" element={<Navigate to="/profile" replace />} />
                  <Route path="/settings" element={<Navigate to="/profile" replace />} />
                  <Route path="/inbox" element={<Navigate to="/messages" replace />} />
                  <Route path="/chat" element={<Navigate to="/messages" replace />} />
                  <Route path="/people" element={<Navigate to="/cobuilders" replace />} />
                  <Route path="/network" element={<Navigate to="/cobuilders" replace />} />
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
