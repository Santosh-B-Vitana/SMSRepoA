
import { useAuth } from "@/contexts/AuthContext";
import { AnnouncementManager } from "../components/announcements/AnnouncementManager";
import { StaffAnnouncementsView } from "../components/announcements/StaffAnnouncementsView";

export default function Announcements() {
  const { user } = useAuth();

  // Principal gets full CRUD; all other staff get read-only view
  if (user?.role === 'staff') {
    const designation = (user.designation ?? '').toLowerCase();
    if (designation === 'principal' || designation === 'vice principal') {
      return <AnnouncementManager />;
    }
    return <StaffAnnouncementsView />;
  }

  // Admin / super_admin get full manager
  return <AnnouncementManager />;
}
