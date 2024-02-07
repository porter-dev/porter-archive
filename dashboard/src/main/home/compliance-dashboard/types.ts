import { z } from "zod";

export const checkGroupValidator = z.object({
  name: z.string(),
  status: z.enum(["PASSED", "FAILED"]),
  message: z.string().optional().default(""),
});
export type CheckGroup = z.infer<typeof checkGroupValidator>;

export const vendorCheckValidator = z.object({
  check: z.string(),
  check_group: z.string(),
  status: z.enum(["passed", "failing", "not_applicable"]),
  reason: z.string(),
  vendor_check_id: z.string(),
});
export type VendorCheck = z.infer<typeof vendorCheckValidator>;

export const contractValidator = z.object({
  id: z.string(),
  base64_contract: z.string(),
  cluster_id: z.number(),
  project_id: z.number(),
  condition: z.enum([
    "",
    "QUOTA_REQUEST_FAILED",
    "RETRYING_TOO_LONG",
    "KUBE_APPLY_FAILED",
    "FATAL_PROVISIONING_ERROR",
    "ERROR_READING_MSG",
    "MSG_CAUSED_PANIC",
    "SUCCESS",
    "DELETING",
    "DELETED",
    "COMPLIANCE_CHECK_FAILED",
  ]),
  condition_metadata: z
    .discriminatedUnion("code", [
      z.object({
        code: z.literal("SUCCESS"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("COMPLIANCE_CHECK_FAILED"),
        message: z.string().optional(),
        metadata: z.object({
          check_groups: z.array(checkGroupValidator),
        }),
      }),
      // all other codes are just "code" and "message"
      z.object({
        code: z.literal("QUOTA_REQUEST_FAILED"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("RETRYING_TOO_LONG"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("KUBE_APPLY_FAILED"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("FATAL_PROVISIONING_ERROR"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("ERROR_READING_MSG"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("MSG_CAUSED_PANIC"),
        message: z.string().optional(),
      }),
    ])
    .nullable()
    .or(
      z.object({}).transform(() => ({
        code: "SUCCESS",
        message: "",
      }))
    ),
});
export type APIContract = z.infer<typeof contractValidator>;
