import { useMemo } from "react";
import { PorterApp } from "@porter-dev/api-contracts";

import { type PopulatedEnvGroup } from "main/home/app-dashboard/validate-apply/app-settings/types";
import {
  applyPreviewOverrides,
  clientAppFromProto,
  type ClientPorterApp,
} from "lib/porter-apps";
import { type DetectedServices } from "lib/porter-apps/services";

export const useAppWithPreviewOverrides = ({
  latestApp,
  detectedServices,
  templateEnv,
  existingTemplate,
  appEnv,
}: {
  latestApp: PorterApp;
  detectedServices: DetectedServices | null;
  existingTemplate?: PorterApp;
  templateEnv?: {
    variables: Record<string, string>;
    secret_variables: Record<string, string>;
  };
  appEnv?: PopulatedEnvGroup;
}): ClientPorterApp => {
  const withPreviewOverrides = useMemo(() => {
    const proto =
      existingTemplate ||
      new PorterApp({
        ...latestApp,
        envGroups: [],
      }); // clear out env groups, they won't get added to the template anyways

    const variables = templateEnv ? templateEnv.variables : appEnv?.variables;
    const secrets = templateEnv
      ? templateEnv.secret_variables
      : appEnv?.secret_variables;

    return applyPreviewOverrides({
      app: clientAppFromProto({
        proto,
        overrides: detectedServices,
        variables,
        secrets,
        lockServiceDeletions: true,
      }),
      overrides: detectedServices?.previews,
    });
  }, [
    latestApp,
    detectedServices,
    existingTemplate,
    templateEnv,
    appEnv?.variables,
    appEnv?.secret_variables,
  ]);

  return withPreviewOverrides;
};
