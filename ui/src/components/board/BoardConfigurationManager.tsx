import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, Loader2, Plus, Star, Trash2, CheckCircle2,
  ChevronDown, ChevronRight, Settings2, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  boardApi,
  BoardConfigurationResponse,
  SchoolBoardConfigResponse,
  UpdateSchoolBoardOverridesRequest,
  GradeScaleEntry,
} from '@/services/api/boardApi';

export function BoardConfigurationManager() {
  const [allBoards, setAllBoards] = useState<BoardConfigurationResponse[]>([]);
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoardConfigResponse[]>([]);
  const [addingBoardId, setAddingBoardId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [addingLoading, setAddingLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  // Override panel state
  const [expandedOverride, setExpandedOverride] = useState<string | null>(null);
  const [overrideSaving, setOverrideSaving] = useState<string | null>(null);
  // Per-board form state: boardConfigId → override values
  const [overrideForms, setOverrideForms] = useState<
    Record<string, { overallPct: string; theoryPct: string; practicalPct: string; scaleJson: string; useCustomScale: boolean }>
  >({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [boardsRes, schoolBoardsRes] = await Promise.all([
        boardApi.getAllBoards(),
        boardApi.getSchoolBoards().catch(() => ({ boards: [], total: 0 })),
      ]);
      setAllBoards(boardsRes.boards || []);
      setSchoolBoards(schoolBoardsRes.boards || []);
    } catch {
      toast.error('Failed to load board configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBoard = async () => {
    if (!addingBoardId) {
      toast.error('Please select a board to add');
      return;
    }
    try {
      setAddingLoading(true);
      await boardApi.addSchoolBoard({
        boardConfigurationId: addingBoardId,
        setAsDefault: schoolBoards.length === 0,
      });
      setAddingBoardId('');
      toast.success('Board added successfully');
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to add board');
    } finally {
      setAddingLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      setRemovingId(id);
      await boardApi.removeSchoolBoard(id);
      toast.success('Board removed');
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to remove board');
    } finally {
      setRemovingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      setSettingDefaultId(id);
      await boardApi.setDefaultBoard(id);
      toast.success('Default board updated');
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to set default');
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Initialise override form when expanding a board's override panel
  const handleToggleOverride = (sb: SchoolBoardConfigResponse) => {
    if (expandedOverride === sb.id) {
      setExpandedOverride(null);
      return;
    }
    setExpandedOverride(sb.id);
    // Pre-fill with existing custom values (or empty = using board default)
    setOverrideForms(prev => ({
      ...prev,
      [sb.id]: {
        overallPct: sb.customOverallPassingPercentage != null
          ? String(sb.customOverallPassingPercentage) : '',
        theoryPct: sb.customTheoryPassingPercentage != null
          ? String(sb.customTheoryPassingPercentage) : '',
        practicalPct: sb.customPracticalPassingPercentage != null
          ? String(sb.customPracticalPassingPercentage) : '',
        scaleJson: sb.hasCustomGradingScale
          ? JSON.stringify(sb.effectiveGradingScale, null, 2)
          : JSON.stringify(sb.board.gradingScale, null, 2),
        useCustomScale: sb.hasCustomGradingScale,
      },
    }));
  };

  const handleSaveOverrides = async (sb: SchoolBoardConfigResponse) => {
    const form = overrideForms[sb.id];
    if (!form) return;

    // Validate numeric inputs
    const toNum = (s: string) => s.trim() === '' ? null : parseFloat(s);
    const overallPct = toNum(form.overallPct);
    const theoryPct = toNum(form.theoryPct);
    const practicalPct = toNum(form.practicalPct);

    if (overallPct != null && (overallPct < 0 || overallPct > 100)) {
      toast.error('Overall passing % must be between 0 and 100');
      return;
    }
    if (theoryPct != null && (theoryPct < 0 || theoryPct > 100)) {
      toast.error('Theory passing % must be between 0 and 100');
      return;
    }
    if (practicalPct != null && (practicalPct < 0 || practicalPct > 100)) {
      toast.error('Practical passing % must be between 0 and 100');
      return;
    }

    let customGradingScale: GradeScaleEntry[] | null = null;
    if (form.useCustomScale) {
      try {
        customGradingScale = JSON.parse(form.scaleJson);
        if (!Array.isArray(customGradingScale) || customGradingScale.length === 0) {
          toast.error('Custom grading scale must be a non-empty JSON array');
          return;
        }
      } catch {
        toast.error('Custom grading scale JSON is invalid');
        return;
      }
    }

    const req: UpdateSchoolBoardOverridesRequest = {
      customOverallPassingPercentage: overallPct,
      customTheoryPassingPercentage: theoryPct,
      customPracticalPassingPercentage: practicalPct,
      customGradingScale,
    };

    try {
      setOverrideSaving(sb.id);
      await boardApi.updateSchoolBoardOverrides(sb.id, req);
      toast.success('Overrides saved — board defaults apply where fields are left blank');
      setExpandedOverride(null);
      await loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to save overrides');
    } finally {
      setOverrideSaving(null);
    }
  };

  // Boards not yet added to this school
  const availableToAdd = allBoards.filter(
    (b) => !schoolBoards.some((s) => s.boardConfigurationId === b.id)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Board Configuration</CardTitle>
        <CardDescription>
          Configure which curriculum boards your school supports. Mark one as the default.
          Only configured boards will appear when creating classes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Configured Boards List */}
            {schoolBoards.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Configured Boards</p>
                {schoolBoards.map((sb) => (
                  <div key={sb.id} className="rounded-lg border bg-slate-50 overflow-hidden">
                    {/* Board row */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        {sb.isDefault && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{sb.boardName}</span>
                            <span className="text-xs text-muted-foreground">({sb.boardCode})</span>
                            {sb.isDefault && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                            {(sb.customOverallPassingPercentage != null || sb.hasCustomGradingScale) && (
                              <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                                Overridden
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {sb.boardLevel} · Pass: {sb.effectiveOverallPassingPercentage}%
                            {sb.customOverallPassingPercentage != null && (
                              <span className="text-amber-600 ml-1">(custom)</span>
                            )}
                            {' · '}{sb.board.gradingSystem}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs"
                          onClick={() => handleToggleOverride(sb)}
                          title="Configure overrides"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Override</span>
                          {expandedOverride === sb.id
                            ? <ChevronDown className="h-3 w-3" />
                            : <ChevronRight className="h-3 w-3" />}
                        </Button>
                        {!sb.isDefault && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={settingDefaultId === sb.id}
                            onClick={() => handleSetDefault(sb.id)}
                            title="Set as default"
                          >
                            {settingDefaultId === sb.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Star className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-1 text-xs">Set Default</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={removingId === sb.id}
                          onClick={() => handleRemove(sb.id)}
                          title="Remove board"
                        >
                          {removingId === sb.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Override panel */}
                    {expandedOverride === sb.id && overrideForms[sb.id] && (() => {
                      const form = overrideForms[sb.id];
                      const setField = (key: keyof typeof form, val: string | boolean) =>
                        setOverrideForms(prev => ({ ...prev, [sb.id]: { ...prev[sb.id], [key]: val } }));
                      return (
                        <div className="border-t bg-white px-4 py-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Custom Overrides — {sb.boardName}
                            </p>
                            <p className="text-xs text-muted-foreground">Leave blank to use board default</p>
                          </div>

                          {/* Passing percentages */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                              { label: 'Overall Pass %', key: 'overallPct', boardDefault: sb.board.overallPassingPercentage },
                              { label: 'Theory Pass %', key: 'theoryPct', boardDefault: sb.board.theoryPassingPercentage },
                              { label: 'Practical Pass %', key: 'practicalPct', boardDefault: sb.board.practicalPassingPercentage },
                            ].map(({ label, key, boardDefault }) => (
                              <div key={key} className="space-y-1">
                                <Label className="text-xs">{label}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.5}
                                  placeholder={`Board default: ${boardDefault}%`}
                                  value={form[key as keyof typeof form] as string}
                                  onChange={e => setField(key as keyof typeof form, e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            ))}
                          </div>

                          {/* Grading scale */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Grading Scale</Label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setField('useCustomScale', !form.useCustomScale)}
                                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                    form.useCustomScale
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'border-border text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                  {form.useCustomScale ? 'Using custom scale' : 'Using board default'}
                                </button>
                                {form.useCustomScale && (
                                  <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                    onClick={() => setField('useCustomScale', false)}
                                  >
                                    <RotateCcw className="h-3 w-3" /> Reset to board default
                                  </button>
                                )}
                              </div>
                            </div>
                            {form.useCustomScale ? (
                              <textarea
                                rows={8}
                                className="w-full font-mono text-xs border rounded-md p-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                                value={form.scaleJson}
                                onChange={e => setField('scaleJson', e.target.value)}
                                placeholder='[{"grade":"A1","minPercentage":91,"maxPercentage":100,"gradePoint":10,"description":"Outstanding","isPassing":true}]'
                              />
                            ) : (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs bg-muted/40 rounded px-3 py-2">
                                {sb.board.gradingScale.map(entry => (
                                  <span key={entry.grade}>
                                    <span className={`font-bold ${entry.isPassing ? 'text-emerald-700' : 'text-red-600'}`}>{entry.grade}</span>
                                    <span className="text-muted-foreground"> {entry.minPercentage}–{entry.maxPercentage}%</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setExpandedOverride(null)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={overrideSaving === sb.id}
                              onClick={() => handleSaveOverrides(sb)}
                            >
                              {overrideSaving === sb.id && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                              Save Overrides
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-slate-50">
                No boards configured yet. Add a board below to get started.
              </div>
            )}

            {/* Add Board */}
            {availableToAdd.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Add a Board</p>
                <div className="flex gap-2">
                  <Select value={addingBoardId} onValueChange={setAddingBoardId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select board to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableToAdd.map((board) => (
                        <SelectItem key={board.id} value={board.id}>
                          {board.name} ({board.code}) â€” {board.boardLevel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddBoard} disabled={addingLoading || !addingBoardId}>
                    {addingLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span className="ml-1">Add</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Only the boards configured here will appear when creating classes. A board cannot be
                removed if it has classes assigned to it.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

