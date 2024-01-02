import { PorterApp } from "@porter-dev/api-contracts";
import { Addon } from "@porter-dev/api-contracts/src/porter/v1/addons_pb";
import { z } from "zod";

export const existingTemplateWithEnvValidator = z.object({
  template_b64_app_proto: z.string().transform((a) =>
    PorterApp.fromJsonString(atob(a), {
      ignoreUnknownFields: true,
    })
  ),
  app_env: z.object({
    variables: z.record(z.string()).default({}),
    secret_variables: z.record(z.string()).default({}),
  }),
  addons: z
    .array(
      z.object({
        base64_addon: z.string(),
        variables: z.record(z.string()).default({}),
        secrets: z.record(z.string()).default({}),
      })
    )
    .transform((addons) =>
      addons.map((a) => {
        return {
          ...a,
          addon: Addon.fromJsonString(atob(a.base64_addon), {
            ignoreUnknownFields: true,
          }),
        };
      })
    ),
});

export type ExistingTemplateWithEnv = z.infer<
  typeof existingTemplateWithEnvValidator
>;
