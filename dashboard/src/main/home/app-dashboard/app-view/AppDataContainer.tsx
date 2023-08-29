import React, { useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  PorterAppFormData,
  SourceOptions,
  clientAppFromProto,
  porterAppFormValidator,
} from "lib/porter-apps";
import { zodResolver } from "@hookform/resolvers/zod";
import RevisionsList from "./RevisionsList";
import { useLatestRevision } from "./LatestRevisionContext";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { useHistory } from "react-router";
import { match } from "ts-pattern";
import Overview from "./tabs/Overview";

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
  tabParam?: string;
};

const AppDataContainer: React.FC<AppDataContainerProps> = ({ tabParam }) => {
  const history = useHistory();
  const {
    porterApp,
    latestProto,
    latestRevision,
    projectId,
    clusterId,
    deploymentTargetId,
    servicesFromYaml,
  } = useLatestRevision();

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

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
      app: clientAppFromProto(latestProto, servicesFromYaml),
      source: latestSource,
    },
  });
  const { reset } = porterAppFormMethods;

  useEffect(() => {
    if (servicesFromYaml) {
      reset({
        app: clientAppFromProto(latestProto, servicesFromYaml),
        source: latestSource,
      });
    }
  }, [servicesFromYaml]);

  return (
    <FormProvider {...porterAppFormMethods}>
      <RevisionsList
        latestRevisionNumber={latestRevision.revision_number}
        deploymentTargetId={deploymentTargetId}
        projectId={projectId}
        clusterId={clusterId}
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

export default AppDataContainer;
