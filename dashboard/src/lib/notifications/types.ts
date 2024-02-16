import { z } from "zod";

export const notificationConfigFormValidator = z.object({
  mention: z.string().regex(/^[a-z0-9-]*$/, {
    message: "Lowercase letters, numbers, and “-” only.",
  }),
  statuses: z.object({
    successful: z.boolean(),
    failed: z.boolean(),
    progressing: z.boolean(),
  }),
  types: z.object({
    deploy: z.boolean(),
    predeploy: z.boolean(),
    build: z.boolean(),
    alert: z.boolean(),
  }),
});
export type NotificationConfigFormData = z.infer<
  typeof notificationConfigFormValidator
>;

export const emptyNotificationConfig: NotificationConfigFormData = {
  mention: "",
  statuses: {
    successful: true,
    failed: true,
    progressing: true,
  },
  types: {
    deploy: true,
    predeploy: true,
    build: true,
    alert: true,
  },
};
