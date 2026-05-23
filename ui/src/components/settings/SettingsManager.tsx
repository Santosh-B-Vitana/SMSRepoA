
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Settings,
  User,
  Shield,
  Palette,
  Building,
  GraduationCap,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  Clock,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useSchool } from "../../contexts/SchoolContext";
import { BoardConfigurationManager } from "@/components/board/BoardConfigurationManager";
import settingsApi, {
  SchoolSettingResponse,
  UserSettingResponse,
  getSetting,
  buildSchoolSetting,
  buildUserSetting,
} from "../../services/api/settingsApi";


// ─── Helpers ──────────────────────────────────────────────────────────────────

const isAdmin = (role?: string) =>
  role === "admin" || role === "super_admin";

function SaveButton({ saving }: { saving: boolean }) {
  return (
    <Button type="submit" disabled={saving} className="min-w-[120px]">
      {saving ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </>
      )}
    </Button>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await settingsApi.getUserSettings(userId);
      const s = res.userSettings ?? [];
      setSettings(s);
      setFirstName(getSetting(s, "profile_first_name", user?.name?.split(" ")[0] ?? ""));
      setLastName(getSetting(s, "profile_last_name", user?.name?.split(" ").slice(1).join(" ") ?? ""));
      setPhone(getSetting(s, "profile_phone", ""));
      setBio(getSetting(s, "profile_bio", ""));
      setJobTitle(getSetting(s, "profile_job_title", ""));
    } catch {
      // pre-populate from auth context on load failure
      setFirstName(user?.name?.split(" ")[0] ?? "");
      setLastName(user?.name?.split(" ").slice(1).join(" ") ?? "");
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn) {
      toast.error("First name is required");
      return;
    }
    setSaving(true);
    try {
      // 1. Update the actual UserLogin record so the display name changes everywhere
      await settingsApi.updateMyProfile({ firstName: fn, lastName: ln });

      // 2. Persist extra profile fields (phone, bio, jobTitle) to KV settings
      await settingsApi.bulkUpdate({
        userSettings: [
          buildUserSetting("profile_first_name", fn, "profile"),
          buildUserSetting("profile_last_name", ln, "profile"),
          buildUserSetting("profile_phone", phone, "profile"),
          buildUserSetting("profile_bio", bio, "profile"),
          buildUserSetting("profile_job_title", jobTitle, "profile"),
        ],
      });
      toast.success("Profile updated successfully");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to save profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your personal details visible to others in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {(firstName[0] ?? user?.name?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{firstName} {lastName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-1 capitalize">{user?.role}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profileEmail">Email Address</Label>
            <Input
              id="profileEmail"
              type="email"
              defaultValue={user?.email ?? ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed here. Contact your administrator.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job Title / Designation</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Teacher, Vice Principal"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell colleagues about yourself…"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>

          <SaveButton saving={saving} />
        </CardContent>
      </Card>
    </form>
  );
}

// ─── School Tab ───────────────────────────────────────────────────────────────

function SchoolTab({ schoolId, role }: { schoolId: string; role: string }) {
  const isSuperAdmin = role === "super_admin";
  const { refreshSchoolInfo } = useSchool();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [establishedYear, setEstablishedYear] = useState("");
  const [schoolType, setSchoolType] = useState("private");

  const load = useCallback(async () => {
    try {
      // Step 1: load canonical School entity data (name, address, phone, email, logo)
      const [info, kvRes] = await Promise.all([
        settingsApi.getSchoolInfo(),
        settingsApi.getSchoolSettings(schoolId, "school_profile"),
      ]);
      const s = kvRes.settings ?? [];

      // School entity is the authoritative source for identity + contact fields
      setName(info.name ?? "");
      setAddress(info.address ?? "");
      setPhone(info.phone ?? "");
      setEmail(info.email ?? "");
      setLogoUrl(info.logoUrl ?? "");

      // KV settings hold additional fields not on the entity
      setTagline(getSetting(s, "school_tagline", ""));
      setWebsite(getSetting(s, "school_website", ""));
      setEstablishedYear(getSetting(s, "school_established_year", ""));
      setSchoolType(getSetting(s, "school_type", "private"));
    } catch {
      toast.error("Failed to load school settings");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Update School entity fields (phone, email, address; name + logo for super admin)
      await settingsApi.updateSchoolContact(schoolId, {
        phone,
        email,
        address,
        website,
        tagline: isSuperAdmin ? tagline : undefined,
        name:    isSuperAdmin ? name    : undefined,
        logo:    isSuperAdmin ? logoUrl : undefined,
      });

      // Super admin also persists extra KV fields not on the entity
      if (isSuperAdmin) {
        await settingsApi.bulkUpdate({
          schoolSettings: [
            buildSchoolSetting("school_established_year", establishedYear, "school_profile"),
            buildSchoolSetting("school_type", schoolType, "school_profile"),
          ],
        });
      }

      await refreshSchoolInfo();
      toast.success("School settings saved");
    } catch {
      toast.error("Failed to save school settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            School Profile
          </CardTitle>
          <CardDescription>
            {isSuperAdmin
              ? "Full school profile — only super administrators can change identity fields."
              : "Contact and operational details. School name and type can only be changed by a super administrator."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Identity section */}
          {isSuperAdmin ? (
            <>
              {logoUrl && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <img
                    src={logoUrl}
                    alt="School logo"
                    className="h-12 w-12 rounded object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <p className="text-sm text-muted-foreground">Current logo preview</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="logoUrl">School Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://cdn.example.com/logo.png"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="schoolName">School Name *</Label>
                  <Input
                    id="schoolName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Greenwood Academy"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="schoolType">School Type</Label>
                  <Select value={schoolType} onValueChange={setSchoolType}>
                    <SelectTrigger id="schoolType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="charter">Charter</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                      <SelectItem value="religious">Religious / Faith-Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tagline">Tagline / Motto</Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Empowering minds, shaping futures"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="establishedYear">Established Year</Label>
                  <Input
                    id="establishedYear"
                    value={establishedYear}
                    onChange={(e) => setEstablishedYear(e.target.value)}
                    placeholder="1985"
                    maxLength={4}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">School Identity</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name: </span><span className="font-medium">{name || "—"}</span></div>
                <div><span className="text-muted-foreground">Type: </span><span className="font-medium capitalize">{schoolType || "—"}</span></div>
                {tagline && <div className="col-span-2"><span className="text-muted-foreground">Tagline: </span><span className="font-medium">{tagline}</span></div>}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                <Shield className="w-3 h-3" /> Contact your super administrator to change these fields.
              </p>
            </div>
          )}

          <Separator />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact &amp; Operations</p>

          <div className="space-y-1.5">
            <Label htmlFor="schoolAddress">Address</Label>
            <Textarea
              id="schoolAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 School Street, City, State, ZIP"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="schoolPhone">Phone Number</Label>
              <Input
                id="schoolPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schoolEmail">Official Email</Label>
              <Input
                id="schoolEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@school.edu"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="schoolWebsite">Website</Label>
            <Input
              id="schoolWebsite"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.school.edu"
            />
          </div>

          <SaveButton saving={saving} />
        </CardContent>
      </Card>
    </form>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changed, setChanged] = useState(false);

  const strength = (() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 8) s++;
    if (/[A-Z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await settingsApi.changePassword({ currentPassword: currentPw, newPassword: newPw });
      toast.success("Password changed. Please log in again on other devices.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setChanged(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to change password";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {changed && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Password changed successfully. Other active sessions have been invalidated.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Use a strong, unique password you don't use anywhere else
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPw">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPw"
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((p) => !p)}
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="newPw">New Password</Label>
              <div className="relative">
                <Input
                  id="newPw"
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((p) => !p)}
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPw && (
                <div className="space-y-1 mt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${i <= strength ? strengthColor : "bg-muted"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength: <span className="font-medium">{strengthLabel}</span>
                    {" · "}Min 8 chars, include uppercase, number and symbol for strong password
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPw">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPw"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Passwords do not match
                </p>
              )}
            </div>

            <SaveButton saving={saving} />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            "Use a password manager to generate and store unique passwords",
            "Never share your password with anyone, including administrators",
            "Change your password if you suspect any unauthorised access",
            "Log out from shared devices after each session",
          ].map((tip) => (
            <div key={tip} className="flex items-start gap-2 text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Appearance Tab ───────────────────────────────────────────────────────────

function AppearanceTab({ userId }: { userId: string }) {
  const { language, setLanguage } = useLanguage();
  const { setTheme: applyTheme, theme: currentTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [timeFormat, setTimeFormat] = useState("12h");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  const load = useCallback(async () => {
    try {
      const res = await settingsApi.getUserSettings(userId);
      const s = res.userSettings ?? [];
      setTimezone(getSetting(s, "pref_timezone", "UTC"));
      setDateFormat(getSetting(s, "pref_date_format", "DD/MM/YYYY"));
      setTimeFormat(getSetting(s, "pref_time_format", "12h"));
      const savedTheme = getSetting(s, "pref_theme", currentTheme) as "light" | "dark" | "system";
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } catch {
      // keep defaults, but ensure UI reflects current app theme
      setTheme(currentTheme);
    } finally {
      setLoading(false);
    }
  }, [userId, applyTheme, currentTheme]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Apply immediately so top-nav preference and settings page stay in sync.
    applyTheme(theme);
    localStorage.setItem("school-ui-theme", theme);

    try {
      await Promise.all([
        settingsApi.setUserSetting({
          userId,
          settingKey: "pref_language",
          settingValue: language,
          category: "appearance",
          dataType: "string",
        }),
        settingsApi.setUserSetting({
          userId,
          settingKey: "pref_timezone",
          settingValue: timezone,
          category: "appearance",
          dataType: "string",
        }),
        settingsApi.setUserSetting({
          userId,
          settingKey: "pref_date_format",
          settingValue: dateFormat,
          category: "appearance",
          dataType: "string",
        }),
        settingsApi.setUserSetting({
          userId,
          settingKey: "pref_time_format",
          settingValue: timeFormat,
          category: "appearance",
          dataType: "string",
        }),
        settingsApi.setUserSetting({
          userId,
          settingKey: "pref_theme",
          settingValue: theme,
          category: "appearance",
          dataType: "string",
        }),
      ]);
      toast.success("Appearance preferences saved");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Saved theme locally, but server sync failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const timezones = [
    "UTC", "America/New_York", "America/Chicago", "America/Los_Angeles",
    "America/Toronto", "Europe/London", "Europe/Berlin", "Europe/Paris",
    "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
    "Australia/Sydney", "Africa/Lagos", "Africa/Nairobi",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Appearance & Localisation
          </CardTitle>
          <CardDescription>
            Customise how the system looks and presents information to you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Language
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                  <SelectItem value="ar">Arabic (العربية)</SelectItem>
                  <SelectItem value="fr">French (Français)</SelectItem>
                  <SelectItem value="es">Spanish (Español)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Timezone
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date Format
              </Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (17/04/2026)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (04/17/2026)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2026-04-17)</SelectItem>
                  <SelectItem value="D MMM YYYY">D MMM YYYY (17 Apr 2026)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Time Format
              </Label>
              <Select value={timeFormat} onValueChange={setTimeFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                  <SelectItem value="24h">24-hour (14:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "light", label: "Light", icon: "☀️" },
                { value: "dark", label: "Dark", icon: "🌙" },
                { value: "system", label: "System", icon: "💻" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    theme === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <SaveButton saving={saving} />
        </CardContent>
      </Card>
    </form>
  );
}

// ─── Academic Settings Tab ────────────────────────────────────────────────────

function AcademicTab({ schoolId }: { schoolId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gradingSystem, setGradingSystem] = useState("percentage");
  const [passMark, setPassMark] = useState("40");
  const [minAttendance, setMinAttendance] = useState("75");
  const [lateMarkMinutes, setLateMarkMinutes] = useState("15");
  const [termCount, setTermCount] = useState("3");
  const [feeDueDays, setFeeDueDays] = useState("7");
  const [lateFeePercent, setLateFeePercent] = useState("2");
  const [gracePeriodDays, setGracePeriodDays] = useState("3");
  const [workingDays, setWorkingDays] = useState("MON,TUE,WED,THU,FRI");

  const load = useCallback(async () => {
    try {
      const res = await settingsApi.getSchoolSettings(schoolId, "academic");
      const s = res.settings ?? [];
      setGradingSystem(getSetting(s, "grading_system", "percentage"));
      setPassMark(getSetting(s, "pass_mark_percent", "40"));
      setMinAttendance(getSetting(s, "min_attendance_percent", "75"));
      setLateMarkMinutes(getSetting(s, "late_mark_minutes", "15"));
      setTermCount(getSetting(s, "term_count", "3"));
      setFeeDueDays(getSetting(s, "fee_due_reminder_days", "7"));
      setLateFeePercent(getSetting(s, "late_fee_percentage", "2"));
      setGracePeriodDays(getSetting(s, "fee_grace_period_days", "3"));
      setWorkingDays(getSetting(s, "working_days", "MON,TUE,WED,THU,FRI"));
    } catch {
      toast.error("Failed to load academic settings");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.bulkUpdate({
        schoolSettings: [
          buildSchoolSetting("grading_system", gradingSystem, "academic"),
          buildSchoolSetting("pass_mark_percent", passMark, "academic", "number"),
          buildSchoolSetting("min_attendance_percent", minAttendance, "academic", "number"),
          buildSchoolSetting("late_mark_minutes", lateMarkMinutes, "academic", "number"),
          buildSchoolSetting("term_count", termCount, "academic", "number"),
          buildSchoolSetting("fee_due_reminder_days", feeDueDays, "academic", "number"),
          buildSchoolSetting("late_fee_percentage", lateFeePercent, "academic", "number"),
          buildSchoolSetting("fee_grace_period_days", gracePeriodDays, "academic", "number"),
          buildSchoolSetting("working_days", workingDays, "academic"),
        ],
      });
      toast.success("Academic settings saved");
    } catch {
      toast.error("Failed to save academic settings");
    } finally {
      setSaving(false);
    }
  }

  const dayLabels: Record<string, string> = {
    MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu",
    FRI: "Fri", SAT: "Sat", SUN: "Sun",
  };
  const allDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const selectedDays = workingDays.split(",").map((d) => d.trim()).filter(Boolean);

  function toggleDay(day: string) {
    const days = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    setWorkingDays(days.join(","));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BoardConfigurationManager />
      <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Academic Configuration
          </CardTitle>
          <CardDescription>
            School-wide academic rules applied across all modules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grading */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Grading & Results
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gradingSystem">Grading System</Label>
                <Select value={gradingSystem} onValueChange={setGradingSystem}>
                  <SelectTrigger id="gradingSystem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="gpa_4">GPA (4.0 scale)</SelectItem>
                    <SelectItem value="gpa_10">GPA (10.0 scale)</SelectItem>
                    <SelectItem value="letter">Letter Grades (A–F)</SelectItem>
                    <SelectItem value="marks">Raw Marks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="passMark">Pass Mark (%)</Label>
                <Input
                  id="passMark"
                  type="number"
                  min={1}
                  max={100}
                  value={passMark}
                  onChange={(e) => setPassMark(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="termCount">Terms per Year</Label>
                <Select value={termCount} onValueChange={setTermCount}>
                  <SelectTrigger id="termCount">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Semesters</SelectItem>
                    <SelectItem value="3">3 Terms</SelectItem>
                    <SelectItem value="4">4 Quarters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Attendance */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Attendance Rules
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="minAttendance">Minimum Attendance Required (%)</Label>
                <Input
                  id="minAttendance"
                  type="number"
                  min={1}
                  max={100}
                  value={minAttendance}
                  onChange={(e) => setMinAttendance(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Students below this threshold will be flagged
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lateMarkMinutes">Late Mark Threshold (minutes)</Label>
                <Input
                  id="lateMarkMinutes"
                  type="number"
                  min={1}
                  value={lateMarkMinutes}
                  onChange={(e) => setLateMarkMinutes(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Arrivals after this many minutes count as late
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Working days */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Working Days
            </h3>
            <div className="flex flex-wrap gap-2">
              {allDays.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                    selectedDays.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {dayLabels[day]}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Fee Rules */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Fee & Payment Rules
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="feeDueDays">Due Reminder (days before)</Label>
                <Input
                  id="feeDueDays"
                  type="number"
                  min={1}
                  value={feeDueDays}
                  onChange={(e) => setFeeDueDays(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gracePeriodDays">Grace Period (days)</Label>
                <Input
                  id="gracePeriodDays"
                  type="number"
                  min={0}
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lateFeePercent">Late Fee (%)</Label>
                <Input
                  id="lateFeePercent"
                  type="number"
                  min={0}
                  step={0.5}
                  value={lateFeePercent}
                  onChange={(e) => setLateFeePercent(e.target.value)}
                />
              </div>
            </div>
          </div>

          <SaveButton saving={saving} />
        </CardContent>
      </Card>
      </form>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SettingsManager() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sub = params.get("sub");
    if (sub) setActiveTab(sub);
  }, [location.search]);

  if (!user) return null;

  const adminTabs = isAdmin(user.role);
  const userId = user.id as string;
  const schoolId = user.schoolId as string;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, preferences and school configuration
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full h-auto ${adminTabs ? "grid-cols-3 md:grid-cols-5" : "grid-cols-3"}`}>
          <TabsTrigger value="profile" className="flex items-center gap-1.5 py-2.5">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5 py-2.5">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-1.5 py-2.5">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          {adminTabs && (
            <TabsTrigger value="school" className="flex items-center gap-1.5 py-2.5">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">School</span>
            </TabsTrigger>
          )}
          {adminTabs && (
            <TabsTrigger value="academic" className="flex items-center gap-1.5 py-2.5">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Academic</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab userId={userId} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceTab userId={userId} />
        </TabsContent>

        {adminTabs && (
          <TabsContent value="school">
            <SchoolTab schoolId={schoolId} role={user.role ?? "admin"} />
          </TabsContent>
        )}

        {adminTabs && (
          <TabsContent value="academic">
            <AcademicTab schoolId={schoolId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
