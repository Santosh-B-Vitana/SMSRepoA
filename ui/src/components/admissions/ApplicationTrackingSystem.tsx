import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ChevronDown, ChevronUp, Circle, Clock, Loader2, Search, XCircle } from "lucide-react";
import { useAdmissions } from "@/hooks/useAdmissions";
import { useDebounce } from "@/hooks/useDebounce";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import type { Admission } from "@/services/admissionService";

// ── Stage configuration ────────────────────────────────────────────────────
interface StageConfig {
  label: string;
  completedWhen: Array<Admission['status']>;
  currentWhen:   Array<Admission['status']>;
}

const PIPELINE: StageConfig[] = [
  {
    label: "Application Submitted",
    completedWhen: ["pending", "interviewed", "approved", "enrolled", "rejected", "waitlisted"],
    currentWhen:   [],
  },
  {
    label: "Document Verification",
    completedWhen: ["interviewed", "approved", "enrolled", "rejected"],
    currentWhen:   ["pending"],
  },
  {
    label: "Entrance Test",
    completedWhen: ["approved", "enrolled", "rejected"],
    currentWhen:   ["interviewed"],
  },
  {
    label: "Interview",
    completedWhen: ["approved", "enrolled", "rejected"],
    currentWhen:   ["interviewed"],
  },
  {
    label: "Final Decision",
    completedWhen: ["approved", "enrolled", "rejected"],
    currentWhen:   ["waitlisted"],
  },
];

function getStageStatus(cfg: StageConfig, status: Admission['status']) {
  if (cfg.completedWhen.includes(status)) return 'completed';
  if (cfg.currentWhen.includes(status))   return 'current';
  return 'pending';
}

function getStageDate(label: string, a: Admission): string | undefined {
  if (label === "Application Submitted") return new Date(a.applicationDate).toLocaleDateString();
  if (label === "Interview" && a.interviewDate) return new Date(a.interviewDate).toLocaleDateString();
  return undefined;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  interviewed:"bg-orange-100 text-orange-800",
  approved:   "bg-green-100 text-green-800",
  enrolled:   "bg-purple-100 text-purple-800",
  rejected:   "bg-red-100 text-red-800",
  waitlisted: "bg-blue-100 text-blue-800",
};

// ── Current step label shown in collapsed view ─────────────────────────────
function currentStageLabel(status: Admission['status']): string {
  const map: Record<string, string> = {
    pending:    "Document Verification – In Progress",
    interviewed:"Interview – In Progress",
    approved:   "All stages complete",
    enrolled:   "Enrolled ✓",
    rejected:   "Application Rejected",
    waitlisted: "Waitlisted",
  };
  return map[status] ?? status;
}

// ── Compact progress bar (5 dots) ─────────────────────────────────────────
function ProgressDots({ status }: { status: Admission['status'] }) {
  return (
    <div className="flex items-center gap-1.5">
      {PIPELINE.map((cfg) => {
        const s = getStageStatus(cfg, status);
        return (
          <div
            key={cfg.label}
            title={cfg.label}
            className={
              s === 'completed'
                ? "h-2 w-2 rounded-full bg-green-500"
                : s === 'current'
                ? "h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-300"
                : "h-2 w-2 rounded-full bg-muted-foreground/25"
            }
          />
        );
      })}
    </div>
  );
}

