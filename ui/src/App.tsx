import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Layout } from "@/components/layout/Layout";
import { NetworkErrorHandler } from "@/components/common/NetworkErrorHandler";
import { AcademicYearProvider } from "@/contexts/AcademicYearContext";
import { Loader2 } from "lucide-react";
import { ModuleGuard } from "@/components/common/ModuleGuard";

// ── Eagerly load auth pages (always needed on first paint) ────────────────────
import Login from "@/pages/Login";
import SuperAdminLogin from "@/pages/SuperAdminLogin";
import NotFound from "@/pages/NotFound";

// ── Lazily load all other pages (downloaded only when the user navigates there) ─
const Dashboard            = lazy(() => import("@/pages/Dashboard"));
const StaffDashboard       = lazy(() => import("@/pages/dashboards/StaffDashboard"));
const AdminDashboard       = lazy(() => import("@/pages/dashboards/AdminDashboard"));
const ParentDashboard      = lazy(() => import("@/pages/dashboards/ParentDashboard"));
const SuperAdminDashboard  = lazy(() => import("@/pages/dashboards/SuperAdminDashboard"));
const Students             = lazy(() => import("@/pages/Students"));
const StudentProfile       = lazy(() => import("@/pages/StudentProfile"));
const StudentEdit          = lazy(() => import("@/pages/StudentEdit"));
const Staff                = lazy(() => import("@/pages/Staff"));
const StaffProfile         = lazy(() => import("@/pages/StaffProfile"));
const StaffEdit            = lazy(() => import("@/pages/StaffEdit"));
const Academics            = lazy(() => import("@/pages/academics"));
const StaffAttendance      = lazy(() => import("@/pages/StaffAttendance"));
const Grades               = lazy(() => import("@/pages/Grades"));
const MyClasses            = lazy(() => import("@/pages/MyClasses"));
const Assignments          = lazy(() => import("@/pages/Assignments"));
const Examinations         = lazy(() => import("@/pages/Examinations"));
const Reports              = lazy(() => import("@/pages/Reports"));
const Timetable            = lazy(() => import("@/pages/Timetable"));
const Transport            = lazy(() => import("@/pages/Transport"));
const Library              = lazy(() => import("@/pages/Library"));
const Hostel               = lazy(() => import("@/pages/Hostel"));
const Health               = lazy(() => import("@/pages/Health"));
const Fees                 = lazy(() => import("@/pages/Fees"));
const Communication        = lazy(() => import("@/pages/Communication"));
const Announcements        = lazy(() => import("@/pages/Announcements"));
const Documents            = lazy(() => import("@/pages/Documents"));
const IdCards              = lazy(() => import("@/pages/IdCards"));
const Analytics            = lazy(() => import("@/pages/Analytics"));
const Settings             = lazy(() => import("@/pages/Settings"));
const ConfigurationSettings = lazy(() => import("./pages/ConfigurationSettings"));
const RoleManagement       = lazy(() => import("@/pages/RoleManagement"));
const ClassManager         = lazy(() => import("@/pages/academics/ClassManager"));
const ClassDetail          = lazy(() => import("@/pages/academics/ClassDetail"));
const SectionDetail        = lazy(() => import("@/pages/academics/SectionDetail"));
const ClassProfile         = lazy(() => import("@/pages/ClassProfile"));
const StaffClassProfile    = lazy(() => import("@/pages/StaffClassProfile"));
const StaffMyClassDetail   = lazy(() => import("@/pages/StaffMyClassDetail"));
const StudentFeeDetails    = lazy(() => import("./pages/StudentFeeDetails"));
const MyClassDetail        = lazy(() => import("./pages/MyClassDetail"));
const ParentFees           = lazy(() => import("./pages/ParentFees"));
const ParentChildFeeDetails = lazy(() => import("./pages/ParentChildFeeDetails"));
const ParentChildFeePayment = lazy(() => import("./pages/ParentChildFeePayment"));
const ParentNotifications  = lazy(() => import("./pages/ParentNotifications"));
const StudentAttendance    = lazy(() => import("./pages/StudentAttendance"));
const Alumni               = lazy(() => import("./pages/Alumni"));
const StaffAttendanceTeacher = lazy(() => import("./pages/StaffAttendanceTeacher"));
const Wallet               = lazy(() => import("./pages/Wallet"));
const SchoolConnect        = lazy(() => import("./pages/SchoolConnect"));
const Store                = lazy(() => import("./pages/Store"));
const CCEManagement        = lazy(() => import("./pages/CCEManagement"));
const FeeConcession        = lazy(() => import("./pages/FeeConcession"));
const PaymentGateway       = lazy(() => import("./pages/PaymentGateway"));
const PFESIManagement      = lazy(() => import("./pages/PFESIManagement"));
const OfflineAttendance    = lazy(() => import("./pages/OfflineAttendance"));
const ChildProfile         = lazy(() => import("./pages/ChildProfile"));
const LeaveManagement      = lazy(() => import("./pages/LeaveManagement"));
const AdminLeaveManagementPage = lazy(() => import("./pages/AdminLeaveManagement"));
const VisitorManagement    = lazy(() => import("./pages/VisitorManagement"));
const StaffParentCommunication = lazy(() => import("./pages/StaffParentCommunication"));
const SchoolManagement     = lazy(() => import("@/pages/superadmin/SchoolManagement"));
const UserManagement       = lazy(() => import("@/pages/superadmin/UserManagement"));
const ExamSummary          = lazy(() => import("@/pages/reports/ExamSummary"));
const ExamPerformance      = lazy(() => import("@/pages/reports/ExamPerformance"));
const StudentMarks         = lazy(() => import("@/pages/reports/StudentMarks"));
const ClassAnalysis        = lazy(() => import("@/pages/reports/ClassAnalysis"));
const GradeDistribution    = lazy(() => import("@/pages/reports/GradeDistribution"));
const SubjectPerformance   = lazy(() => import("@/pages/reports/SubjectPerformance"));

