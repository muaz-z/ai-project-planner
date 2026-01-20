import { ProjectPlanView } from "@/components/project-plan-view";
import { ProjectPlannerForm } from "@/components/project-planner-form";
import { generatePlanPayloadSchema, projectPlanSchema } from "@/lib/schema";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

type ProjectPlan = z.infer<typeof projectPlanSchema>;
type FormData = z.infer<typeof generatePlanPayloadSchema>;

// Schema for validating saved plan data from localStorage
const savedPlanDataSchema = z.object({
  plan: projectPlanSchema,
  query: generatePlanPayloadSchema,
});

export function meta() {
  return [
    { title: "AI Project Planner - Turn Ideas into Actionable Plans" },
    {
      name: "description",
      content:
        "Transform your project ideas into structured, actionable execution plans with AI-powered planning assistance.",
    },
  ];
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [planData, setPlanData] = useState<
    z.infer<typeof savedPlanDataSchema> | undefined
  >(() => {
    // Lazy initialization - only runs once (client-side)
    if (typeof window === "undefined") return undefined;
    const saved = localStorage.getItem("planData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validated = savedPlanDataSchema.parse(parsed);
        return validated;
      } catch (error) {
        console.error("Failed to parse or validate saved plan data:", error);
        localStorage.removeItem("planData");
      }
    }
    return undefined;
  });

  const handlePlanGenerated = (plan: ProjectPlan, query: FormData) => {
    setPlanData({ plan, query });
  };

  // Mark as mounted after hydration (legitimate use for SSR)
  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  // Save planData to local storage whenever it changes
  useEffect(() => {
    if (!mounted) return;

    if (planData) {
      try {
        const data = JSON.stringify(planData);

        // Check size (rough estimate) - localStorage typically has 5-10MB limit
        // We'll use 4MB as a safe threshold
        const sizeInBytes = new Blob([data]).size;
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInBytes > 4 * 1024 * 1024) {
          console.warn("Plan data too large for localStorage:", sizeInMB, "MB");
          toast.error("Plan is too large to save locally");
          return;
        }

        localStorage.setItem("planData", data);
      } catch (error) {
        // Handle quota exceeded errors
        if (
          error instanceof DOMException &&
          error.name === "QuotaExceededError"
        ) {
          console.error("localStorage quota exceeded:", error);
          toast.error("Storage quota exceeded. Cannot save plan locally.");
        } else {
          console.error("Failed to save plan to localStorage:", error);
          toast.error("Failed to save plan. Changes may not persist.");
        }
      }
    } else {
      try {
        localStorage.removeItem("planData");
      } catch (error) {
        console.error("Failed to remove plan from localStorage:", error);
      }
    }
  }, [planData, mounted]);

  // Show loading screen until mounted
  if (!mounted) {
    return null;
  }

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl">
        {planData ? (
          <ProjectPlanView planData={planData} setPlanData={setPlanData} />
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-foreground mb-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                AI Project Planner
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Turn high-level ideas into actionable execution plans
              </p>
            </div>
            <ProjectPlannerForm onPlanGenerated={handlePlanGenerated} />
          </>
        )}
      </div>
    </main>
  );
}
