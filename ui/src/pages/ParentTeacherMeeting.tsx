import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, Users, Plus, ChevronRight, CheckCircle, BookOpen, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/apiClient";

interface PtmSession {
  id: string;
  title: string;
  description?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  location?: string;
  slotCount: number;
  bookedCount: number;
}

const STATUS_CONFIG = {
  scheduled: { label: "Scheduled", variant: "outline" as const },
  ongoing:   { label: "Ongoing",   variant: "default" as const },
  completed: { label: "Completed", variant: "secondary" as const },
  cancelled: { label: "destructive", variant: "destructive" as const },
};

function CreateSessionDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    sessionDate: "",
    startTime: "09:00:00",
    endTime: "13:00:00",
    slotDurationMinutes: 10,
    location: "",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiPost("/ptm/sessions", {
        ...data,
        startTime: data.startTime,
        endTime: data.endTime,
        sessionDate: new Date(data.sessionDate).toISOString(),
      }),
    onSuccess: () => {
      toast({ title: "PTM session created successfully." });
      setOpen(false);
      onCreated();
    },
    onError: () => toast({ title: "Failed to create session.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Schedule PTM</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Parent-Teacher Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Term 1 PTM 2025-26" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes about the PTM..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.sessionDate}
                onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} />
            </div>
            <div>
              <Label>Slot Duration (minutes)</Label>
              <Select value={String(form.slotDurationMinutes)}
                onValueChange={(v) => setForm({ ...form, slotDurationMinutes: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 30].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time *</Label>
              <Input type="time" value={form.startTime.slice(0, 5)}
                onChange={(e) => setForm({ ...form, startTime: e.target.value + ":00" })} />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input type="time" value={form.endTime.slice(0, 5)}
                onChange={(e) => setForm({ ...form, endTime: e.target.value + ":00" })} />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. School Hall, Room 101" />
          </div>
          <Button className="w-full" disabled={mutation.isPending || !form.title || !form.sessionDate}
            onClick={() => mutation.mutate(form)}>
            {mutation.isPending ? "Creating…" : "Create PTM Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SessionCard({ session, onSelect }: { session: PtmSession; onSelect: () => void }) {
  const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.scheduled;
  const utilization = session.slotCount > 0
    ? Math.round((session.bookedCount / session.slotCount) * 100) : 0;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{session.title}</h3>
            {session.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{session.description}</p>
            )}
          </div>
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(parseISO(session.sessionDate), "dd MMM yyyy")}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {session.startTime.slice(0, 5)} – {session.endTime.slice(0, 5)}
          </div>
          {session.location && (
            <div className="flex items-center gap-1.5 col-span-2">
              <MapPin className="h-3.5 w-3.5" />
              {session.location}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {session.slotDurationMinutes}min slots
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {session.bookedCount}/{session.slotCount} booked
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
          <div
            className="h-1.5 rounded-full bg-blue-500 transition-all"
            style={{ width: `${utilization}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{utilization}% booked</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParentTeacherMeeting() {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<PtmSession | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: sessions = [], isLoading } = useQuery<PtmSession[]>({
    queryKey: ["ptm-sessions", statusFilter],
    queryFn: () =>
      apiGet<PtmSession[]>(`/ptm/sessions${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
    staleTime: 60_000,
  });

  const totalSessions = sessions.length;
  const upcomingSessions = sessions.filter((s) => s.status === "scheduled").length;
  const totalBooked = sessions.reduce((sum, s) => sum + s.bookedCount, 0);
  const totalSlots = sessions.reduce((sum, s) => sum + s.slotCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent-Teacher Meetings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule PTM sessions, generate time slots, and track parent bookings.
          </p>
        </div>
        <CreateSessionDialog onCreated={() => queryClient.invalidateQueries({ queryKey: ["ptm-sessions"] })} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: totalSessions, icon: Calendar },
          { label: "Upcoming", value: upcomingSessions, icon: Clock },
          { label: "Slots Generated", value: totalSlots, icon: BookOpen },
          { label: "Slots Booked", value: totalBooked, icon: CheckCircle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Filter:</span>
        {["all", "scheduled", "ongoing", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Session list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No PTM sessions found</p>
            <p className="text-sm text-gray-400 mt-1">Schedule your first Parent-Teacher Meeting to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onSelect={() => setSelectedSession(session)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
