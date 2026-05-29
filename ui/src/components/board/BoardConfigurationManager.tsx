import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, Plus, Star, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  boardApi,
  BoardConfigurationResponse,
  SchoolBoardConfigResponse,
} from '@/services/api/boardApi';

export function BoardConfigurationManager() {
  const [allBoards, setAllBoards] = useState<BoardConfigurationResponse[]>([]);
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoardConfigResponse[]>([]);
  const [addingBoardId, setAddingBoardId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [addingLoading, setAddingLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

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
                  <div
                    key={sb.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 bg-slate-50"
                  >
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
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{sb.boardLevel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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

