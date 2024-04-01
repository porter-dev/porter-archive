import React, { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type PorterApp } from "@porter-dev/api-contracts";
import axios from "axios";
import _ from "lodash";
import { FormProvider, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import { match } from "ts-pattern";
import { z } from "zod";

import Error from "components/porter/Error";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import Environment from "main/home/app-dashboard/app-view/tabs/Environment";
import {
  clientAddonFromProto,
  clientAddonToProto,
  clientAddonValidator,
} from "lib/addons";
import { useAppWithPreviewOverrides } from "lib/hooks/useAppWithPreviewOverrides";
import {
  basePorterAppFormValidator,
  clientAppToProto,
  type SourceOptions,
} from "lib/porter-apps";

import api from "shared/api";

import { type ExistingTemplateWithEnv } from "../types";
import { Addons } from "./Addons";
import { PreviewGHAModal } from "./PreviewGHAModal";
import { RequiredApps } from "./RequiredApps";
import { ServiceSettings } from "./ServiceSettings";

type Props = {
  existingTemplate: ExistingTemplateWithEnv | null;
};

const previewEnvSettingsTabs = [
  "services",
  "variables",
  "addons",
  "required-apps",
] as const;

type PreviewEnvSettingsTab = (typeof previewEnvSettingsTabs)[number];

const appTemplateClientValidator = basePorterAppFormValidator.extend({
  addons: z.array(clientAddonValidator).default([]),
});
export type AppTemplateFormData = z.infer<typeof appTemplateClientValidator>;

type EncodedAddonWithEnv = {
  base64_addon: string;
  variables: Record<string, string>;
  secrets: Record<string, string>;
};

export const PreviewAppDataContainer: React.FC<Props> = ({
  existingTemplate,
}) => {
  const history = useHistory();

  const [tab, setTab] = useState<PreviewEnvSettingsTab>("services");
  const [validatedAppProto, setValidatedAppProto] = useState<PorterApp | null>(
    null
  );
  const [createError, setCreateError] = useState("");
  const [showGHAModal, setShowGHAModal] = useState(false);
  const [{ variables, secrets }, setFinalizedAppEnv] = useState<{
    variables: Record<string, string>;
    secrets: Record<string, string>;
  }>({
    variables: {},
    secrets: {},
  });
  const [encodedAddons, setEncodedAddons] = useState<EncodedAddonWithEnv[]>([]);

  const {
    porterApp,
    appEnv,
    latestProto,
    servicesFromYaml,
    clusterId,
    projectId,
    deploymentTarget,
  } = useLatestRevision();

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

  const withPreviewOverrides = useAppWithPreviewOverrides({
    latestApp: latestProto,
    detectedServices: servicesFromYaml,
    existingTemplate: existingTemplate?.template_b64_app_proto,
    templateEnv: existingTemplate?.app_env,
    appEnv,
  });

  const existingAddonsWithEnv = useMemo(() => {
    if (!existingTemplate) {
      return [];
    }

    const existingAddons = existingTemplate.addons.map((addon) =>
      clientAddonFromProto({
        addon: addon.addon,
        variables: addon.variables,
        secrets: addon.secrets,
      })
    );

    return existingAddons;
  }, [existingTemplate?.addons]);

  const porterAppFormMethods = useForm<AppTemplateFormData>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(appTemplateClientValidator),
    defaultValues: {
      app: withPreviewOverrides,
      source: latestSource,
      deletions: {
        serviceNames: [],
        envGroupNames: [],
        predeploy: [],
      },
      addons: [],
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = porterAppFormMethods;

  const errorMessagesDeep = useMemo(() => {
    return Object.values(_.mapValues(errors, (error) => error?.message));
  }, [errors]);

  const buttonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }

    if (errorMessagesDeep.length > 0) {
      return <Error message={`App update failed. ${errorMessagesDeep[0]}`} />;
    }

    if (isSubmitSuccessful) {
      return "success";
    }

    return "";
  }, [isSubmitting, errorMessagesDeep]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      setCreateError("");

      const proto = clientAppToProto(data);
      setValidatedAppProto(proto);

      const addons = data.addons.map((addon) => {
        const variables = match(addon.config)
          .with({ type: "postgres" }, (conf) => ({
            POSTGRESQL_USERNAME: conf.username,
          }))
          .with({ type: "redis" }, (conf) => ({
            REDIS_PASSWORD: conf.password,
          }))
          .exhaustive();
        const secrets = match(addon.config)
          .with({ type: "postgres" }, (conf) => ({
            POSTGRESQL_PASSWORD: conf.password,
          }))
          .with({ type: "redis" }, (conf) => ({
            REDIS_PASSWORD: conf.password,
          }))
          .exhaustive();

        const proto = clientAddonToProto(addon);

        return {
          base64_addon: btoa(proto.toJsonString()),
          variables,
          secrets,
        };
      });
      setEncodedAddons(addons);

      const { env } = data.app;
      const variables = env
        .filter((e) => !e.hidden && !e.deleted)
        .reduce((acc: Record<string, string>, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
      const secrets = env
        .filter((e) => !e.deleted)
        .reduce((acc: Record<string, string>, item) => {
          if (item.hidden) {
            acc[item.key] = item.value;
          }
          return acc;
        }, {});
      setFinalizedAppEnv({ variables, secrets });

      if (!existingTemplate) {
        setShowGHAModal(true);
        return;
      }

      await createTemplateAndWorkflow({
        app: proto,
        variables,
        secrets,
        addons,
      });
      history.push(`/preview-environments`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setCreateError(err.response?.data?.error);
        return;
      }
      setCreateError(
        "An error occurred while validating your application. Please try again."
      );
    }
  });

  const createTemplateAndWorkflow = useCallback(
    async ({
      app,
      variables,
      secrets,
      addons = [],
    }: {
      app: PorterApp | null;
      variables: Record<string, string>;
      secrets: Record<string, string>;
      addons?: EncodedAddonWithEnv[];
    }) => {
      try {
        if (!app) {
          return false;
        }

        await api.createAppTemplate(
          "<token>",
          {
            b64_app_proto: btoa(app.toJsonString()),
            variables,
            secrets,
            base_deployment_target_id: deploymentTarget.id,
            addons,
          },
          {
            project_id: projectId,
            cluster_id: clusterId,
            porter_app_name: porterApp.name,
          }
        );

        return true;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          setCreateError(err.response?.data?.error);
          return false;
        }

        setCreateError(
          "An error occurred while creating the CI workflow. Please try again."
        );
        return false;
      }
    },
    []
  );

  useEffect(() => {
    reset({
      app: withPreviewOverrides,
      source: latestSource,
      deletions: {
        serviceNames: [],
        envGroupNames: [],
        predeploy: [],
      },
      addons: existingAddonsWithEnv,
    });
  }, [withPreviewOverrides, latestSource, existingAddonsWithEnv]);

  return (
    <FormProvider {...porterAppFormMethods}>
      <TabSelector
        noBuffer
        options={[
          { label: "App Services", value: "services" },
          { label: "Environment Variables", value: "variables" },
          { label: "Required Apps", value: "required-apps" },
          { label: "Add-ons", value: "addons" },
        ]}
        currentTab={tab}
        setCurrentTab={(tab: string) => {
          if (tab === "services") {
            setTab("services");
          } else if (tab === "variables") {
            setTab("variables");
          } else if (tab === "required-apps") {
            setTab("required-apps");
          } else {
            setTab("addons");
          }
        }}
      />
      <Spacer y={1} />
      <form onSubmit={onSubmit}>
        {match(tab)
          .with("services", () => (
            <ServiceSettings buttonStatus={buttonStatus} />
          ))
          .with("variables", () => (
            <Environment
              latestSource={latestSource}
              buttonStatus={buttonStatus}
            />
          ))
          .with("required-apps", () => (
            <RequiredApps buttonStatus={buttonStatus} />
          ))
          .with("addons", () => <Addons buttonStatus={buttonStatus} />)
          .exhaustive()}
      </form>
      {showGHAModal && (
        <PreviewGHAModal
          projectId={projectId}
          clusterId={clusterId}
          onClose={() => {
            setShowGHAModal(false);
          }}
          latestSource={latestSource}
          appName={porterApp.name}
          savePreviewConfig={async () =>
            await createTemplateAndWorkflow({
              app: validatedAppProto,
              variables,
              secrets,
              addons: encodedAddons,
            })
          }
          error={createError}
        />
      )}
    </FormProvider>
  );
};
