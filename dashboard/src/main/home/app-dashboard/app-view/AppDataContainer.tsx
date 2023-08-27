import React, { useContext, useMemo, useState } from "react";
import { AppRevision } from "lib/revisions/types";
import { PorterApp } from "@porter-dev/api-contracts";
import { FormProvider, useForm } from "react-hook-form";
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
import Spacer from "components/porter/Spacer";
import { usePorterYaml } from "lib/hooks/usePorterYaml";
import TabSelector from "components/TabSelector";
import { RouteComponentProps, useParams, withRouter } from "react-router";
import { match } from "ts-pattern";
import Overview from "./Overview";
import { ClientService } from "lib/porter-apps/services";

// commented out tabs are not yet implemented
// will be included as support is available based on data from app revisions rather than helm releases
const validTabs = [
  // "activity",
  // "events",
  "overview",
  // "logs",
  // "metrics",
  // "debug",
  "environment",
  "build-settings",
  "settings",
  // "helm-values",
  // "job-history",
] as const;
const DEFAULT_TAB = "overview";
type ValidTab = typeof validTabs[number];

type AppDataContainerProps = {
  latestSource: SourceOptions;
  latestRevisionNumber: number;
  latestProto: PorterApp;
  porterApp: PorterAppRecord;
  overrides: {
    services: ClientService[];
    predeploy?: ClientService;
  } | null;
} & RouteComponentProps;

type Params = {
  eventId?: string;
  tab?: ValidTab;
};

const AppDataContainer: React.FC<AppDataContainerProps> = ({
  history,
  latestProto,
  latestRevisionNumber,
  latestSource,
  porterApp,
  overrides,
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const { tab } = useParams<Params>();

  const currentTab = useMemo(() => {
    if (tab && validTabs.includes(tab)) {
      return tab as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tab]);

  const deploymentTarget = useDefaultDeploymentTarget();

  console.log('overrides', overrides)
  console.log(
    "clientAppFromProto(latestProto, overrides)",
    clientAppFromProto(latestProto, overrides)
  );

  const porterAppFormMethods = useForm<PorterAppFormData>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(porterAppFormValidator),
    defaultValues: {
      app: clientAppFromProto(latestProto, overrides),
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
    <FormProvider {...porterAppFormMethods}>
      <RevisionsList
        latestRevisionNumber={latestRevisionNumber}
        deploymentTargetId={deploymentTarget?.deployment_target_id}
        projectId={currentProject.id}
        clusterId={currentCluster.id}
        appName={porterApp.name}
        sourceType={latestSource.type}
      />
      <Spacer y={1} />
      <TabSelector
        noBuffer
        options={[{ label: "Overview", value: "overview" }]}
        currentTab={currentTab}
        setCurrentTab={() => {
          history.push(`/apps/${porterApp.name}/${currentTab}`);
        }}
      />
      <Spacer y={1} />
      {match(currentTab)
        .with("overview", () => <Overview />)
        .otherwise(() => null)}
      <Spacer y={2} />
    </FormProvider>
  );
};

export default withRouter(AppDataContainer);
