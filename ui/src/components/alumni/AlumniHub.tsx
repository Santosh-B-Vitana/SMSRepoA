import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap, Users, Star, Heart, Briefcase, MapPin,
  Mail, Phone, Plus, Search, Filter, Globe, Linkedin,
  Calendar, Building2, Trophy, TrendingUp, BadgeCheck,
  ChevronLeft, ChevronRight, Edit, Trash2, Eye, Send,
  UserPlus, HandshakeIcon, Mic, X, RefreshCw, AlertCircle,
  BookOpen, Award, DollarSign, ExternalLink, CheckCircle2,
  Clock, MapPinOff, Video, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  alumniApi,
  type AlumniBasic,
  type AlumniFull,
  type AlumniMeetBasic,
  type AlumniDonationBasic,
  type AlumniStats,
  type AlumniFilters,
  type CreateAlumniDto,
  type UpdateAlumniDto,
  type CreateMeetDto,
  type CreateDonationDto,
} from "@/services/api/alumniApi";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const BATCH_YEARS = Array.from({ length: 30 }, (_, i) =>
  String(new Date().getFullYear() - i)
);

const INDUSTRIES = [
  "Technology", "Engineering", "Medicine", "Law", "Finance",
  "Education", "Arts & Media", "Entrepreneurship", "Government",
  "Research", "Architecture", "Management", "Other",
];

const PAYMENT_METHODS = [
  "Bank Transfer", "Cash", "Cheque", "UPI", "Credit Card", "Other",
];

const DONATION_PURPOSES = [
  "Scholarship Fund", "Infrastructure", "Library", "Sports",
  "Labs & Equipment", "Events", "General Fund",
];

const MEET_STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700 border-blue-200",
  open: "bg-green-100 text-green-700 border-green-200",
  ongoing: "bg-yellow-100 text-yellow-700 border-yellow-200",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function avatarInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}
