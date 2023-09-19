import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  PorterAppFormData,
  SourceOptions,
  clientAppFromProto,
  porterAppFormValidator,
} from "lib/porter-apps";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLatestRevision } from "./LatestRevisionContext";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { useHistory } from "react-router";
import { match } from "ts-pattern";
import Overview from "./tabs/Overview";
import { useAppValidation } from "lib/hooks/useAppValidation";
import api from "shared/api";
import { useQueryClient } from "@tanstack/react-query";
import Settings from "./tabs/Settings";
import BuildSettings from "./tabs/BuildSettings";
import Environment from "./tabs/Environment";
import AnimateHeight from "react-animate-height";
import Banner from "components/porter/Banner";
import Button from "components/porter/Button";
import Icon from "components/porter/Icon";
import save from "assets/save-01.svg";
import LogsTab from "./tabs/LogsTab";
import MetricsTab from "./tabs/MetricsTab";
import RevisionsList from "../validate-apply/revisions-list/RevisionsList";
import Activity from "./tabs/Activity";
import EventFocusView from "./tabs/activity-feed/events/focus-views/EventFocusView";
import { z } from "zod";
import { PorterApp } from "@porter-dev/api-contracts";

// commented out tabs are not yet implemented
// will be included as support is available based on data from app revisions rather than helm releases
const validTabs = [
  "activity",
  "events",
  "overview",
  "logs",
  "metrics",
  // "debug",
  "environment",
  "build-settings",
  "settings",
  // "helm-values",
  // "job-history",
] as const;
const DEFAULT_TAB = "activity";
type ValidTab = typeof validTabs[number];

type AppDataContainerProps = {
  tabParam?: string;
};

