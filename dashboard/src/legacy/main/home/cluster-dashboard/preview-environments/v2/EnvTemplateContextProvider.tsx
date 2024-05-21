import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type PorterApp } from "@porter-dev/api-contracts";
import axios from "axios";
import { Error as ErrorComponent } from "legacy/components/porter/Error";
import { clientAddonToProto, clientAddonValidator } from "legacy/lib/addons";
import {
  APP_CREATE_FORM_DEFAULTS,
  basePorterAppFormValidator,
  clientAppToProto,
} from "legacy/lib/porter-apps";
import api from "legacy/shared/api";
import _ from "lodash";
import { FormProvider, useForm } from "react-hook-form";
import { match } from "ts-pattern";
import { z } from "zod";

import { Context } from "shared/Context";
import { useDeploymentTarget } from "shared/DeploymentTargetContext";

type EnvTemplateContextType = {
  showGHAModal: boolean;
  setShowGHAModal: React.Dispatch<React.SetStateAction<boolean>>;
  createError: string;
  setCreateError: React.Dispatch<string>;
  validatedAppProto: PorterApp | null;
  setValidatedAppProto: React.Dispatch<PorterApp | null>;
  encodedAddons: EncodedAddonWithEnv[];
  setEncodedAddons: React.Dispatch<EncodedAddonWithEnv[]>;
  variables: Record<string, string>;
  secrets: Record<string, string>;
  setFinalizedAppEnv: React.Dispatch<{
    variables: Record<string, string>;
    secrets: Record<string, string>;
  }>;
  buttonStatus: "" | "loading" | JSX.Element | "success";
  savePreviewConfig: (args: { repo?: RepoOverrides }) => Promise<void>;
};

export const EnvTemplateContext = createContext<EnvTemplateContextType | null>(
  null
);

export const useEnvTemplate = (): EnvTemplateContextType => {
  const ctx = useContext(EnvTemplateContext);
  if (!ctx) {
    throw new Error(
      "useEnvTemplateContext must be used within a EnvTemplateContextProvider"
    );
  }
  return ctx;
};

export const appTemplateClientValidator = basePorterAppFormValidator.extend({
  addons: z.array(clientAddonValidator).default([]),
});
export type AppTemplateFormData = z.infer<typeof appTemplateClientValidator>;

export type EncodedAddonWithEnv = {
  base64_addon: string;
  variables: Record<string, string>;
  secrets: Record<string, string>;
};

export type RepoOverrides = {
  id: number;
  fullName: string;
};

export const EnvTemplateContextProvider: React.FC<{
  children: React.ReactNode;
  shouldShowGHAModal?: boolean;
}> = ({ children, shouldShowGHAModal }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const { currentDeploymentTarget } = useDeploymentTarget();

  const [showGHAModal, setShowGHAModal] = useState(false);
  const [createError, setCreateError] = useState<string>("");
  const [validatedAppProto, setValidatedAppProto] = useState<PorterApp | null>(
    null
  );
  const [encodedAddons, setEncodedAddons] = useState<EncodedAddonWithEnv[]>([]);
  const [{ variables, secrets }, setFinalizedAppEnv] = useState<{
    variables: Record<string, string>;
    secrets: Record<string, string>;
  }>({
    variables: {},
    secrets: {},
  });

  const envTemplateFormMethods = useForm<AppTemplateFormData>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(appTemplateClientValidator),
    defaultValues: {
      ...APP_CREATE_FORM_DEFAULTS,
      addons: [],
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = envTemplateFormMethods;

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

  const onSubmit = handleSubmit(async (data) => {
    setCreateError("");

    const proto = clientAppToProto(data);
    setValidatedAppProto(proto);

    const addons = data.addons.map((addon) => {
      const variables = match(addon.config)
        .returnType<Record<string, string>>()
        .with({ type: "postgres" }, (conf) => ({
          POSTGRESQL_USERNAME: conf.username,
        }))
        .with({ type: "redis" }, (conf) => ({
          REDIS_PASSWORD: conf.password,
        }))
        .otherwise(() => ({}));
      const secrets = match(addon.config)
        .returnType<Record<string, string>>()
        .with({ type: "postgres" }, (conf) => ({
          POSTGRESQL_PASSWORD: conf.password,
        }))
        .with({ type: "redis" }, (conf) => ({
          REDIS_PASSWORD: conf.password,
        }))
        .otherwise(() => ({}));

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

    if (shouldShowGHAModal) {
      setShowGHAModal(true);
      return;
    }

    await createTemplateAndWorkflow({
      app: proto,
      variables,
      secrets,
      addons,
    });
  });

  const createTemplateAndWorkflow = useCallback(
    async ({
      app,
      variables,
      secrets,
      addons = [],
      repo,
    }: {
      app: PorterApp | null;
      variables: Record<string, string>;
      secrets: Record<string, string>;
      addons?: EncodedAddonWithEnv[];
      repo?: RepoOverrides;
    }) => {
      try {
        if (
          !app ||
          !currentDeploymentTarget ||
          !currentCluster ||
          !currentProject
        ) {
          return false;
        }

        await api.createAppTemplate(
          "<token>",
          {
            b64_app_proto: btoa(app.toJsonString()),
            variables,
            secrets,
            base_deployment_target_id: currentDeploymentTarget.id,
            addons,
            ...(repo && {
              git_overrides: {
                git_repo_id: repo.id,
                git_repo_name: repo.fullName,
              },
            }),
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            porter_app_name: app.name,
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
    [currentDeploymentTarget?.id, currentCluster?.id, currentProject?.id]
  );

  const savePreviewConfig = useCallback(
    async ({ repo }: { repo?: RepoOverrides }) => {
      await createTemplateAndWorkflow({
        app: validatedAppProto,
        variables,
        secrets,
        addons: encodedAddons,
        repo,
      });
    },
    [
      createTemplateAndWorkflow,
      encodedAddons,
      secrets,
      validatedAppProto,
      variables,
    ]
  );

  return (
    <EnvTemplateContext.Provider
      value={{
        showGHAModal,
        setShowGHAModal,
        createError,
        setCreateError,
        validatedAppProto,
        setValidatedAppProto,
        encodedAddons,
        setEncodedAddons,
        variables,
        secrets,
        setFinalizedAppEnv,
        buttonStatus,
        savePreviewConfig,
      }}
    >
      <FormProvider {...envTemplateFormMethods}>
        <form onSubmit={onSubmit}>{children}</form>
      </FormProvider>
    </EnvTemplateContext.Provider>
  );
};
