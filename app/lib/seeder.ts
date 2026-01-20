import type { projectPlanSchema } from "@/lib/schema";
import { z } from "zod";

export const examplePlan: z.infer<typeof projectPlanSchema> = {
  goal: "Build a Flutter expense app",
  phases: [
    {
      name: "Planning",
      serial: 1,
      tasks: [
        {
          id: 1,
          title: "Define core features",
          status: "not_started",
          serial: 1,
        },
        {
          id: 2,
          title: "Choose state management",
          status: "not_started",
          serial: 2,
        },
      ],
    },
    {
      name: "Development",
      serial: 2,
      tasks: [
        {
          id: 3,
          title: "Build expense input UI",
          status: "not_started",
          serial: 1,
        },
        {
          id: 4,
          title: "Implement data persistence",
          status: "not_started",
          serial: 2,
        },
        {
          id: 5,
          title: "Create expense categories",
          status: "not_started",
          serial: 3,
        },
      ],
    },
    {
      name: "Testing & Launch",
      serial: 3,
      tasks: [
        { id: 6, title: "Write unit tests", status: "not_started", serial: 1 },
        { id: 7, title: "Beta testing", status: "not_started", serial: 2 },
        {
          id: 8,
          title: "Publish to app store",
          status: "not_started",
          serial: 3,
        },
      ],
    },
  ],
};