function avatarColor(name: string) {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
  ];
  const idx = (name.charCodeAt(0) || 0) % colors.length;
  return colors[idx];
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${color} shrink-0 ml-3`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlumniAvatar({ firstName, lastName, photoUrl, size = "md" }: {
  firstName: string; lastName: string; photoUrl?: string; size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" };
  const name = `${firstName} ${lastName}`;
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-background`}
      />
    );
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-white font-semibold shrink-0`}>
      {avatarInitials(firstName, lastName)}
    </div>
  );
}

function AlumniCardBadges({ alumni }: { alumni: AlumniBasic }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {alumni.isStarAlumni && (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
          <Star className="h-3 w-3 fill-amber-500 stroke-amber-700" /> {t('alumni.starBadge')}
        </span>
      )}
      {alumni.isMentor && (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
          <GraduationCap className="h-3 w-3" /> {t('alumni.mentorBadge')}
        </span>
      )}
    </div>
  );
}

function Pagination({
  page, totalPages, onPage,
}: {
  page: number; totalPages: number; onPage: (p: number) => void;
}) {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        {t('common.page')} {page} {t('common.of')} {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROFILE DIALOG
// ─────────────────────────────────────────────────────────────

function ProfileDialog({
  alumniId,
  open,
  onClose,
  onEdit,
}: {
  alumniId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (alumni: AlumniFull) => void;
}) {
  const { t } = useLanguage();
  const [alumni, setAlumni] = useState<AlumniFull | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !alumniId) return;
    setLoading(true);
    alumniApi
      .getById(alumniId)
      .then(setAlumni)
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [open, alumniId]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && alumni && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-4">
                <AlumniAvatar
                  firstName={alumni.firstName}
                  lastName={alumni.lastName}
                  photoUrl={alumni.photoUrl}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl">
                    {alumni.firstName} {alumni.lastName}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {alumni.designation || alumni.currentOccupation}
                    {alumni.company ? ` · ${alumni.company}` : ""}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      Batch {alumni.graduationYear}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {alumni.class}
                    </Badge>
                    {alumni.isStarAlumni && (
                      <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs hover:bg-amber-100">
                        <Star className="h-3 w-3 fill-amber-500 stroke-amber-700 mr-1" /> Star Alumni
                      </Badge>
                    )}
                    {alumni.isMentor && (
                      <Badge className="bg-violet-100 text-violet-700 border border-violet-200 text-xs hover:bg-violet-100">
                        <GraduationCap className="h-3 w-3 mr-1" /> Mentor
                      </Badge>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onEdit(alumni)}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" /> {t('alumni.edit')}
                </Button>
              </div>
            </DialogHeader>

            <Separator />

            <div className="grid grid-cols-2 gap-6 text-sm">
              {/* Contact */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{t('alumni.contactSection')}</h3>
                {alumni.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a href={`mailto:${alumni.email}`} className="text-blue-600 hover:underline truncate">{alumni.email}</a>
                  </div>
                )}
                {alumni.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{alumni.phone}</span>
                  </div>
                )}
                {(alumni.city || alumni.country) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{[alumni.city, alumni.state, alumni.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>

              {/* Academic */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{t('alumni.academicSection')}</h3>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Class {alumni.class}{alumni.section ? `-${alumni.section}` : ""} · Batch {alumni.graduationYear}</span>
                </div>
                {alumni.rollNumber && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{t('alumni.rollNoLabel')} {alumni.rollNumber}</span>
                  </div>
                )}
              </div>

              {/* Professional */}
              {alumni.company && (
                <div className="space-y-2 col-span-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{t('alumni.professionalSection')}</h3>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>
                      {alumni.designation || alumni.currentOccupation}
                      {alumni.company ? ` at ${alumni.company}` : ""}
                    </span>
                  </div>
                  {alumni.industry && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{alumni.industry}</span>
                    </div>
                  )}
                  {alumni.workExperience != null && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{alumni.workExperience} year{alumni.workExperience !== 1 ? "s" : ""} experience</span>
                    </div>
                  )}
                </div>
              )}

              {/* Engagement */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{t('alumni.engagementSection')}</h3>
                <div className="flex gap-3">
                  {alumni.willingToHire && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                      <UserCheck className="h-3 w-3" /> {t('alumni.openToHire')}
                    </span>
                  )}
                  {alumni.willingToSpeak && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                      <Mic className="h-3 w-3" /> {t('alumni.guestSpeaker')}
                    </span>
                  )}
                </div>
                {alumni.isMentor && alumni.mentorAreas.length > 0 && (
                  <p className="text-xs text-muted-foreground">Mentors in: {alumni.mentorAreas.join(", ")}</p>
                )}
              </div>

              {/* Social */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{t('alumni.socialSection')}</h3>
                <div className="flex gap-2">
                  {alumni.linkedinUrl && (
                    <a href={alumni.linkedinUrl} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1">
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </a>
                  )}
                  {alumni.facebookUrl && (
                    <a href={alumni.facebookUrl} target="_blank" rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> Facebook
                    </a>
                  )}
                </div>
              </div>

              {/* Skills */}
              {alumni.skills.length > 0 && (
                <div className="space-y-2 col-span-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{t('alumni.skillsSection')}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {alumni.skills.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {alumni.achievements && (
                <div className="space-y-2 col-span-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{t('alumni.achievementsSection')}</h3>
                  <p className="text-sm leading-relaxed">{alumni.achievements}</p>
                </div>
              )}

              {/* Activity */}
              {(alumni.attendedMeets.length > 0 || alumni.donations.length > 0) && (
                <div className="space-y-2 col-span-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{t('alumni.engagementHistory')}</h3>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {alumni.attendedMeets.length} meet{alumni.attendedMeets.length !== 1 ? "s" : ""} attended
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Heart className="h-3.5 w-3.5" />
                      {alumni.donations.length} donation{alumni.donations.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD / EDIT ALUMNI DIALOG
// ─────────────────────────────────────────────────────────────

const BLANK_CREATE: CreateAlumniDto = {
  firstName: "", lastName: "", email: "",
  phone: "", graduationYear: "", class: "",
  section: "", currentOccupation: "", company: "",
  industry: "", city: "", state: "", country: "",
  achievements: "", linkedinUrl: "",
  isStarAlumni: false, isMentor: false,
  willingToHire: false, willingToSpeak: false,
};

function AddEditAlumniDialog({
  open, onClose, editData, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editData?: AlumniFull | null;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<CreateAlumniDto>(BLANK_CREATE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm({
        firstName: editData.firstName,
        lastName: editData.lastName,
        email: editData.email,
        phone: editData.phone || "",
        graduationYear: editData.graduationYear,
        class: editData.class,
        section: editData.section || "",
        currentOccupation: editData.currentOccupation || "",
        company: editData.company || "",
        industry: editData.industry || "",
        city: editData.city || "",
        state: editData.state || "",
        country: editData.country || "",
        achievements: editData.achievements || "",
        linkedinUrl: editData.linkedinUrl || "",
        isStarAlumni: editData.isStarAlumni,
        isMentor: editData.isMentor,
        willingToHire: editData.willingToHire,
        willingToSpeak: editData.willingToSpeak,
      });
    } else {
      setForm(BLANK_CREATE);
    }
  }, [editData, open]);

  function set(key: keyof CreateAlumniDto, val: unknown) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!form.firstName || !form.lastName || !form.email || !form.graduationYear || !form.class) {
      toast.error("First name, last name, email, graduation year and class are required");
      return;
    }
    setSaving(true);
    try {
      if (editData) {
        const dto: UpdateAlumniDto = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          currentOccupation: form.currentOccupation,
          company: form.company,
          industry: form.industry,
          city: form.city,
          state: form.state,
          country: form.country,
          achievements: form.achievements,
          linkedinUrl: form.linkedinUrl,
          isStarAlumni: form.isStarAlumni,
          isMentor: form.isMentor,
          willingToHire: form.willingToHire,
          willingToSpeak: form.willingToSpeak,
        };
        await alumniApi.update(editData.id, dto);
        toast.success("Alumni profile updated");
      } else {
        await alumniApi.create(form);
        toast.success("Alumni added successfully");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? t('alumni.editTitle') : t('alumni.addTitle')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* Personal */}
          <div className="col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('alumni.personalInfo')}</h3>
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.firstNameLabel')}</Label>
            <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Rajesh" />
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.lastNameLabel')}</Label>
            <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Kumar" />
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.emailLabel')}</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="rajesh@email.com" />
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.phoneLabel')}</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />
          </div>

          {/* Academic */}
          <div className="col-span-2 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('alumni.academicDetails')}</h3>
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.gradYear')}</Label>
            <Select value={form.graduationYear} onValueChange={v => set("graduationYear", v)}>
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {BATCH_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.classLabel')}</Label>
            <Input value={form.class} onChange={e => set("class", e.target.value)} placeholder="12-A" />
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.sectionLabel')}</Label>
            <Input value={form.section} onChange={e => set("section", e.target.value)} placeholder="A" />
          </div>

          {/* Professional */}
          <div className="col-span-2 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('alumni.professionalInfo')}</h3>
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.designationOcc')}</Label>
            <Input value={form.currentOccupation} onChange={e => set("currentOccupation", e.target.value)} placeholder="Software Engineer" />
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.companyOrg')}</Label>
            <Input value={form.company} onChange={e => set("company", e.target.value)} placeholder="Tech Corp Ltd" />
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.industryLabel')}</Label>
            <Select value={form.industry || "_none_"} onValueChange={v => set("industry", v === "_none_" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">None</SelectItem>
                {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.linkedinUrl')}</Label>
            <Input value={form.linkedinUrl} onChange={e => set("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>

          {/* Location */}
          <div className="col-span-2 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('alumni.location')}</h3>
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.cityLabel')}</Label>
            <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Mumbai" />
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.stateLabel')}</Label>
            <Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="Maharashtra" />
          </div>
          <div className="space-y-1">
            <Label>{t('alumni.countryLabel')}</Label>
            <Input value={form.country} onChange={e => set("country", e.target.value)} placeholder="India" />
          </div>

          {/* Achievements */}
          <div className="col-span-2 space-y-1 pt-2">
            <Label>{t('alumni.achievementsWork')}</Label>
            <Textarea
              value={form.achievements}
              onChange={e => set("achievements", e.target.value)}
              placeholder="Describe their notable accomplishments..."
              rows={3}
            />
          </div>

          {/* Engagement flags */}
          <div className="col-span-2 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('alumni.engagementFlags')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isStarAlumni"
              checked={form.isStarAlumni}
              onCheckedChange={v => set("isStarAlumni", !!v)}
            />
            <Label htmlFor="isStarAlumni" className="cursor-pointer">{t('alumni.isStarAlumni')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isMentor"
              checked={form.isMentor}
              onCheckedChange={v => set("isMentor", !!v)}
            />
            <Label htmlFor="isMentor" className="cursor-pointer">{t('alumni.isMentor')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="willingToHire"
              checked={form.willingToHire}
              onCheckedChange={v => set("willingToHire", !!v)}
            />
            <Label htmlFor="willingToHire" className="cursor-pointer">{t('alumni.willingToHire')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="willingToSpeak"
              checked={form.willingToSpeak}
              onCheckedChange={v => set("willingToSpeak", !!v)}
            />
            <Label htmlFor="willingToSpeak" className="cursor-pointer">{t('alumni.willingToSpeak')}</Label>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('alumni.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> {t('alumni.saving')}</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> {editData ? t('alumni.saveChanges') : t('alumni.addAlumni')}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: OVERVIEW
// ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AlumniStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  function load() {
    setLoading(true);
    setErr(false);
    alumniApi.getStats()
      .then(setStats)
      .catch(() => { setErr(true); toast.error("Failed to load alumni stats"); })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{t('alumni.loading')}</span>
      </div>
    );
  }

  if (err || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">{t('alumni.failedLoad')}</p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> {t('alumni.retry')}
        </Button>
      </div>
    );
  }

  // Top industries sorted
  const topIndustries = Object.entries(stats.byIndustry)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Top years sorted by year desc
  const batchData = Object.entries(stats.byYear)
    .sort(([a], [b]) => Number(b) - Number(a))
    .slice(0, 8);
  const maxBatch = Math.max(...batchData.map(([, c]) => c), 1);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label={t('alumni.totalAlumni')} value={fmt(stats.total)} icon={GraduationCap} color="bg-violet-500" />
        <StatCard label={t('alumni.starAlumni')} value={fmt(stats.starAlumni)} icon={Star} color="bg-amber-500" />
        <StatCard label={t('alumni.mentors')} value={fmt(stats.mentors)} icon={Award} color="bg-blue-500" />
        <StatCard
          label={t('alumni.thisBatch')}
          value={fmt(stats.thisYear)}
          icon={UserPlus}
          color="bg-emerald-500"
          sub={`Class of ${new Date().getFullYear()}`}
        />
        <StatCard
          label={t('alumni.topCompanies')}
          value={stats.topCompanies.length}
          icon={Building2}
          color="bg-rose-500"
          sub={t('alumni.employersRepresented')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch Year Distribution */}
        <Card className="col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t('alumni.alumniByYear')}</CardTitle>
          </CardHeader>
          <CardContent>
            {batchData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t('alumni.noDataYet')}</p>
            ) : (
              <div className="space-y-2">
                {batchData.map(([year, count]) => (
                  <div key={year} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-10 shrink-0">{year}</span>
                    <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxBatch) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Companies */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t('alumni.topEmployers')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topCompanies.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t('alumni.noDataYet')}</p>
            ) : (
              <ol className="space-y-2">
                {stats.topCompanies.slice(0, 7).map((c, i) => (
                  <li key={c.company} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 text-center rounded-full ${i < 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm flex-1 truncate">{c.company}</span>
                    <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {c.count}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industries */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t('alumni.industryDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {topIndustries.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t('alumni.noDataYet')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topIndustries.map(([industry, count]) => (
                  <div key={industry} className="flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1.5 border">
                    <Briefcase className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs">{industry}</span>
                    <span className="text-xs font-semibold text-primary">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Additions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t('alumni.recentAlumni')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentAlumni.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t('alumni.noAlumniAdded')}</p>
            ) : (
              <div className="space-y-3">
                {stats.recentAlumni.map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <AlumniAvatar firstName={a.firstName} lastName={a.lastName} photoUrl={a.photoUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {a.firstName} {a.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.company || a.currentOccupation || "—"} · Batch {a.graduationYear}
                      </p>
                    </div>
                    {a.isStarAlumni && <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-500 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: DIRECTORY
// ─────────────────────────────────────────────────────────────

function DirectoryTab({
  onOpenProfile,
  onAddAlumni,
}: {
  onOpenProfile: (id: string) => void;
  onAddAlumni: () => void;
}) {
  const { t } = useLanguage();
  const [alumni, setAlumni] = useState<AlumniBasic[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("_all_");
  const [industryFilter, setIndustryFilter] = useState("_all_");
  const [mentorOnly, setMentorOnly] = useState(false);
  const [starOnly, setStarOnly] = useState(false);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildFilters(): AlumniFilters {
    return {
      search: search || undefined,
      graduationYear: yearFilter !== "_all_" ? yearFilter : undefined,
      industry: industryFilter !== "_all_" ? industryFilter : undefined,
      isMentor: mentorOnly ? true : undefined,
      isStarAlumni: starOnly ? true : undefined,
    };
  }

  function load(pg = page) {
    setLoading(true);
    setErr(false);
    alumniApi.getAlumni(buildFilters(), pg, 12)
      .then(r => {
        setAlumni(r.items ?? []);
        setTotal(r.totalCount);
        setTotalPages(r.totalPages);
        setPage(pg);
      })
      .catch(() => { setErr(true); toast.error("Failed to load alumni"); })
      .finally(() => setLoading(false));
  }

  // Debounce search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(1), 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, yearFilter, industryFilter, mentorOnly, starOnly]);

  function clearFilters() {
    setSearch(""); setYearFilter("_all_"); setIndustryFilter("_all_");
    setMentorOnly(false); setStarOnly(false);
  }

  const hasFilters = search || yearFilter !== "_all_" || industryFilter !== "_all_" || mentorOnly || starOnly;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('alumni.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">{t('alumni.allYears')}</SelectItem>
            {BATCH_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">{t('alumni.allIndustries')}</SelectItem>
            {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Checkbox id="mentorOnly" checked={mentorOnly} onCheckedChange={v => setMentorOnly(!!v)} />
          <Label htmlFor="mentorOnly" className="cursor-pointer text-sm">{t('alumni.filterMentors')}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="starOnly" checked={starOnly} onCheckedChange={v => setStarOnly(!!v)} />
          <Label htmlFor="starOnly" className="cursor-pointer text-sm">{t('alumni.filterStars')}</Label>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
        <div className="ml-auto">
          <Button onClick={onAddAlumni}>
            <UserPlus className="h-4 w-4 mr-2" /> {t('alumni.addAlumni')}
          </Button>
        </div>
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          {fmt(total)} {hasFilters ? t('alumni.matchingFilters') : t('alumni.alumniTotal')}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground text-sm">{t('alumni.loading')}</span>
        </div>
      )}

      {/* Error */}
      {err && !loading && (
        <div className="flex flex-col items-center py-20 gap-3">
          <AlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-sm text-muted-foreground">{t('alumni.failedLoad')}</p>
          <Button variant="outline" size="sm" onClick={() => load(page)}>{t('alumni.retry')}</Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !err && alumni.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3">
          <GraduationCap className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('alumni.noAlumniFound')}</p>
          {hasFilters && <Button variant="outline" size="sm" onClick={clearFilters}>{t('alumni.clearFilters')}</Button>}
        </div>
      )}

      {/* Alumni Grid */}
      {!loading && !err && alumni.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alumni.map(a => (
            <Card
              key={a.id}
              className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onOpenProfile(a.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlumniAvatar firstName={a.firstName} lastName={a.lastName} photoUrl={a.photoUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-sm truncate">
                        {a.firstName} {a.lastName}
                      </p>
                      {a.isStarAlumni && (
                        <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-500 shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {a.designation || a.currentOccupation || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {a.company && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{a.company}</span>
                    </div>
                  )}
                  {a.city && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{a.city}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GraduationCap className="h-3 w-3 shrink-0" />
                    <span>Batch {a.graduationYear} · {a.class}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <AlumniCardBadges alumni={a} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => { e.stopPropagation(); onOpenProfile(a.id); }}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> {t('alumni.view')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={p => load(p)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: MEETS & EVENTS
// ─────────────────────────────────────────────────────────────

const BLANK_MEET: CreateMeetDto = {
  title: "", description: "", date: "", startTime: "", endTime: "",
  venue: "", venueAddress: "", isVirtual: false, virtualLink: "",
  organizer: "", organizerContact: "", expectedAttendees: 0,
};

function MeetsTab() {
  const { t } = useLanguage();
  const [meets, setMeets] = useState<AlumniMeetBasic[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [statusFilter, setStatusFilter] = useState("_all_");
  const [showCreate, setShowCreate] = useState(false);
  const [meetForm, setMeetForm] = useState<CreateMeetDto>(BLANK_MEET);
  const [saving, setSaving] = useState(false);
  const [editingMeet, setEditingMeet] = useState<AlumniMeetBasic | null>(null);

  function load(pg = 1) {
    setLoading(true);
    setErr(false);
    alumniApi.getMeets(pg, 12, statusFilter !== "_all_" ? statusFilter : undefined)
      .then(r => {
        setMeets(r.items ?? []);
        setTotal(r.totalCount);
        setTotalPages(r.totalPages);
        setPage(pg);
      })
      .catch(() => { setErr(true); toast.error("Failed to load meets"); })
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter]);

  function openCreate() { setEditingMeet(null); setMeetForm(BLANK_MEET); setShowCreate(true); }
  function openEdit(m: AlumniMeetBasic) {
    setEditingMeet(m);
    setMeetForm({
      title: m.title, date: m.date.split("T")[0], isVirtual: m.isVirtual,
      venue: m.venue, description: "", startTime: "", endTime: "",
      venueAddress: "", virtualLink: "", organizer: "",
      organizerContact: "", expectedAttendees: 0,
    });
    setShowCreate(true);
  }

  async function handleSaveMeet() {
    if (!meetForm.title || !meetForm.date) {
      toast.error("Title and date are required");
      return;
    }
    setSaving(true);
    try {
      if (editingMeet) {
        await alumniApi.updateMeet(editingMeet.id, meetForm);
        toast.success("Meet updated");
      } else {
        await alumniApi.createMeet(meetForm);
        toast.success("Meet created");
      }
      setShowCreate(false);
      load(1);
    } catch {
      toast.error("Failed to save meet");
    } finally {
      setSaving(false);
    }
  }

  function setF(k: keyof CreateMeetDto, v: unknown) {
    setMeetForm(prev => ({ ...prev, [k]: v }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">{t('alumni.allStatuses')}</SelectItem>
              {["planned", "open", "ongoing", "completed", "cancelled"].map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{fmt(total)} meets</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> {t('alumni.planAMeet')}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">{t('alumni.loadingMeets')}</span>
        </div>
      )}
      {err && !loading && (
        <div className="flex flex-col items-center py-16 gap-3">
          <AlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-sm text-muted-foreground">{t('alumni.failedLoadMeets')}</p>
          <Button variant="outline" size="sm" onClick={() => load()}>{t('alumni.retry')}</Button>
        </div>
      )}
      {!loading && !err && meets.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3">
          <Calendar className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('alumni.noMeetsYet')}</p>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> {t('alumni.planFirstMeet')}</Button>
        </div>
      )}

      {!loading && !err && meets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meets.map(m => (
            <Card key={m.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm leading-snug">{m.title}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize shrink-0 ${MEET_STATUS_COLORS[m.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {m.status}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{fmtDate(m.date)}</span>
                  </div>
                  {m.isVirtual ? (
                    <div className="flex items-center gap-2">
                      <Video className="h-3.5 w-3.5 shrink-0" />
                      <span>{t('alumni.virtualEvent')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{m.venue || t('alumni.venueTBD')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>{m.registeredCount} {t('alumni.registered')}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={() => openEdit(m)}
                  >
                    <Edit className="h-3 w-3 mr-1.5" /> {t('alumni.edit')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={p => load(p)} />

      {/* Create/Edit Meet Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeet ? t('alumni.editMeet') : t('alumni.planAlumniMeet')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2 space-y-1">
              <Label>{t('alumni.meetTitle')}</Label>
              <Input value={meetForm.title} onChange={e => setF("title", e.target.value)} placeholder="Silver Jubilee Reunion 2026" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>{t('alumni.descriptionLabel')}</Label>
              <Textarea value={meetForm.description} onChange={e => setF("description", e.target.value)} rows={2} placeholder="What is this meet about?" />
            </div>
            <div className="space-y-1">
              <Label>{t('alumni.dateLabel')}</Label>
              <Input type="date" value={meetForm.date} onChange={e => setF("date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('alumni.startTime')}</Label>
              <Input type="time" value={meetForm.startTime} onChange={e => setF("startTime", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('alumni.endTime')}</Label>
              <Input type="time" value={meetForm.endTime} onChange={e => setF("endTime", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('alumni.expectedAttendees')}</Label>
              <Input
                type="number"
                min={0}
                value={meetForm.expectedAttendees || ""}
                onChange={e => setF("expectedAttendees", parseInt(e.target.value) || 0)}
                placeholder="100"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2 py-1">
              <Checkbox
                id="isVirtual"
                checked={meetForm.isVirtual}
                onCheckedChange={v => setF("isVirtual", !!v)}
              />
              <Label htmlFor="isVirtual" className="cursor-pointer">{t('alumni.virtualOnline')}</Label>
            </div>

            {!meetForm.isVirtual && (
              <>
                <div className="col-span-2 space-y-1">
                  <Label>{t('alumni.venueLabel')}</Label>
                  <Input value={meetForm.venue} onChange={e => setF("venue", e.target.value)} placeholder="School Auditorium" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>{t('alumni.venueAddress')}</Label>
                  <Input value={meetForm.venueAddress} onChange={e => setF("venueAddress", e.target.value)} placeholder="Full address" />
                </div>
              </>
            )}
            {meetForm.isVirtual && (
              <div className="col-span-2 space-y-1">
                <Label>{t('alumni.meetingLink')}</Label>
                <Input value={meetForm.virtualLink} onChange={e => setF("virtualLink", e.target.value)} placeholder="https://meet.google.com/…" />
              </div>
            )}

            <div className="space-y-1">
              <Label>{t('alumni.organizer')}</Label>
              <Input value={meetForm.organizer} onChange={e => setF("organizer", e.target.value)} placeholder="Organizer name" />
            </div>
            <div className="space-y-1">
              <Label>{t('alumni.organizerContact')}</Label>
              <Input value={meetForm.organizerContact} onChange={e => setF("organizerContact", e.target.value)} placeholder="Phone / email" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>{t('alumni.cancel')}</Button>
            <Button onClick={handleSaveMeet} disabled={saving}>
              {saving ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />{t('alumni.saving')}</> : <><CheckCircle2 className="h-4 w-4 mr-2" />{editingMeet ? t('alumni.update') : t('alumni.createMeet')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: DONATIONS
// ─────────────────────────────────────────────────────────────

function DonationsTab() {
  const { t } = useLanguage();
  const [donations, setDonations] = useState<AlumniDonationBasic[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [donForm, setDonForm] = useState<CreateDonationDto>({
    alumniId: "", amount: 0, purpose: "", donationDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Bank Transfer", receiptNumber: "", isAnonymous: false, message: "",
  });
  // Alumni search for donor selector
  const [alumniSearch, setAlumniSearch] = useState("");
  const [alumniResults, setAlumniResults] = useState<AlumniBasic[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<AlumniBasic | null>(null);
  const donorSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load(pg = 1) {
    setLoading(true);
    setErr(false);
    alumniApi.getDonations(pg, 15)
      .then(r => {
        setDonations(r.items ?? []);
        setTotal(r.totalCount);
        setTotalPages(r.totalPages);
        setPage(pg);
      })
      .catch(() => { setErr(true); toast.error("Failed to load donations"); })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  // Donor search
  useEffect(() => {
    if (!alumniSearch || alumniSearch.length < 2) { setAlumniResults([]); return; }
    if (donorSearchRef.current) clearTimeout(donorSearchRef.current);
    donorSearchRef.current = setTimeout(() => {
      alumniApi.getAlumni({ search: alumniSearch }, 1, 8)
        .then(r => setAlumniResults(r.items ?? []))
        .catch(() => { /* silent */ });
    }, 300);
  }, [alumniSearch]);

  function setF(k: keyof CreateDonationDto, v: unknown) {
    setDonForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleRecord() {
    if (!donForm.alumniId || !donForm.amount || !donForm.purpose || !donForm.donationDate) {
      toast.error("Alumni, amount, purpose and date are required");
      return;
    }
    setSaving(true);
    try {
      await alumniApi.createDonation(donForm);
      toast.success("Donation recorded successfully");
      setShowRecord(false);
      setSelectedDonor(null); setAlumniSearch(""); setAlumniResults([]);
      setDonForm({
        alumniId: "", amount: 0, purpose: "", donationDate: new Date().toISOString().split("T")[0],
        paymentMethod: "Bank Transfer", receiptNumber: "", isAnonymous: false, message: "",
      });
      load(1);
    } catch {
      toast.error("Failed to record donation");
    } finally {
      setSaving(false);
    }
  }

  const totalAmount = donations.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label={t('alumni.totalRaised')} value={fmtCurrency(totalAmount)} icon={DollarSign} color="bg-emerald-500" sub={t('alumni.allTime')} />
        <StatCard label={t('alumni.totalDonations')} value={fmt(total)} icon={Heart} color="bg-rose-500" />
        <div className="flex items-end justify-end md:justify-start">
          <Button onClick={() => setShowRecord(true)}>
            <Plus className="h-4 w-4 mr-2" /> {t('alumni.recordDonation')}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">{t('alumni.loading')}</span>
        </div>
      )}
      {err && !loading && (
        <div className="flex flex-col items-center py-16 gap-3">
          <AlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-sm text-muted-foreground">{t('alumni.failedLoadDonations')}</p>
          <Button variant="outline" size="sm" onClick={() => load()}>{t('alumni.retry')}</Button>
        </div>
      )}
      {!loading && !err && donations.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3">
          <Heart className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('alumni.noDonationsYet')}</p>
          <Button size="sm" onClick={() => setShowRecord(true)}><Plus className="h-4 w-4 mr-2" />{t('alumni.recordFirstDonation')}</Button>
        </div>
      )}

      {!loading && !err && donations.length > 0 && (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('alumni.colDonor')}</TableHead>
                <TableHead>{t('common.amount')}</TableHead>
                <TableHead>{t('alumni.colPurpose')}</TableHead>
                <TableHead>{t('alumni.colType')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.alumniName || t('alumni.anonymous')}</TableCell>
                  <TableCell className="font-semibold text-emerald-700">{fmtCurrency(d.amount)}</TableCell>
                  <TableCell className="text-sm">{d.purpose}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.donationType || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(d.donationDate)}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.status === "Received" || d.status === "Verified"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {d.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={p => load(p)} />

      {/* Record Donation Dialog */}
      <Dialog open={showRecord} onOpenChange={setShowRecord}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('alumni.recordDonationTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Donor Selector */}
            <div className="space-y-1">
              <Label>{t('alumni.donorLabel')}</Label>
              {selectedDonor ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <AlumniAvatar firstName={selectedDonor.firstName} lastName={selectedDonor.lastName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{selectedDonor.firstName} {selectedDonor.lastName}</p>
                    <p className="text-xs text-muted-foreground">{selectedDonor.company || selectedDonor.currentOccupation} · Batch {selectedDonor.graduationYear}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedDonor(null); setDonForm(p => ({ ...p, alumniId: "" })); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search alumni by name…"
                    value={alumniSearch}
                    onChange={e => setAlumniSearch(e.target.value)}
                    className="pl-9"
                  />
                  {alumniResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {alumniResults.map(a => (
                        <button
                          key={a.id}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-muted text-left text-sm"
                          onClick={() => {
                            setSelectedDonor(a);
                            setDonForm(p => ({ ...p, alumniId: a.id }));
                            setAlumniSearch(""); setAlumniResults([]);
                          }}
                        >
                          <AlumniAvatar firstName={a.firstName} lastName={a.lastName} size="sm" />
                          <div>
                            <p className="font-medium">{a.firstName} {a.lastName}</p>
                            <p className="text-xs text-muted-foreground">{a.company} · Batch {a.graduationYear}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t('alumni.amountLabel')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={donForm.amount || ""}
                  onChange={e => setF("amount", parseFloat(e.target.value) || 0)}
                  placeholder="5000"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('alumni.dateLabel')}</Label>
                <Input type="date" value={donForm.donationDate} onChange={e => setF("donationDate", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t('alumni.purposeLabel')}</Label>
                <Select value={donForm.purpose || "_none_"} onValueChange={v => setF("purpose", v === "_none_" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">Select…</SelectItem>
                    {DONATION_PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('alumni.paymentMethodLabel')}</Label>
                <Select value={donForm.paymentMethod || "Bank Transfer"} onValueChange={v => setF("paymentMethod", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{t('alumni.receiptNumber')}</Label>
                <Input value={donForm.receiptNumber} onChange={e => setF("receiptNumber", e.target.value)} placeholder="REC-2026-001" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{t('alumni.donorMessage')}</Label>
                <Textarea value={donForm.message} onChange={e => setF("message", e.target.value)} rows={2} placeholder="Optional message" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox
                  id="isAnon"
                  checked={donForm.isAnonymous}
                  onCheckedChange={v => setF("isAnonymous", !!v)}
                />
                <Label htmlFor="isAnon" className="cursor-pointer">{t('alumni.isAnonymous')}</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowRecord(false)} disabled={saving}>{t('alumni.cancel')}</Button>
            <Button onClick={handleRecord} disabled={saving}>
              {saving ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />{t('alumni.saving')}</> : <><Heart className="h-4 w-4 mr-2" />{t('alumni.recordDonation')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: OUTREACH
// ─────────────────────────────────────────────────────────────

function OutreachTab() {
  const { t } = useLanguage();
  const [batchFilter, setBatchFilter] = useState("_all_");
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl border bg-gradient-to-r from-violet-50 to-blue-50 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <Send className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold">{t('alumni.reachOut')}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('alumni.reachOutDesc')}{" "}
              <a href="/communication" className="text-violet-600 hover:underline font-medium inline-flex items-center gap-1">
                {t('alumni.commsHubLink')} <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t('alumni.quickCompose')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('alumni.targetAudience')}</Label>
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all_">{t('alumni.allAlumni')}</SelectItem>
                  {BATCH_YEARS.map(y => <SelectItem key={y} value={y}>{t('alumni.batchLabel')} {y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('alumni.channelLabel')}</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {channel === "email" && (
            <div className="space-y-1">
              <Label>{t('alumni.subjectLabel')}</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="News from school…" />
            </div>
          )}
          <div className="space-y-1">
            <Label>{t('alumni.messageLabel')}</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder={
                channel === "sms"
                  ? "Keep it under 160 characters for a single SMS…"
                  : "Dear alumni, we hope you are doing well…"
              }
            />
            {channel === "sms" && (
              <p className={`text-xs mt-1 ${body.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                {body.length}/160 characters
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={() => {
                if (!body.trim()) { toast.error("Message body cannot be empty"); return; }
                window.location.href = `/communication?compose=1&channel=${channel}&body=${encodeURIComponent(body)}&subject=${encodeURIComponent(subject)}&audience=alumni`;
              }}
            >
              <Send className="h-4 w-4 mr-2" /> {t('alumni.sendViaComms')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!body.trim()) { toast.error("Message body cannot be empty"); return; }
                toast.success(`Message drafted for ${batchFilter === "_all_" ? "all alumni" : `Batch ${batchFilter}`}. Opening Communications Hub…`);
              }}
            >
              {t('alumni.saveAsDraft')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-3">{t('alumni.engagementTips')}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Invite alumni with <strong>WillingToSpeak</strong> flag for Career Day events.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Connect <strong>Mentors</strong> with current students for guidance programmes.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Alumni marked <strong>Open to Hire</strong> can support campus placements.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Regular newsletters to all alumni keep them connected to school milestones.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN HUB
// ─────────────────────────────────────────────────────────────

export default function AlumniHub() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  const visitedTabs = useRef(new Set(["overview"]));

  const [viewingAlumniId, setViewingAlumniId] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editData, setEditData] = useState<AlumniFull | null>(null);

  // Refresher to tell Directory to reload after add/edit
  const [directoryKey, setDirectoryKey] = useState(0);

  function handleTabChange(tab: string) {
    visitedTabs.current.add(tab);
    setActiveTab(tab);
  }

  function openProfile(id: string) {
    setViewingAlumniId(id);
    setShowProfileDialog(true);
  }

  function openAddAlumni() {
    setEditData(null);
    setShowAddEdit(true);
  }

  const handleEditAlumni = useCallback((alumni: AlumniFull) => {
    setShowProfileDialog(false);
    setEditData(alumni);
    setShowAddEdit(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-violet-600" />
            {t('alumni.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('alumni.desc')}
          </p>
        </div>
      </div>

      {/* Auto-registration notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <BadgeCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>{t('alumni.autoRegTitle')}</strong> {t('alumni.autoRegNotice')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-10">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4" /> {t('alumni.tabOverview')}
          </TabsTrigger>
          <TabsTrigger value="directory" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-4 w-4" /> {t('alumni.tabDirectory')}
          </TabsTrigger>
          <TabsTrigger value="meets" className="gap-1.5 text-xs sm:text-sm">
            <Calendar className="h-4 w-4" /> {t('alumni.tabMeets')}
          </TabsTrigger>
          <TabsTrigger value="donations" className="gap-1.5 text-xs sm:text-sm">
            <Heart className="h-4 w-4" /> {t('alumni.tabDonations')}
          </TabsTrigger>
          <TabsTrigger value="outreach" className="gap-1.5 text-xs sm:text-sm">
            <Send className="h-4 w-4" /> {t('alumni.tabOutreach')}
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" forceMount={visitedTabs.current.has("overview") || undefined}>
            {visitedTabs.current.has("overview") && <OverviewTab />}
          </TabsContent>

          <TabsContent value="directory" forceMount={visitedTabs.current.has("directory") || undefined}>
            {visitedTabs.current.has("directory") && (
              <DirectoryTab
                key={directoryKey}
                onOpenProfile={openProfile}
                onAddAlumni={openAddAlumni}
              />
            )}
          </TabsContent>

          <TabsContent value="meets" forceMount={visitedTabs.current.has("meets") || undefined}>
            {visitedTabs.current.has("meets") && <MeetsTab />}
          </TabsContent>

          <TabsContent value="donations" forceMount={visitedTabs.current.has("donations") || undefined}>
            {visitedTabs.current.has("donations") && <DonationsTab />}
          </TabsContent>

          <TabsContent value="outreach" forceMount={visitedTabs.current.has("outreach") || undefined}>
            {visitedTabs.current.has("outreach") && <OutreachTab />}
          </TabsContent>
        </div>
      </Tabs>

      {/* Profile Dialog */}
      <ProfileDialog
        alumniId={viewingAlumniId}
        open={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
        onEdit={handleEditAlumni}
      />

      {/* Add / Edit Dialog */}
      <AddEditAlumniDialog
        open={showAddEdit}
        onClose={() => { setShowAddEdit(false); setEditData(null); }}
        editData={editData}
        onSaved={() => {
          setDirectoryKey(k => k + 1);
          if (activeTab !== "directory") {
            visitedTabs.current.add("directory");
            setActiveTab("directory");
          }
        }}
      />
    </div>
  );
}