// ── Fallback shown while a lazy chunk is loading ──────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="school-ui-theme">
        <TooltipProvider>
          <LanguageProvider>
            <AuthProvider>
              <SchoolProvider>
                <AcademicYearProvider>
                <PermissionsProvider>
              <Router>
                <Suspense fallback={<PageLoader />}>
                <Routes>
                      {/* Default route shows login screen */}
                      <Route path="/" element={<Login />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/super-admin-login" element={<SuperAdminLogin />} />
                  
                  {/* Protected routes with layout */}
                  <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                  <Route path="/staff-dashboard" element={<Layout><StaffDashboard /></Layout>} />
                  <Route path="/admin-dashboard" element={<Layout><AdminDashboard /></Layout>} />
                  <Route path="/parent-dashboard" element={<Layout><ParentDashboard /></Layout>} />
                  <Route path="/super-admin-dashboard" element={<Layout><SuperAdminDashboard /></Layout>} />
                  <Route path="/academics" element={<Layout><Academics /></Layout>} />
                  <Route path="/superadmin/schools" element={<Layout><SchoolManagement /></Layout>} />
                  <Route path="/superadmin/users" element={<Layout><UserManagement /></Layout>} />
                   <Route path="/students" element={<Layout><Students /></Layout>} />
                   <Route path="/students/:id" element={<Layout><StudentProfile /></Layout>} />
                   <Route path="/students/:id/edit" element={<Layout><StudentEdit /></Layout>} />
                   <Route path="/staff" element={<Layout><Staff /></Layout>} />
                   <Route path="/staff/:id" element={<Layout><StaffProfile /></Layout>} />
                   <Route path="/staff/:id/edit" element={<Layout><StaffEdit /></Layout>} />
                   <Route path="/attendance" element={<Layout><StaffAttendanceTeacher /></Layout>} />
                   <Route path="/staff-attendance" element={<Layout><StaffAttendance /></Layout>} />
                   <Route path="/student-attendance" element={<Layout><StudentAttendance /></Layout>} />
                   <Route path="/alumni" element={<Layout><Alumni /></Layout>} />
                  <Route path="/grades" element={<Layout><Grades /></Layout>} />
                   <Route path="/my-classes" element={<Layout><MyClasses /></Layout>} />
                   <Route path="/my-classes/:classId" element={<Layout><MyClassDetail /></Layout>} />
                   <Route path="/assignments" element={<Layout><Assignments /></Layout>} />
                  <Route path="/examinations" element={<Layout><Examinations /></Layout>} />
                   <Route path="/reports/exam-summary" element={<Layout><ExamSummary /></Layout>} />
                   <Route path="/reports/exam-performance" element={<Layout><ExamPerformance /></Layout>} />
                   <Route path="/reports/student-marks" element={<Layout><StudentMarks /></Layout>} />
                   <Route path="/reports/class-analysis" element={<Layout><ClassAnalysis /></Layout>} />
                   <Route path="/reports/grade-distribution" element={<Layout><GradeDistribution /></Layout>} />
                   <Route path="/reports/subject-performance" element={<Layout><SubjectPerformance /></Layout>} />
                   <Route path="/cce-management" element={<Layout><CCEManagement /></Layout>} />
                   <Route path="/fee-concession" element={<Layout><FeeConcession /></Layout>} />
                   <Route path="/payment-gateway" element={<Layout><PaymentGateway /></Layout>} />
                   <Route path="/pf-esi" element={<Layout><PFESIManagement /></Layout>} />
                   <Route path="/offline-attendance" element={<Layout><OfflineAttendance /></Layout>} />
                  <Route path="/reports" element={<Layout><Reports /></Layout>} />
                  <Route path="/timetable" element={<Layout><Timetable /></Layout>} />
                  <Route path="/transport" element={<Layout><ModuleGuard module="transport"><Transport /></ModuleGuard></Layout>} />
                  <Route path="/library" element={<Layout><ModuleGuard module="library"><Library /></ModuleGuard></Layout>} />
                  <Route path="/configuration-settings" element={<Layout><ConfigurationSettings /></Layout>} />
                  <Route path="/role-management" element={<Layout><RoleManagement /></Layout>} />
                   <Route path="/hostel" element={<Layout><ModuleGuard module="hostel"><Hostel /></ModuleGuard></Layout>} />
                   <Route path="/health" element={<Layout><ModuleGuard module="health"><Health /></ModuleGuard></Layout>} />
                   <Route path="/visitor-management" element={<Layout><VisitorManagement /></Layout>} />
                   <Route path="/fees" element={<Layout><Fees /></Layout>} />
                   <Route path="/wallet" element={<Layout><ModuleGuard module="wallet"><Wallet /></ModuleGuard></Layout>} />
                   <Route path="/school-connect" element={<Layout><SchoolConnect /></Layout>} />
                   <Route path="/store" element={<Layout><ModuleGuard module="store"><Store /></ModuleGuard></Layout>} />
                   <Route path="/communication" element={<Layout><ModuleGuard module="communication"><Communication /></ModuleGuard></Layout>} />
                   <Route path="/staff-parent-communication" element={<Layout><StaffParentCommunication /></Layout>} />
                  <Route path="/announcements" element={<Layout><Announcements /></Layout>} />
                  <Route path="/documents" element={<Layout><Documents /></Layout>} />
                  <Route path="/id-cards" element={<Layout><IdCards /></Layout>} />
                  <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
                  <Route path="/settings" element={<Layout><Settings /></Layout>} />
                   <Route path="/child-profile" element={<Layout><ChildProfile /></Layout>} />
                   <Route path="/leave-management" element={<Layout><LeaveManagement /></Layout>} />
                   <Route path="/admin-leave" element={<Layout><AdminLeaveManagementPage /></Layout>} />
                    <Route path="/academics/classes/manage" element={<Layout><ClassManager /></Layout>} />
                    <Route path="/academics/classes/:classId" element={<Layout><ClassDetail /></Layout>} />
                    <Route path="/academics/classes/:classId/sections/:sectionId" element={<Layout><SectionDetail /></Layout>} />
                    <Route path="/class/:classId" element={<Layout><ClassProfile /></Layout>} />
                    <Route path="/staff-class/:assignmentId" element={<Layout><StaffMyClassDetail /></Layout>} />
                    <Route path="/student-fee-details/:studentId" element={<StudentFeeDetails />} />
                    <Route path="/my-class-detail/:classId" element={<Layout><MyClassDetail /></Layout>} />
                     <Route path="/parent-fees" element={<Layout><ParentFees /></Layout>} />
                     <Route path="/parent-fees/:childId" element={<Layout><ParentChildFeeDetails /></Layout>} />
                     <Route path="/parent-fees/:childId/pay" element={<Layout><ParentChildFeePayment /></Layout>} />
                     <Route path="/parent-notifications" element={<Layout><ParentNotifications /></Layout>} />
                  
                  {/* 404 route */}
                  <Route path="*" element={<Layout><NotFound /></Layout>} />
                </Routes>
                </Suspense>
              </Router>
                <Toaster />
                <NetworkErrorHandler />
                </PermissionsProvider>
                </AcademicYearProvider>
              </SchoolProvider>
            </AuthProvider>
          </LanguageProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
