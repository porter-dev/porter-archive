import React, { useContext, useMemo } from "react";
import { AppRevision } from "lib/revisions/types";
import { PorterApp } from "@porter-dev/api-contracts";
import { useForm } from "react-hook-form";
import {
  PorterAppFormData,
  SourceOptions,
  clientAppFromProto,
  porterAppFormValidator,
} from "lib/porter-apps";
import { zodResolver } from "@hookform/resolvers/zod";
import { PorterAppRecord } from "./AppView";
import RevisionsList from "./RevisionsList";
import { Context } from "shared/Context";
import { useDefaultDeploymentTarget } from "lib/hooks/useDeploymentTarget";

type AppDataContainerProps = {
  latestRevision: AppRevision;
  porterApp: PorterAppRecord;
};

const AppDataContainer: React.FC<AppDataContainerProps> = ({
  latestRevision,
  porterApp,
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const deploymentTarget = useDefaultDeploymentTarget();

  const latestProto = useMemo(
    () => PorterApp.fromJsonString(atob(latestRevision.b64_app_proto)),
    [latestRevision]
  );
  const latestSource: SourceOptions = useMemo(() => {
    if (porterApp.image_repo_uri) {
      const [repository, tag] = porterApp.image_repo_uri.split(":");
      return {
        type: "docker-registry",
        image: {
          repository,
          tag,
        },
      };
    }

    return {
      type: "github",
      git_repo_id: porterApp.git_repo_id ?? 0,
      git_repo_name: porterApp.repo_name ?? "",
      git_branch: porterApp.git_branch ?? "",
      porter_yaml_path: porterApp.porter_yaml_path ?? "./porter.yaml",
    };
  }, [porterApp]);

  const porterAppFormMethods = useForm<PorterAppFormData>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(porterAppFormValidator),
    defaultValues: {
      app: clientAppFromProto(latestProto),
      source: latestSource,
    },
  });

  if (!currentProject || !currentCluster) {
    return null;
  }

  if (!deploymentTarget) {
    return null;
  }

  return (
    <RevisionsList
      latestRevisionNumber={latestRevision.revision_number}
      deploymentTargetId={deploymentTarget?.deployment_target_id}
      projectId={currentProject.id}
      clusterId={currentCluster.id}
      appName={porterApp.name}
      sourceType={latestSource.type}
    />
  );
};

export default AppDataContainer;
