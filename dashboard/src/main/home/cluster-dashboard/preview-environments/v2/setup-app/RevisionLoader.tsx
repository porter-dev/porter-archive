import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { useAppWithPreviewOverrides } from "lib/hooks/useAppWithPreviewOverrides";

import { valueExists } from "shared/util";

import { type AppTemplateFormData } from "../EnvTemplateContextProvider";

export const RevisionLoader: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [detectedServices, setDetectedServices] = useState<{
    detected: boolean;
    count: number;
  }>({ detected: false, count: 0 });

  const { latestProto, porterApp, latestSource, servicesFromYaml, appEnv } =
    useLatestRevision();
  const { reset, setValue } = useFormContext<AppTemplateFormData>();

  const withPreviewOverrides = useAppWithPreviewOverrides({
    latestApp: latestProto,
    detectedServices: servicesFromYaml,
    appEnv,
  });

  useEffect(() => {
    // we don't store versions of build settings because they are stored in the db, so we just have to use the latest version
    // however, for image settings, we can pull image repo and tag from the proto
    const newSource =
      porterApp.image_repo_uri && latestProto.image
        ? {
            type: "docker-registry" as const,
            image: {
              repository: latestProto.image.repository,
              tag: latestProto.image.tag,
            },
          }
        : latestSource;

    reset({
      app: withPreviewOverrides,
      source: newSource,
      deletions: {
        envGroupNames: [],
        serviceNames: [],
        predeploy: [],
        initialDeploy: [],
      },
      redeployOnSave: false,
    });
  }, [withPreviewOverrides]);


  return <>{children}</>;
};
