import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Pencil, Check } from "lucide-react";

interface StageRow {
  id: string;
  role: string;
  responsibility: string;
  equityRange: string;
  vestingTrigger: string;
}

interface StageData {
  label: string;
  rows: StageRow[];
}

export interface EquityResponsibilityData {
  stages: StageData[];
}

const DEFAULT_STAGES: StageData[] = [
  {
    label: "Creation",
    rows: [
      { id: "1", role: "", responsibility: "", equityRange: "", vestingTrigger: "" },
    ],
  },
  {
    label: "Validation",
    rows: [
      { id: "1", role: "", responsibility: "", equityRange: "", vestingTrigger: "" },
    ],
  },
  {
    label: "Expansion",
    rows: [
      { id: "1", role: "", responsibility: "", equityRange: "", vestingTrigger: "" },
    ],
  },
];

interface EquityResponsibilityEditorProps {
  value: EquityResponsibilityData | null;
  onChange: (data: EquityResponsibilityData) => void;
  disabled?: boolean;
}

export const EquityResponsibilityEditor = ({
  value,
  onChange,
  disabled = false,
}: EquityResponsibilityEditorProps) => {
  const [stages, setStages] = useState<StageData[]>(
    value?.stages || DEFAULT_STAGES
  );
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [tempLabel, setTempLabel] = useState("");

  useEffect(() => {
    if (value?.stages) {
      setStages(value.stages);
    }
  }, [value]);

  const emitChange = (updated: StageData[]) => {
    setStages(updated);
    onChange({ stages: updated });
  };

  const handleStageRename = (stageIdx: number) => {
    if (editingLabel === stageIdx) {
      const updated = [...stages];
      updated[stageIdx] = { ...updated[stageIdx], label: tempLabel || updated[stageIdx].label };
      emitChange(updated);
      setEditingLabel(null);
    } else {
      setTempLabel(stages[stageIdx].label);
      setEditingLabel(stageIdx);
    }
  };

  const handleCellChange = (
    stageIdx: number,
    rowIdx: number,
    field: keyof StageRow,
    val: string
  ) => {
    const updated = stages.map((s, si) =>
      si === stageIdx
        ? {
            ...s,
            rows: s.rows.map((r, ri) =>
              ri === rowIdx ? { ...r, [field]: val } : r
            ),
          }
        : s
    );
    emitChange(updated);
  };

  const addRow = (stageIdx: number) => {
    const updated = stages.map((s, si) =>
      si === stageIdx
        ? {
            ...s,
            rows: [
              ...s.rows,
              {
                id: String(Date.now()),
                role: "",
                responsibility: "",
                equityRange: "",
                vestingTrigger: "",
              },
            ],
          }
        : s
    );
    emitChange(updated);
  };

  const removeRow = (stageIdx: number, rowIdx: number) => {
    const updated = stages.map((s, si) =>
      si === stageIdx
        ? { ...s, rows: s.rows.filter((_, ri) => ri !== rowIdx) }
        : s
    );
    emitChange(updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1">
          Define equity allocation and responsibility structure per stage
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Customize stage names and fill in the table for each stage. Click the pencil icon to rename a stage.
        </p>
      </div>

      <Tabs defaultValue="0" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 overflow-x-auto">
          {stages.map((stage, idx) => (
            <TabsTrigger key={idx} value={String(idx)} className="gap-1.5 min-w-0">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {idx + 1}
              </Badge>
              <span className="truncate max-w-[100px]">{stage.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {stages.map((stage, stageIdx) => (
          <TabsContent key={stageIdx} value={String(stageIdx)} className="mt-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {editingLabel === stageIdx ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={tempLabel}
                        onChange={(e) => setTempLabel(e.target.value)}
                        className="h-8 w-48 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleStageRename(stageIdx);
                        }}
                        disabled={disabled}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleStageRename(stageIdx)}
                        disabled={disabled}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-display">
                        Stage {stageIdx + 1}: {stage.label}
                      </CardTitle>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleStageRename(stageIdx)}
                        disabled={disabled}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">Role</TableHead>
                        <TableHead className="min-w-[200px]">
                          Responsibility (Job To Be Done)
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          Equity Range (%)
                        </TableHead>
                        <TableHead className="min-w-[160px]">
                          Vesting Trigger
                        </TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stage.rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground py-6"
                          >
                            No roles defined yet. Click "Add Role" below.
                          </TableCell>
                        </TableRow>
                      ) : (
                        stage.rows.map((row, rowIdx) => (
                          <TableRow key={row.id}>
                            <TableCell className="p-1.5">
                              <Input
                                value={row.role}
                                onChange={(e) =>
                                  handleCellChange(stageIdx, rowIdx, "role", e.target.value)
                                }
                                placeholder="e.g. CTO"
                                className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
                                disabled={disabled}
                              />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Input
                                value={row.responsibility}
                                onChange={(e) =>
                                  handleCellChange(
                                    stageIdx,
                                    rowIdx,
                                    "responsibility",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. Build MVP architecture"
                                className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
                                disabled={disabled}
                              />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Input
                                value={row.equityRange}
                                onChange={(e) =>
                                  handleCellChange(
                                    stageIdx,
                                    rowIdx,
                                    "equityRange",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. 5-10%"
                                className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
                                disabled={disabled}
                              />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Input
                                value={row.vestingTrigger}
                                onChange={(e) =>
                                  handleCellChange(
                                    stageIdx,
                                    rowIdx,
                                    "vestingTrigger",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. MVP launch"
                                className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
                                disabled={disabled}
                              />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive/70 hover:text-destructive"
                                onClick={() => removeRow(stageIdx, rowIdx)}
                                disabled={disabled}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => addRow(stageIdx)}
                  disabled={disabled}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Role
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
