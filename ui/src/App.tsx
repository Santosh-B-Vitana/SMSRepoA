import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
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
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

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
const VisitorManagement    = lazy(() => import("./pages/VisitorManagement"));
const StaffParentCommunication = lazy(() => import("./pages/StaffParentCommunication"));
const StaffDiary           = lazy(() => import("./pages/StaffDiary"));
const StaffMyAttendance    = lazy(() => import("./pages/StaffMyAttendance"));
const ParentDiaryView      = lazy(() => import("./pages/ParentDiaryView"));
const SchoolManagement     = lazy(() => import("@/pages/superadmin/SchoolManagement"));
const UserManagement       = lazy(() => import("@/pages/superadmin/UserManagement"));
const ExamSummary          = lazy(() => import("@/pages/reports/ExamSummary"));
const ExamPerformance      = lazy(() => import("@/pages/reports/ExamPerformance"));
const StudentMarks         = lazy(() => import("@/pages/reports/StudentMarks"));
const ClassAnalysis        = lazy(() => import("@/pages/reports/ClassAnalysis"));
const GradeDistribution    = lazy(() => import("@/pages/reports/GradeDistribution"));
const SubjectPerformance   = lazy(() => import("@/pages/reports/SubjectPerformance"));
const SecurityDashboardPage = lazy(() => import("@/pages/SecurityDashboard"));
const AdvancedAnalytics    = lazy(() => import("@/pages/AdvancedAnalytics"));
const Admissions           = lazy(() => import("@/pages/Admissions"));
const Finance              = lazy(() => import("@/pages/Finance"));
const LeaveManagement      = lazy(() => import("@/pages/LeaveManagement"));

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
    mutations: {
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          (error instanceof Error ? error.message : 'An unexpected error occurred');
        toast.error(message);
      },
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
              <Router>
                <PermissionsProvider>
                <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ── Public routes (no auth required) ──────────────────── */}
                  <Route path="/" element={<Login />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/super-admin-login" element={<SuperAdminLogin />} />

                  {/* ── Protected: admin / super_admin ────────────────────── */}
                  <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><Dashboard /></Layout></ProtectedRoute>} />
                  <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
                  <Route path="/super-admin-dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><Layout><SuperAdminDashboard /></Layout></ProtectedRoute>} />
                  <Route path="/superadmin/schools" element={<ProtectedRoute allowedRoles={['super_admin']}><Layout><SchoolManagement /></Layout></ProtectedRoute>} />
                  <Route path="/superadmin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><Layout><UserManagement /></Layout></ProtectedRoute>} />

                  {/* ── Protected: staff / admin (teacher-facing) ─────────── */}
                  <Route path="/staff-dashboard" element={<ProtectedRoute allowedRoles={['staff','admin']}><Layout><StaffDashboard /></Layout></ProtectedRoute>} />
                  <Route path="/leave-management" element={<ProtectedRoute allowedRoles={['staff','admin']}><Layout><LeaveManagement /></Layout></ProtectedRoute>} />
                  <Route path="/my-classes" element={<ProtectedRoute allowedRoles={['staff','admin']}><Layout><MyClasses /></Layout></ProtectedRoute>} />
                  <Route path="/my-classes/:classId" element={<ProtectedRoute allowedRoles={['staff','admin']}><Layout><MyClassDetail /></Layout></ProtectedRoute>} />
                  <Route path="/my-class-detail/:classId" element={<ProtectedRoute allowedRoles={['staff','admin']}><Layout><MyClassDetail /></Layout></ProtectedRoute>} />
                  <Route path="/staff-class/:assignmentId" element={<ProtectedRoute allowedRoles={['staff','admin']}><Layout><StaffMyClassDetail /></Layout></ProtectedRoute>} />
                  <Route path="/staff-parent-communication" element={<ProtectedRoute allowedRoles={['staff','admin']}><Layout><StaffParentCommunication /></Layout></ProtectedRoute>} />
                  <Route path="/staff-diary" element={<ProtectedRoute allowedRoles={['staff','admin']}><Layout><StaffDiary /></Layout></ProtectedRoute>} />
                  <Route path="/my-attendance" element={<ProtectedRoute allowedRoles={['staff','admin']}><Layout><StaffMyAttendance /></Layout></ProtectedRoute>} />
                  <Route path="/attendance" element={<ProtectedRoute allowedRoles={['staff','admin']}><Layout><StaffAttendanceTeacher /></Layout></ProtectedRoute>} />

                  {/* ── Protected: parent-facing ──────────────────────────── */}
                  <Route path="/parent-dashboard" element={<ProtectedRoute allowedRoles={['parent']}><Layout><ParentDashboard /></Layout></ProtectedRoute>} />
                  <Route path="/child-profile" element={<ProtectedRoute allowedRoles={['parent']}><Layout><ChildProfile /></Layout></ProtectedRoute>} />
                  <Route path="/parent-fees" element={<ProtectedRoute allowedRoles={['parent']}><Layout><ParentFees /></Layout></ProtectedRoute>} />
                  <Route path="/parent-fees/:childId" element={<ProtectedRoute allowedRoles={['parent']}><Layout><ParentChildFeeDetails /></Layout></ProtectedRoute>} />
                  <Route path="/parent-fees/:childId/pay" element={<ProtectedRoute allowedRoles={['parent']}><Layout><ParentChildFeePayment /></Layout></ProtectedRoute>} />
                  <Route path="/parent-notifications" element={<ProtectedRoute allowedRoles={['parent']}><Layout><ParentNotifications /></Layout></ProtectedRoute>} />
                  <Route path="/parent-diary" element={<ProtectedRoute allowedRoles={['parent']}><Layout><ParentDiaryView /></Layout></ProtectedRoute>} />

                  {/* ── Protected: admin + staff shared ──────────────────── */}
                  <Route path="/admissions" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><ModuleGuard module="admissions"><Admissions /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/students" element={<ProtectedRoute allowedRoles={['admin','staff','super_admin']}><Layout><Students /></Layout></ProtectedRoute>} />
                  <Route path="/students/:id" element={<ProtectedRoute allowedRoles={['admin','staff','super_admin']}><Layout><StudentProfile /></Layout></ProtectedRoute>} />
                  <Route path="/students/:id/edit" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><StudentEdit /></Layout></ProtectedRoute>} />
                   <Route path="/staff" element={<ProtectedRoute allowedRoles={['admin','super_admin','staff']}><Layout><Staff /></Layout></ProtectedRoute>} />
                   <Route path="/staff/:id" element={<ProtectedRoute allowedRoles={['admin','super_admin','staff']}><Layout><StaffProfile /></Layout></ProtectedRoute>} />
                  <Route path="/staff/:id/edit" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><StaffEdit /></Layout></ProtectedRoute>} />
                  <Route path="/staff-attendance" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><StaffAttendance /></Layout></ProtectedRoute>} />
                  <Route path="/student-attendance" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><StudentAttendance /></Layout></ProtectedRoute>} />
                  <Route path="/academics" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><Academics /></Layout></ProtectedRoute>} />
                  <Route path="/academics/classes/manage" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><ClassManager /></Layout></ProtectedRoute>} />
                  <Route path="/academics/classes/:classId" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ClassDetail /></Layout></ProtectedRoute>} />
                  <Route path="/academics/classes/:classId/sections/:sectionId" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><SectionDetail /></Layout></ProtectedRoute>} />
                  <Route path="/class/:classId" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ClassProfile /></Layout></ProtectedRoute>} />
                  <Route path="/grades" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><Grades /></Layout></ProtectedRoute>} />
                  <Route path="/assignments" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><Assignments /></Layout></ProtectedRoute>} />
                  <Route path="/examinations" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="examinations"><Examinations /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/cce-management" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="examinations"><CCEManagement /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/timetable" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="timetable"><Timetable /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/alumni" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><Alumni /></Layout></ProtectedRoute>} />
                  <Route path="/announcements" element={<ProtectedRoute><Layout><ModuleGuard module="announcements"><Announcements /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/communication" element={<ProtectedRoute><Layout><ModuleGuard module="communication"><Communication /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/documents" element={<ProtectedRoute><Layout><ModuleGuard module="documents"><Documents /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Layout><ModuleGuard module="announcements"><Announcements /></ModuleGuard></Layout></ProtectedRoute>} />

                  {/* ── Protected: admin-only finance ────────────────────── */}
                  <Route path="/finance" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><Finance /></Layout></ProtectedRoute>} />
                  <Route path="/fees" element={<ProtectedRoute allowedRoles={['admin','super_admin','staff']}><Layout><ModuleGuard module="fees"><Fees /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/student-fee-details/:studentId" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><StudentFeeDetails /></ProtectedRoute>} />
                  <Route path="/fee-concession" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><ModuleGuard module="fees"><FeeConcession /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/payment-gateway" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><ModuleGuard module="fees"><PaymentGateway /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/pf-esi" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><PFESIManagement /></Layout></ProtectedRoute>} />

                  {/* ── Protected: reports ────────────────────────────────── */}
                  <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><ModuleGuard module="reports"><Reports /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/reports/exam-summary" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="reports"><ExamSummary /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/reports/exam-performance" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="reports"><ExamPerformance /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/reports/student-marks" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="reports"><StudentMarks /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/reports/class-analysis" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="reports"><ClassAnalysis /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/reports/grade-distribution" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="reports"><GradeDistribution /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/reports/subject-performance" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="reports"><SubjectPerformance /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><ModuleGuard module="analytics"><Analytics /></ModuleGuard></Layout></ProtectedRoute>} />

                  {/* ── Protected: optional modules ───────────────────────── */}
                   <Route path="/transport" element={<ProtectedRoute allowedRoles={['admin','super_admin','staff']}><Layout><ModuleGuard module="transport"><Transport /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/library" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="library"><Library /></ModuleGuard></Layout></ProtectedRoute>} />
                   <Route path="/hostel" element={<ProtectedRoute allowedRoles={['admin','super_admin','staff']}><Layout><ModuleGuard module="hostel"><Hostel /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/health" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><ModuleGuard module="health"><Health /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/wallet" element={<ProtectedRoute><Layout><ModuleGuard module="wallet"><Wallet /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/store" element={<ProtectedRoute><Layout><ModuleGuard module="store"><Store /></ModuleGuard></Layout></ProtectedRoute>} />
                  <Route path="/school-connect" element={<ProtectedRoute><Layout><SchoolConnect /></Layout></ProtectedRoute>} />
                  <Route path="/offline-attendance" element={<ProtectedRoute allowedRoles={['admin','staff']}><Layout><OfflineAttendance /></Layout></ProtectedRoute>} />

                  {/* ── Protected: settings / admin config ───────────────── */}
                  <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
                  <Route path="/configuration-settings" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><ConfigurationSettings /></Layout></ProtectedRoute>} />
                  <Route path="/role-management" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><RoleManagement /></Layout></ProtectedRoute>} />
                  <Route path="/visitor-management" element={<ProtectedRoute allowedRoles={['admin','super_admin','staff']}><Layout><VisitorManagement /></Layout></ProtectedRoute>} />
                  <Route path="/id-cards" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><IdCards /></Layout></ProtectedRoute>} />
                  <Route path="/security" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><SecurityDashboardPage /></Layout></ProtectedRoute>} />
                  <Route path="/advanced-analytics" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Layout><AdvancedAnalytics /></Layout></ProtectedRoute>} />

                  {/* ── 404 ──────────────────────────────────────────────── */}
                  <Route path="*" element={<Layout><NotFound /></Layout>} />
                </Routes>
                </Suspense>
                </ErrorBoundary>
                <Toaster />
                <NetworkErrorHandler />
                </PermissionsProvider>
              </Router>
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