// ── Single application tracking card ──────────────────────────────────────
function TrackingCard({ admission, compactMode }: { admission: Admission; compactMode?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-lg bg-muted/20 overflow-hidden ${
      compactMode ? "" : "py-1 px-1"
    }`}>
      {/* Collapsed header — always visible */}
      <button
        type="button"
        className={`w-full flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors ${
          compactMode ? "px-4 py-3" : "px-6 py-4"
        }`}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className={`flex flex-wrap items-center ${
            compactMode ? "gap-2" : "gap-3"
          }`}>
            <span className={`font-semibold truncate ${
              compactMode ? "text-sm" : "text-base"
            }`}>{admission.studentName}</span>
            <Badge className={`text-xs shrink-0 ${
              compactMode ? "" : "text-xs px-2 py-1"
            } ${STATUS_COLORS[admission.status] ?? ""}`}>
              {admission.status.charAt(0).toUpperCase() + admission.status.slice(1)}
            </Badge>
          </div>
          <div className={`flex flex-wrap items-center mt-1 ${
            compactMode ? "gap-3 text-xs" : "gap-4 text-sm"
          }`}>
            <span className="text-muted-foreground font-mono">
              {admission.applicationNumber}
            </span>
            <span className="text-muted-foreground">Class {admission.appliedClass}</span>
            <ProgressDots status={admission.status} />
          </div>
          {!expanded && (
            <p className={`text-muted-foreground italic ${
              compactMode ? "text-xs" : "text-sm"
            } mt-0.5`}>
              {currentStageLabel(admission.status)}
            </p>
          )}
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded pipeline detail */}
      {expanded && (
        <div className={`border-t space-y-3 ${
          compactMode ? "px-4 pb-4 pt-1" : "px-6 pb-5 pt-1.5"
        }`}>
          {PIPELINE.map((cfg) => {
            const s    = getStageStatus(cfg, admission.status);
            const date = getStageDate(cfg.label, admission);
            return (
              <div key={cfg.label} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {s === 'completed' ? (
                    admission.status === 'rejected' && cfg.label === 'Final Decision'
                      ? <XCircle className="h-5 w-5 text-red-500" />
                      : <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : s === 'current' ? (
                    <Clock className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={s === 'pending' ? "font-medium text-muted-foreground/50" : "font-medium"}>
                    {cfg.label}
                    {cfg.label === 'Final Decision' && admission.status === 'rejected' &&
                      <span className="ml-2 text-sm font-normal text-red-500">— Rejected</span>}
                    {cfg.label === 'Final Decision' && admission.status === 'approved' &&
                      <span className="ml-2 text-sm font-normal text-green-600">— Approved</span>}
                    {cfg.label === 'Final Decision' && admission.status === 'enrolled' &&
                      <span className="ml-2 text-sm font-normal text-purple-600">— Enrolled</span>}
                  </p>
                  {date && <p className="text-xs text-muted-foreground mt-0.5">{date}</p>}
                  {s === 'current' && (
                    <Badge variant="secondary" className="mt-1 text-xs">In Progress</Badge>
                  )}
                  {cfg.label === 'Final Decision' && admission.status === 'waitlisted' && (
                    <Badge className="mt-1 text-xs bg-blue-100 text-blue-800">Waitlisted</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


export function ApplicationTrackingSystem() {
  const [rawSearch, setRawSearch] = useState("");
  const [page, setPage] = useState(1);
  const { preferences } = useUserPreferences();
  const pageSize = preferences.itemsPerPage ?? 10;

  // Debounce: wait 400 ms after user stops typing before hitting the server
  const searchTerm = useDebounce(rawSearch.trim(), 400);

  // Reset to page 1 when search changes
  const effectivePage = rawSearch.trim() === searchTerm ? page : 1;

  const { items, totalCount, totalPages, isLoading } = useAdmissions({
    filters:    { searchTerm: searchTerm || undefined },
    pagination: { page: effectivePage, pageSize },
  });

  const handleSearchChange = (v: string) => {
    setRawSearch(v);
    setPage(1);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Application Tracking</CardTitle>
            {!isLoading && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalCount} application{totalCount !== 1 ? "s" : ""}
                {searchTerm ? ` matching "${searchTerm}"` : ""}
              </p>
            )}
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or application ID…"
              value={rawSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
            {isLoading && rawSearch && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading && items.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {searchTerm ? `No applications found for "${searchTerm}".` : "No applications found."}
          </p>
        ) : (
          <>
            {items.map((a) => <TrackingCard key={a.id} admission={a} compactMode={preferences.compactMode} />)}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Page {effectivePage} of {totalPages} · {totalCount} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={effectivePage <= 1 || isLoading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={effectivePage >= totalPages || isLoading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
