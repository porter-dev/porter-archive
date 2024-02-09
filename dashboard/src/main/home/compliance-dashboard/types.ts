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
