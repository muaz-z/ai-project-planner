import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { fetchJsonOrThrow } from "@/lib/fetch";
import type { taskStatusSchema, generatePlanPayloadSchema } from "@/lib/schema";
import { projectPlanSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import {
  Check,
  Circle,
  Clock,
  GripVertical,
  HelpCircle,
  Lightbulb,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useCallback } from "react";
import { useTaskDrag } from "@/hooks/use-task-drag";
import { usePhaseDrag } from "@/hooks/use-phase-drag";
import { usePlanProgress } from "@/hooks/use-plan-progress";
import { GeneratingPlanLoader } from "@/components/ui/generating-plan-loader";
import { useExplainPlan } from "@/hooks/use-explain-plan";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { AnimatedChevronArrow } from "@/components/animated-arrow";

type ProjectPlan = z.infer<typeof projectPlanSchema>;
type TaskStatus = z.infer<typeof taskStatusSchema>;
type FormData = z.infer<typeof generatePlanPayloadSchema>;

const config = {
  not_started: {
    label: "Not Started",
    variant: "secondary" as const,
    icon: Circle,
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    icon: Clock,
  },
  completed: {
    label: "Completed",
    variant: "outline" as const,
    icon: Check,
  },
};

const statusOrder: TaskStatus[] = ["not_started", "in_progress", "completed"];

interface ProjectPlanViewProps {
  planData: {
    plan: ProjectPlan;
    query: FormData;
  };
  setPlanData: (
    data: { plan: ProjectPlan; query: FormData } | undefined,
  ) => void;
}

export function ProjectPlanView({
  planData,
  setPlanData,
}: ProjectPlanViewProps) {
  const { plan, query } = planData;

  const {
    isCollapsed: isExplainCollapsed,
    isLoading: isExplaining,
    explanation,
    error: explainError,
    canExplain,
    buttonLabel: explainButtonLabel,
    handleExplain: handleExplainPlan,
    handleToggleCollapse,
    handleReset: resetExplanation,
  } = useExplainPlan({ plan, query });

  const regenerateMutation = useMutation({
    mutationFn: async (): Promise<ProjectPlan> => {
      return fetchJsonOrThrow({
        url: "/api/plans/generate",
        method: "POST",
        body: { json: query },
        schema: projectPlanSchema,
      });
    },
    onSuccess: (result) => {
      setPlanData({ ...planData, plan: result });
      resetExplanation();
    },
    onError: (error) => {
      console.error("Error generating plan:", error);
      toast.error(error.message || "Failed to generate plan");
    },
  });

  // Calculate progress using custom hook
  const { overallProgress, getPhaseProgress, allTasks, completedTasks } =
    usePlanProgress(plan.phases);

  // Update task status based on checkbox
  const handleStatusChange = ({
    phaseIndex,
    taskId,
    checked,
  }: {
    phaseIndex: number;
    taskId: number;
    checked: boolean;
  }) => {
    setPlanData({
      ...planData,
      plan: {
        ...plan,
        phases: plan.phases.map((phase, pIdx) => {
          if (pIdx !== phaseIndex) return phase;
          return {
            ...phase,
            tasks: phase.tasks.map((task) => {
              if (task.id !== taskId) return task;
              const newStatus: TaskStatus = checked
                ? "completed"
                : "not_started";
              return { ...task, status: newStatus };
            }),
          };
        }),
      },
    });
  };

  // Cycle through statuses on badge click
  // change status of task to next status in statusOrder
  const cycleTaskStatus = ({
    phaseIndex,
    taskId,
  }: {
    phaseIndex: number;
    taskId: number;
  }) => {
    setPlanData({
      ...planData,
      plan: {
        ...plan,
        phases: plan.phases.map((phase, pIdx) => {
          if (pIdx !== phaseIndex) return phase;
          return {
            ...phase,
            tasks: phase.tasks.map((task) => {
              if (task.id !== taskId) return task;

              const currentIndex = statusOrder.indexOf(task.status);
              const nextStatus =
                statusOrder[(currentIndex + 1) % statusOrder.length];
              return { ...task, status: nextStatus };
            }),
          };
        }),
      },
    });
  };

  // Handle phase reordering
  const handlePhaseReorder = useCallback(
    ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) => {
      if (fromIndex === toIndex) return;

      const newPhases = [...plan.phases];
      const [movedPhase] = newPhases.splice(fromIndex, 1);
      newPhases.splice(toIndex, 0, movedPhase);

      setPlanData({
        ...planData,
        plan: {
          ...plan,
          phases: newPhases.map((phase, index) => ({
            ...phase,
            serial: index + 1,
          })),
        },
      });
    },
    [plan, planData, setPlanData],
  );

  // Phase drag and drop handlers
  const {
    draggedPhaseIndex,
    dragOverPhaseIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = usePhaseDrag(handlePhaseReorder);

  // Handle task reordering within a phase
  const handleTaskReorder = useCallback(
    ({
      phaseIndex,
      fromTaskIndex,
      toTaskIndex,
    }: {
      phaseIndex: number;
      fromTaskIndex: number;
      toTaskIndex: number;
    }) => {
      if (fromTaskIndex === toTaskIndex) return;

      setPlanData({
        ...planData,
        plan: {
          ...plan,
          phases: plan.phases.map((phase, pIdx) => {
            if (pIdx !== phaseIndex) return phase;

            const newTasks = [...phase.tasks];
            const [movedTask] = newTasks.splice(fromTaskIndex, 1);
            newTasks.splice(toTaskIndex, 0, movedTask);

            // Update serial numbers to reflect new order
            return {
              ...phase,
              tasks: newTasks.map((task, index) => ({
                ...task,
                serial: index + 1,
              })),
            };
          }),
        },
      });
    },
    [plan, planData, setPlanData],
  );

  // Task drag and drop handlers
  const {
    draggedTask,
    dragOverTask,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDragLeave,
    handleTaskDrop,
    handleTaskDragEnd,
  } = useTaskDrag(handleTaskReorder);

  return (
    <>
      <div className="space-y-6">
        <Collapsible defaultOpen={false}>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending || isExplaining}
              className="gap-2 bg-transparent px-2 sm:px-3"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  regenerateMutation.isPending ? "animate-spin" : "",
                )}
              />
              <span className="hidden sm:inline">Regenerate Plan</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlanData(undefined)}
              className="gap-2 bg-transparent px-2 sm:px-3"
              disabled={regenerateMutation.isPending || isExplaining}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset Plan</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExplainPlan}
              className="flex-1 gap-2 bg-transparent px-2 sm:flex-initial sm:px-3"
              disabled={
                !canExplain || regenerateMutation.isPending || isExplaining
              }
            >
              <Lightbulb
                className={cn(
                  "h-4 w-4 shrink-0",
                  isExplaining && "animate-pulse",
                )}
              />
              <span className="hidden sm:inline">{explainButtonLabel}</span>
              <span className="truncate text-xs sm:hidden">
                {explainButtonLabel}
              </span>
            </Button>

            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground ml-auto gap-1.5 px-2 sm:px-3"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="hidden text-xs sm:inline">Help</span>
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-3">
            <div className="border-primary/20 bg-primary/5 rounded-lg border p-3 text-xs">
              <ul className="text-muted-foreground space-y-1">
                <li>
                  ✓ <strong>Check tasks</strong> to mark them complete
                </li>
                <li>
                  ✓ <strong>Click status badges</strong> to cycle through
                  statuses
                </li>
                <li>
                  ✓ <strong>Drag tasks/phases</strong> to reorder (grab the
                  handle icon)
                </li>
                <li>
                  ✓ <strong>Use &quot;Explain with AI&quot;</strong> for
                  personalized insights
                </li>
                <li>
                  ✓ <strong>Regenerate plan</strong> to get a new plan
                </li>
                <li>
                  ✓ <strong>Reset plan</strong> to start over
                </li>
                <li>✓ Your progress is automatically saved locally</li>
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* explaination */}
        {/* Explain Plan Card */}
        {(explanation || isExplaining || explainError) && (
          <Collapsible
            open={!isExplainCollapsed}
            onOpenChange={handleToggleCollapse}
          >
            <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 border duration-300">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="text-primary h-4 w-4" />
                    <CardTitle className="text-base font-medium">
                      Plan Explanation
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <AnimatedChevronArrow
                          isExpanded={!isExplainCollapsed}
                        />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {explainError ? (
                    <p className="text-destructive text-sm">{explainError}</p>
                  ) : (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {explanation}
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Hint to use AI Explanation */}
        {!explanation &&
          !isExplaining &&
          !explainError &&
          plan.phases.length > 0 && (
            <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-muted-foreground text-sm">
                    <strong className="text-foreground">
                      New to this project?
                    </strong>{" "}
                    Click &quot;Explain with AI&quot; above to understand why we
                    structured your plan this way and get personalized guidance
                    for your experience level.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Header with overall progress */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">{plan.goal}</h2>
          <div className="flex items-center gap-4">
            <Progress value={overallProgress} className="h-2 flex-1" />
            <span className="text-muted-foreground w-12 text-right text-sm font-medium">
              {overallProgress}%
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {completedTasks} of {allTasks.length} tasks completed
          </p>
        </div>

        {/* Phase cards */}
        <div className="space-y-4">
          {plan.phases
            .sort((a, b) => a.serial - b.serial)
            .map((phase, phaseIndex) => {
              const phaseProgress = getPhaseProgress(phase.tasks);
              const isDragging = draggedPhaseIndex === phaseIndex;
              const isDragOver = dragOverPhaseIndex === phaseIndex;

              return (
                <Card
                  key={phase.name}
                  className={cn(
                    "border-border cursor-move border transition-all",
                    isDragging && "opacity-50",
                    isDragOver && "border-primary ring-primary/20 ring-2",
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, phaseIndex)}
                  onDragOver={(e) => handleDragOver(e, phaseIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, phaseIndex)}
                  onDragEnd={handleDragEnd}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-1 items-center gap-2">
                        <GripVertical className="text-muted-foreground h-5 w-5 shrink-0 cursor-grab active:cursor-grabbing" />
                        <CardTitle className="text-lg font-medium">
                          {phase.name}
                        </CardTitle>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {phaseProgress}%
                      </span>
                    </div>
                    <Progress value={phaseProgress} className="mt-2 h-1.5" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {phase.tasks
                      .sort((a, b) => a.serial - b.serial)
                      .map((task, taskIndex) => {
                        const isTaskDragging =
                          draggedTask?.phaseIndex === phaseIndex &&
                          draggedTask?.taskIndex === taskIndex;
                        const isTaskDragOver =
                          dragOverTask?.phaseIndex === phaseIndex &&
                          dragOverTask?.taskIndex === taskIndex;

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "bg-muted/50 hover:bg-muted flex cursor-move items-center gap-3 rounded-lg p-3 transition-all",
                              isTaskDragging && "opacity-50",
                              isTaskDragOver &&
                                "border-primary ring-primary/20 border ring-2",
                            )}
                            draggable
                            onDragStart={(e) =>
                              handleTaskDragStart(e, phaseIndex, taskIndex)
                            }
                            onDragOver={(e) =>
                              handleTaskDragOver(e, phaseIndex, taskIndex)
                            }
                            onDragLeave={handleTaskDragLeave}
                            onDrop={(e) =>
                              handleTaskDrop(e, phaseIndex, taskIndex)
                            }
                            onDragEnd={handleTaskDragEnd}
                          >
                            <GripVertical className="text-muted-foreground h-4 w-4 shrink-0 cursor-grab active:cursor-grabbing" />
                            <Checkbox
                              id={`task-${task.id}`}
                              checked={task.status === "completed"}
                              onCheckedChange={(checked) =>
                                handleStatusChange({
                                  phaseIndex,
                                  taskId: task.id,
                                  checked: checked as boolean,
                                })
                              }
                            />
                            <span
                              className={`flex-1 ${
                                task.status === "completed"
                                  ? "text-muted-foreground line-through"
                                  : ""
                              }`}
                            >
                              {task.title}
                            </span>
                            {getStatusBadge(task.status, () =>
                              cycleTaskStatus({ phaseIndex, taskId: task.id }),
                            )}
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
      {regenerateMutation.isPending && (
        <GeneratingPlanLoader title="Regenerating Your Plan" />
      )}
    </>
  );
}

function getStatusBadge(status: TaskStatus, onClick: () => void) {
  const { label, variant, icon: Icon } = config[status];

  return (
    <Badge
      variant={variant}
      className="cursor-pointer gap-1 text-xs select-none"
      onClick={onClick}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
