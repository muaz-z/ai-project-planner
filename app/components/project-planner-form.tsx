import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { z } from "zod";
import { DatePicker } from "@/components/ui/date-picker";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { fetchJsonOrThrow } from "@/lib/fetch";
import { generatePlanPayloadSchema, projectPlanSchema } from "@/lib/schema";
import { toast } from "sonner";
import { GeneratingPlanLoader } from "@/components/ui/generating-plan-loader";
import { useAbortController } from "@/hooks/use-abort-controller";

type ProjectPlan = z.infer<typeof projectPlanSchema>;
type FormData = z.infer<typeof generatePlanPayloadSchema>;

export function ProjectPlannerForm({
  onPlanGenerated,
}: {
  onPlanGenerated: (plan: ProjectPlan, query: FormData) => void;
}) {
  const { getSignal } = useAbortController();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof generatePlanPayloadSchema>>({
    resolver: zodResolver(generatePlanPayloadSchema),
    mode: "onBlur",
    defaultValues: {
      projectGoal: "",
      experienceLevel: "beginner",
      timeAvailability: "3-5",
      deadline: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData): Promise<ProjectPlan> => {
      return fetchJsonOrThrow({
        url: "/api/plans/generate",
        method: "POST",
        body: { json: data },
        schema: projectPlanSchema,
        signal: getSignal(),
      });
    },
    onSuccess: (result, variables) => {
      onPlanGenerated(result, variables);
    },
    onError: (error) => {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Error generating plan:", error);
      toast.error(error.message || "Failed to generate plan");
    },
  });

  const onSubmit = (data: FormData) => {
    if (mutation.isPending) {
      return;
    }

    mutation.mutate(data);
  };

  return (
    <>
      <Card className="border-border border shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project-goal" className="text-sm font-medium">
                What’s your goal?
              </Label>
              <Controller
                name="projectGoal"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="project-goal"
                    placeholder="Build a Flutter expense-splitting app"
                    className="min-h-[120px] resize-none text-base"
                    aria-invalid={!!errors.projectGoal}
                    {...field}
                  />
                )}
              />
              {errors.projectGoal && (
                <p className="text-destructive text-sm">
                  {errors.projectGoal.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="experience-level"
                  className="text-sm font-medium"
                >
                  Experience level
                </Label>
                <Controller
                  name="experienceLevel"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="experience-level"
                        className="w-full"
                        aria-invalid={!!errors.experienceLevel}
                      >
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.experienceLevel && (
                  <p className="text-destructive text-sm">
                    {errors.experienceLevel.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="time-availability"
                  className="text-sm font-medium"
                >
                  Time availability per week
                </Label>
                <Controller
                  name="timeAvailability"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="time-availability"
                        className="w-full"
                        aria-invalid={!!errors.timeAvailability}
                      >
                        <SelectValue placeholder="Select hours" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3-5">3–5 hours</SelectItem>
                        <SelectItem value="5-10">5–10 hours</SelectItem>
                        <SelectItem value="10+">10+ hours</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.timeAvailability && (
                  <p className="text-destructive text-sm">
                    {errors.timeAvailability.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline" className="text-sm font-medium">
                Target deadline{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Controller
                name="deadline"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    className="w-full"
                    minDate={new Date()}
                    value={field.value ? new Date(field.value) : undefined}
                    onValueChange={(value) =>
                      field.onChange(value ? value.toISOString() : undefined)
                    }
                  />
                )}
              />
              {errors.deadline && (
                <p className="text-destructive text-sm">
                  {errors.deadline.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full gap-2 text-base font-medium"
              disabled={mutation.isPending}
            >
              <Sparkles className="h-4 w-4" />
              {mutation.isPending ? "Generating..." : "Generate Project Plan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {mutation.isPending && (
        <GeneratingPlanLoader title="Generating Your Plan" />
      )}
    </>
  );
}
