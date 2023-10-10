import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FieldErrors, FormProvider, useForm } from "react-hook-form";
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
import BuildSettingsTab from "./tabs/BuildSettingsTab";
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
import JobsTab from "./tabs/JobsTab";
import ConfirmRedeployModal from "./ConfirmRedeployModal";
import ImageSettingsTab from "./tabs/ImageSettingsTab";
import { useAppAnalytics } from "lib/hooks/useAppAnalytics";
import { Error as ErrorComponent } from "components/porter/Error";
import _ from "lodash";
import axios from "axios";

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
  "image-settings",
  "settings",
  // "helm-values",
  "job-history",
] as const;
const DEFAULT_TAB = "activity";
type ValidTab = typeof validTabs[number];

type AppDataContainerProps = {
  tabParam?: string;
};

// todo(ianedwards): refactor button to use more predictable state
export type ButtonStatus = "" | "loading" | JSX.Element | "success";

const AppDataContainer: React.FC<AppDataContainerProps> = ({ tabParam }) => {
  const history = useHistory();
  const queryClient = useQueryClient();
  const [confirmDeployModalOpen, setConfirmDeployModalOpen] = useState(false);

  const { updateAppStep } = useAppAnalytics();

  const {
    porterApp: porterAppRecord,
    latestProto,
    previewRevision,
    latestRevision,
    projectId,
    clusterId,
    deploymentTarget,
    servicesFromYaml,
    appEnv,
    setPreviewRevision,
  } = useLatestRevision();
  const { validateApp } = useAppValidation({
    deploymentTargetID: deploymentTarget.id,
  });

  const currentTab = useMemo(() => {
    if (tabParam && validTabs.includes(tabParam as ValidTab)) {
      return tabParam as ValidTab;
    }

    return DEFAULT_TAB;
  }, [tabParam]);

  const latestSource: SourceOptions = useMemo(() => {
    // because we store the image info in the app proto, we can refer to that for repository/tag instead of the app record
    if (porterAppRecord.image_repo_uri && latestProto.image) {
      return {
        type: "docker-registry",
        image: {
          repository: latestProto.image.repository,
          tag: latestProto.image.tag,
        },
      };
    }

    // the app proto does not contain the fields below, so we must pull them from the app record
    return {
      type: "github",
      git_repo_id: porterAppRecord.git_repo_id ?? 0,
      git_repo_name: porterAppRecord.repo_name ?? "",
      git_branch: porterAppRecord.git_branch ?? "",
      porter_yaml_path: porterAppRecord.porter_yaml_path ?? "./porter.yaml",
    };
  }, [porterAppRecord, latestProto]);

  const porterAppFormMethods = useForm<PorterAppFormData>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(porterAppFormValidator),
    defaultValues: {
      app: clientAppFromProto({
        proto: latestProto,
        overrides: servicesFromYaml,
      }),
      source: latestSource,
      deletions: {
        serviceNames: [],
        envGroupNames: [],
        predeploy: [],
      },
    },
  });

  const {
    reset,
    handleSubmit,
    setError,
    formState: {
      isDirty,
      dirtyFields,
      isSubmitting,
      errors,
      isSubmitSuccessful,
    },
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

  const buildIsDirty = useMemo(() => {
    if (!isDirty) return false;

    // get all entries in entire dirtyFields object that are true
    const dirty = getAllDirtyFields(dirtyFields.app?.build ?? {});
    return dirty.some((f) => f);
  }, [isDirty, JSON.stringify(dirtyFields)]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const { variables, secrets, validatedAppProto } = await validateApp(
        data,
        latestProto
      );

      const needsRebuild =
        buildIsDirty || latestRevision.status === "BUILD_FAILED";

      if (needsRebuild && !data.redeployOnSave) {
        setConfirmDeployModalOpen(true);
        return;
      }

      // updates the default env group associated with this app to store app specific env vars
      const res = await api.updateEnvironmentGroupV2(
        "<token>",
        {
          deployment_target_id: deploymentTarget.id,
          variables,
          secrets,
          b64_app_proto: btoa(validatedAppProto.toJsonString()),
          remove_missing: true,
        },
        {
          id: projectId,
          cluster_id: clusterId,
          app_name: porterAppRecord.name,
        }
      );

      const updatedEnvGroups = z
        .object({
          env_groups: z
            .object({
              name: z.string(),
              latest_version: z.coerce.bigint(),
            })
            .array(),
        })
        .parse(res.data);

      const protoWithUpdatedEnv = new PorterApp({
        ...validatedAppProto,
        envGroups: updatedEnvGroups.env_groups.map((eg) => ({
          name: eg.name,
          version: eg.latest_version,
        })),
      });

      // force_build will create a new 0 revision that will not be deployed
      // but will be used to hydrate values when the workflow is run
      await api.applyApp(
        "<token>",
        {
          b64_app_proto: btoa(protoWithUpdatedEnv.toJsonString()),
          deployment_target_id: deploymentTarget.id,
          force_build: needsRebuild,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
        }
      );

      if (latestSource.type === "github" && needsRebuild) {
        const res = await api.reRunGHWorkflow(
          "<token>",
          {},
          {
            project_id: projectId,
            cluster_id: clusterId,
            git_installation_id: latestSource.git_repo_id,
            owner: latestSource.git_repo_name.split("/")[0],
            name: latestSource.git_repo_name.split("/")[1],
            branch: porterAppRecord.git_branch,
            filename: "porter_stack_" + porterAppRecord.name + ".yml",
          }
        );

        if (res.data != null) {
          window.open(res.data, "_blank", "noreferrer");
        }
      }
      await queryClient.invalidateQueries([
        "getLatestRevision",
        projectId,
        clusterId,
        deploymentTarget.id,
        porterAppRecord.name,
      ]);
      setPreviewRevision(null);

      if (deploymentTarget.preview) {
        history.push(
          `/preview-environments/apps/${porterAppRecord.name}/${DEFAULT_TAB}?target=${deploymentTarget.id}`
        );
        return;
      }

      // redirect to the default tab after save
      history.push(`/apps/${porterAppRecord.name}/${DEFAULT_TAB}`);
    } catch (err) {
      let message = "Unable to get error message";
      let stack = "Unable to get error stack";
      if (err instanceof Error) {
        message = err.message;
        stack = err.stack ?? "(No error stack)";
      }
      updateAppStep({
        step: "porter-app-update-failure",
        errorMessage: message,
        appName: latestProto.name,
        errorStackTrace: stack,
      });

      if (axios.isAxiosError(err)) {
        setError("app", {
          message: `App update failed: ${err.message}`,
        });
      } else {
        setError("app", {
          message: `App update failed: Please try again or contact support if the error persists.`,
        });
      }
    }
  });

  const cancelRedeploy = useCallback(() => {
    const resetProto = previewRevision
      ? PorterApp.fromJsonString(atob(previewRevision.b64_app_proto), {
          ignoreUnknownFields: true,
        })
      : latestProto;

    // we don't store versions of build settings because they are stored in the db, so we just have to use the latest version
    // however, for image settings, we can pull image repo and tag from the proto
    const resetSource =
      porterAppRecord.image_repo_uri && resetProto.image
        ? {
            type: "docker-registry" as const,
            image: {
              repository: resetProto.image.repository,
              tag: resetProto.image.tag,
            },
          }
        : latestSource;

    reset({
      app: clientAppFromProto({
        proto: resetProto,
        overrides: servicesFromYaml,
        variables: appEnv?.variables,
        secrets: appEnv?.secret_variables,
      }),
      source: resetSource,
      deletions: {
        envGroupNames: [],
        serviceNames: [],
      },
      redeployOnSave: false,
    });
    setConfirmDeployModalOpen(false);
  }, [previewRevision, latestProto, servicesFromYaml, appEnv, latestSource]);

  const finalizeDeploy = useCallback(() => {
    setConfirmDeployModalOpen(false);
    onSubmit();
  }, [onSubmit, setConfirmDeployModalOpen]);

  const errorMessagesDeep = useMemo(() => {
    return Object.values(_.mapValues(errors, (error) => error?.message));
  }, [errors]);

  const buttonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }

    if (errorMessagesDeep.length > 0) {
      return (
        <ErrorComponent
          message={`App update failed. ${errorMessagesDeep[0]}`}
        />
      );
    }

    if (isSubmitSuccessful) {
      return "success";
    }

    return "";
  }, [isSubmitting, errorMessagesDeep]);

  const tabs = useMemo(() => {
    const base = [
      { label: "Activity", value: "activity" },
      { label: "Overview", value: "overview" },
      { label: "Logs", value: "logs" },
      { label: "Metrics", value: "metrics" },
      { label: "Environment", value: "environment" },
    ];

    if (deploymentTarget.preview) {
      return base;
    }

    if (latestProto.build) {
      base.push({
        label: "Build Settings",
        value: "build-settings",
      });
      base.push({ label: "Settings", value: "settings" });
      return base;
    }

    base.push({
      label: "Image Settings",
      value: "image-settings",
    });
    base.push({ label: "Settings", value: "settings" });
    return base;
  }, [deploymentTarget.preview, latestProto.build]);

  useEffect(() => {
    const newProto = previewRevision
      ? PorterApp.fromJsonString(atob(previewRevision.b64_app_proto), {
          ignoreUnknownFields: true,
        })
      : latestProto;

    // we don't store versions of build settings because they are stored in the db, so we just have to use the latest version
    // however, for image settings, we can pull image repo and tag from the proto
    const newSource =
      porterAppRecord.image_repo_uri && newProto.image
        ? {
            type: "docker-registry" as const,
            image: {
              repository: newProto.image.repository,
              tag: newProto.image.tag,
            },
          }
        : latestSource;

    reset({
      app: clientAppFromProto({
        proto: newProto,
        overrides: servicesFromYaml,
        variables: appEnv?.variables,
        secrets: appEnv?.secret_variables,
      }),
      source: newSource,
      deletions: {
        envGroupNames: [],
        serviceNames: [],
        predeploy: [],
      },
      redeployOnSave: false,
    });
  }, [
    servicesFromYaml,
    currentTab,
    latestProto,
    previewRevision,
    latestRevision.revision_number,
    appEnv,
  ]);

  return (
    <FormProvider {...porterAppFormMethods}>
      <form onSubmit={onSubmit}>
        <RevisionsList
          latestRevisionNumber={latestRevision.revision_number}
          deploymentTargetId={deploymentTarget.id}
          projectId={projectId}
          clusterId={clusterId}
          appName={porterAppRecord.name}
          latestSource={latestSource}
          onSubmit={onSubmit}
          porterAppRecord={porterAppRecord}
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
                  disabled={
                    isSubmitting ||
                    latestRevision.status === "CREATED" ||
                    latestRevision.status === "AWAITING_BUILD_ARTIFACT"
                  }
                  disabledTooltipMessage="Please wait for the deploy to complete before updating the app"
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
          options={tabs}
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            if (deploymentTarget.preview) {
              history.push(
                `/preview-environments/apps/${porterAppRecord.name}/${tab}?target=${deploymentTarget.id}`
              );
              return;
            }
            history.push(`/apps/${porterAppRecord.name}/${tab}`);
          }}
        />
        <Spacer y={1} />
        {match(currentTab)
          .with("activity", () => <Activity />)
          .with("overview", () => (
            <Overview
              buttonStatus={buttonStatus}
            />
          ))
          .with("build-settings", () => (
            <BuildSettingsTab buttonStatus={buttonStatus} />
          ))
          .with("image-settings", () => (
            <ImageSettingsTab buttonStatus={buttonStatus} />
          ))
          .with("environment", () => (
            <Environment
              latestSource={latestSource}
              buttonStatus={buttonStatus}
            />
          ))
          .with("settings", () => <Settings />)
          .with("logs", () => <LogsTab />)
          .with("metrics", () => <MetricsTab />)
          .with("events", () => <EventFocusView />)
          .with("job-history", () => <JobsTab />)
          .otherwise(() => null)}
        <Spacer y={2} />
      </form>
      {confirmDeployModalOpen ? (
        <ConfirmRedeployModal
          setOpen={setConfirmDeployModalOpen}
          cancelRedeploy={cancelRedeploy}
          finalizeDeploy={finalizeDeploy}
          buildIsDirty={buildIsDirty}
        />
      ) : null}
    </FormProvider>
  );
};

export default AppDataContainer;
