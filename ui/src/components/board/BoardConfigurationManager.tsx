import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { boardApi, BoardConfigurationResponse, SchoolBoardConfigResponse } from '@/services/api/boardApi';

export function BoardConfigurationManager() {
  const [boards, setBoards] = useState<BoardConfigurationResponse[]>([]);
  const [schoolBoardConfig, setSchoolBoardConfig] = useState<SchoolBoardConfigResponse | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBoardsAndConfig();
  }, []);

  const loadBoardsAndConfig = async () => {
    try {
      setLoading(true);
      const [boardsRes, configRes] = await Promise.all([
        boardApi.getAllBoards(),
        boardApi.getSchoolBoardConfig().catch(() => null)
      ]);
      
      setBoards(boardsRes.boards || []);
      if (configRes) {
        setSchoolBoardConfig(configRes);
        setSelectedBoardId(configRes.boardConfigurationId || '');
      }
    } catch (error) {
      console.error('Error loading boards:', error);
      toast.error('Failed to load board configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBoard = async () => {
    if (!selectedBoardId) {
      toast.error('Please select a board');
      return;
    }

    try {
      setSaving(true);
      await boardApi.setSchoolBoardConfig({
        boardConfigurationId: selectedBoardId
      });
      
      toast.success('Board configuration updated successfully');
      await loadBoardsAndConfig();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update board configuration');
    } finally {
      setSaving(false);
    }
  };

  const selectedBoard = boards.find(b => b.id === selectedBoardId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Board Configuration</CardTitle>
        <CardDescription>
          Set the default curriculum board for your school. Classes can override this setting individually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Current Board Info */}
            {schoolBoardConfig && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">Current Board: {schoolBoardConfig.boardName}</p>
                    <p className="text-sm text-blue-700 mt-1">Code: {schoolBoardConfig.boardCode}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Board Selection */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="board-select">Select Default Board for All Classes</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Classes can override this board for specific curriculum needs
                </p>
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                  <SelectTrigger id="board-select">
                    <SelectValue placeholder="Choose a board..." />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        <div className="flex items-center gap-2">
                          <span>{board.name}</span>
                          <span className="text-xs text-muted-foreground">({board.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Board Details */}
              {selectedBoard && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Board Level</p>
                      <p className="text-sm mt-1">{selectedBoard.boardLevel}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Grading System</p>
                      <p className="text-sm mt-1">{selectedBoard.gradingSystem}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Passing Percentage</p>
                      <p className="text-sm mt-1">{selectedBoard.overallPassingPercentage}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Max Grade Point</p>
                      <p className="text-sm mt-1">{selectedBoard.maxGradePoint}</p>
                    </div>
                  </div>
                  
                  {selectedBoard.description && (
                    <div className="pt-3 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-muted-foreground">{selectedBoard.description}</p>
                    </div>
                  )}

                  {/* Grading Scale Preview */}
                  <div className="pt-3 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Grading Scale</p>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedBoard.gradingScale.slice(0, 8).map((entry, idx) => (
                        <div key={idx} className="bg-white rounded p-2 text-center">
                          <p className="font-semibold text-sm">{entry.grade}</p>
                          <p className="text-xs text-muted-foreground">{entry.minPercentage}-{entry.maxPercentage}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Multi-Board Support</p>
                  <p className="text-xs mt-1">Your school can use multiple boards. Set a default here, then override per class in Class Management.</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSaveBoard} 
              disabled={saving || !selectedBoardId}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Board Configuration'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
