import { z } from "zod";

export const generatePlanPayloadSchema = z.object({
  projectGoal: z.string().trim().min(1, "Project goal is required"),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  timeAvailability: z.enum(["3-5", "5-10", "10+"]),
  deadline: z.string().optional(),
  regenerate: z.boolean().optional(),
});

export const taskStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);

export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: taskStatusSchema,
  serial: z.number(),
});

export const phaseSchema = z.object({
  name: z.string(),
  tasks: z.array(taskSchema),
  serial: z.number(),
});

export const projectPlanSchema = z.object({
  goal: z.string(),
  phases: z.array(phaseSchema),
});