const AppDataContainer: React.FC<AppDataContainerProps> = ({ tabParam }) => {
  const history = useHistory();
  const queryClient = useQueryClient();
  const [redeployOnSave, setRedeployOnSave] = useState(false);

  const {
    porterApp,
    latestProto,
    latestRevision,
    projectId,
    clusterId,
    deploymentTargetId,
    servicesFromYaml,
    setPreviewRevision,
  } = useLatestRevision();
  const { validateApp } = useAppValidation({
    deploymentTargetID: deploymentTargetId,
  });

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
      app: clientAppFromProto({
        proto: latestProto,
        overrides: servicesFromYaml,
        variables: latestRevision.env.variables,
        secrets: latestRevision.env.secret_variables,
      }),
      source: latestSource,
      deletions: {
        serviceNames: [],
        envGroupNames: [],
      },
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isDirty, dirtyFields, isSubmitting },
  } = porterAppFormMethods;

  // getAllDirtyFields recursively gets all dirty fields from the dirtyFields object
  // all fields in the form are set to a boolean indicating if the current value is different from the default value
  const getAllDirtyFields = (dirtyFields: object) => {
    const dirty: string[] = [];

    Object.entries(dirtyFields).forEach(([key, value]) => {
      if (value) {
        if (typeof value === "boolean" && value === true) {
          dirty.push(key);
        }

        if (typeof value === "object") {
          dirty.push(...getAllDirtyFields(value));
        }
      }
    });

    return dirty;
  };

  // onlyExpandedChanged is true if the only dirty fields are expanded and id
  // expanded is a ui only value used to determine if a service is expanded or not
  // id is set by useFieldArray and is also not relevant to the app proto
  const onlyExpandedChanged = useMemo(() => {
    if (!isDirty) return false;

    // get all entries in entire dirtyFields object that are true
    const dirty = getAllDirtyFields(dirtyFields);
    return dirty.every((f) => f === "expanded" || f === "id");
  }, [isDirty, JSON.stringify(dirtyFields)]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const { validatedAppProto, variables, secrets } = await validateApp(
        data,
        latestProto
      );

      // updates the default env group associated with this app to store app specific env vars
      const res = await api.updateAppEnvironmentGroup(
        "<token>",
        {
          deployment_target_id: deploymentTargetId,
          variables,
          secrets,
          remove_missing: true,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
          app_name: porterApp.name,
        }
      );

      const updatedEnvGroup = z
        .object({
          env_group_name: z.string(),
          env_group_version: z.coerce.bigint(),
        })
        .parse(res.data);

      const protoWithUpdatedEnv = new PorterApp({
        ...validatedAppProto,
        envGroups: validatedAppProto.envGroups.map((envGroup) => {
          if (envGroup.name === updatedEnvGroup.env_group_name) {
            return {
              ...envGroup,
              version: updatedEnvGroup.env_group_version,
            };
          }

          return envGroup;
        }),
      });

      await api.applyApp(
        "<token>",
        {
          b64_app_proto: btoa(protoWithUpdatedEnv.toJsonString()),
          deployment_target_id: deploymentTargetId,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
        }
      );

      if (
        redeployOnSave &&
        latestSource.type === "github" &&
        dirtyFields.app?.build
      ) {
        const res = await api.reRunGHWorkflow(
          "<token>",
          {},
          {
            project_id: projectId,
            cluster_id: clusterId,
            git_installation_id: latestSource.git_repo_id,
            owner: latestSource.git_repo_name.split("/")[0],
            name: latestSource.git_repo_name.split("/")[1],
            branch: porterApp.git_branch,
            filename: "porter_stack_" + porterApp.name + ".yml",
          }
        );

        if (res.data != null) {
          window.open(res.data, "_blank", "noreferrer");
        }

        setRedeployOnSave(false);
      }

      await queryClient.invalidateQueries([
        "getLatestRevision",
        projectId,
        clusterId,
        deploymentTargetId,
        porterApp.name,
      ]);
      setPreviewRevision(null);

      // redirect to the default tab after save
      history.push(`/apps/${porterApp.name}/${DEFAULT_TAB}`);
    } catch (err) {}
  });

  useEffect(() => {
    reset({
      app: clientAppFromProto({
        proto: latestProto,
        overrides: servicesFromYaml,
        variables: latestRevision.env.variables,
        secrets: latestRevision.env.secret_variables,
      }),
      source: latestSource,
      deletions: {
        envGroupNames: [],
        serviceNames: [],
      },
    });
  }, [
    servicesFromYaml,
    currentTab,
    latestProto,
    latestRevision.revision_number,
  ]);

  return (
    <FormProvider {...porterAppFormMethods}>
      <form onSubmit={onSubmit}>
        <RevisionsList
          latestRevisionNumber={latestRevision.revision_number}
          deploymentTargetId={deploymentTargetId}
          projectId={projectId}
          clusterId={clusterId}
          appName={porterApp.name}
          latestSource={latestSource}
          onSubmit={onSubmit}
        />
        <AnimateHeight height={isDirty && !onlyExpandedChanged ? "auto" : 0}>
          <Banner
            type="warning"
            suffix={
              <>
                <Button
                  type="submit"
                  loadingText={"Updating..."}
                  height={"10px"}
                  status={isSubmitting ? "loading" : ""}
                  disabled={isSubmitting}
                >
                  <Icon src={save} height={"13px"} />
                  <Spacer inline x={0.5} />
                  Save as latest version
                </Button>
              </>
            }
          >
            Changes you are currently previewing have not been saved.
            <Spacer inline width="5px" />
          </Banner>
          <Spacer y={1} />
        </AnimateHeight>
        <TabSelector
          noBuffer
          options={[
            { label: "Activity", value: "activity" },
            { label: "Overview", value: "overview" },
            { label: "Logs", value: "logs" },
            { label: "Metrics", value: "metrics" },
            { label: "Environment", value: "environment" },
            ...(latestProto.build
              ? [
                  {
                    label: "Build Settings",
                    value: "build-settings",
                  },
                ]
              : []),
            { label: "Settings", value: "settings" },
          ]}
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            history.push(`/apps/${porterApp.name}/${tab}`);
          }}
        />
        <Spacer y={1} />
        {match(currentTab)
          .with("activity", () => <Activity />)
          .with("overview", () => <Overview />)
          .with("build-settings", () => (
            <BuildSettings
              redeployOnSave={redeployOnSave}
              setRedeployOnSave={setRedeployOnSave}
            />
          ))
          .with("environment", () => <Environment />)
          .with("settings", () => <Settings />)
          .with("logs", () => <LogsTab />)
          .with("metrics", () => <MetricsTab />)
          .with("events", () => <EventFocusView />)
          .otherwise(() => null)}
        <Spacer y={2} />
      </form>
    </FormProvider>
  );
};

export default AppDataContainer;
