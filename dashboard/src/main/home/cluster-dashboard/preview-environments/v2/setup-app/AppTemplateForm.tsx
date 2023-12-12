import React, { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { PorterApp } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import _ from "lodash";
import { FormProvider, useForm } from "react-hook-form";
import { Redirect, useHistory } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import Button from "components/porter/Button";
import Error from "components/porter/Error";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import GithubActionModal from "main/home/app-dashboard/new-app-flow/GithubActionModal";
import EnvSettings from "main/home/app-dashboard/validate-apply/app-settings/EnvSettings";
import { populatedEnvGroup } from "main/home/app-dashboard/validate-apply/app-settings/types";
import ServiceList from "main/home/app-dashboard/validate-apply/services-settings/ServiceList";
import {
  applyPreviewOverrides,
  clientAppFromProto,
  clientAppToProto,
  porterAppFormValidator,
  type PorterAppFormData,
  type SourceOptions,
} from "lib/porter-apps";
import {
  defaultSerialized,
  deserializeService,
} from "lib/porter-apps/services";

import api from "shared/api";
import { useClusterResources } from "shared/ClusterResourcesContext";

type Props = {
  existingTemplate: {
    template: PorterApp;
    env: {
      variables: Record<string, string>;
      secret_variables: Record<string, string>;
    };
  } | null;
  onCancel: () => void;
};

const AppTemplateForm: React.FC<Props> = ({ existingTemplate, onCancel }) => {
  const history = useHistory();
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
  const { currentClusterResources } = useClusterResources();

  const {
    porterApp,
    appEnv,
    latestProto,
    servicesFromYaml,
    clusterId,
    projectId,
    deploymentTarget,
  } = useLatestRevision();

  const { data: baseEnvGroups = [] } = useQuery(
    ["getAllEnvGroups", projectId, clusterId],
    async () => {
      const res = await api.getAllEnvGroups(
        "<token>",
        {},
        {
          id: projectId,
          cluster_id: clusterId,
        }
      );

      const { environment_groups: envGroups } = await z
        .object({
          environment_groups: z.array(populatedEnvGroup).default([]),
        })
        .parseAsync(res.data);

      return envGroups;
    }
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

  const withPreviewOverrides = useMemo(() => {
    return applyPreviewOverrides({
      app: clientAppFromProto({
        proto: existingTemplate?.template
          ? existingTemplate.template
          : new PorterApp({
              ...latestProto,
              envGroups: [],
            }), // clear out env groups, they won't get added to the template anyways
        overrides: servicesFromYaml,
        variables: existingTemplate
          ? existingTemplate.env.variables
          : appEnv?.variables,
        secrets: existingTemplate
          ? existingTemplate.env.secret_variables
          : appEnv?.secret_variables,
        lockServiceDeletions: true,
      }),
      overrides: servicesFromYaml?.previews,
    });
  }, [latestProto, existingTemplate?.template, appEnv, servicesFromYaml]);

  const porterAppFormMethods = useForm<PorterAppFormData>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(porterAppFormValidator),
    defaultValues: {
      app: withPreviewOverrides,
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
      });
      history.push(`/apps/${proto.name}/settings`);
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
    }: {
      app: PorterApp | null;
      variables: Record<string, string>;
      secrets: Record<string, string>;
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
    });
  }, [withPreviewOverrides, latestSource]);

  if (latestSource.type !== "github") {
    return <Redirect to={`/apps/${porterApp.name}`} />;
  }

  return (
    <FormProvider {...porterAppFormMethods}>
      <form onSubmit={onSubmit}>
        <ScrollableContent>
          <VerticalSteps
            currentStep={3}
            steps={[
              <>
                <Text size={16}>App service overrides</Text>
                <Spacer y={0.25} />
                <Text color="helper">
                  Override any default service settings for your app&apos;s
                  preview environments. Any changes made here will take
                  precedence over the settings running in production.
                </Text>
                <Spacer y={0.5} />
                <ServiceList
                  addNewText={"Add a new service"}
                  fieldArrayName={"app.services"}
                  internalNetworkingDetails={{
                    namespace: deploymentTarget.namespace,
                    appName: porterApp.name,
                  }}
                  allowAddServices={false}
                />
              </>,
              <>
                <Text size={16}>Environment variables (optional)</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Specify environment variables shared among all services.
                </Text>
                <EnvSettings baseEnvGroups={baseEnvGroups} />
              </>,
              <>
                <Text size={16}>Pre-deploy job (optional)</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  You may add a pre-deploy job to perform an operation before
                  your application services deploy each time, like a database
                  migration.
                </Text>
                <Spacer y={0.5} />
                <ServiceList
                  addNewText={"Add a new pre-deploy job"}
                  prePopulateService={deserializeService({
                    service: defaultSerialized({
                      name: "pre-deploy",
                      type: "predeploy",
                      defaultCPU: currentClusterResources.defaultCPU,
                      defaultRAM: currentClusterResources.defaultRAM,
                    }),
                  })}
                  existingServiceNames={
                    latestProto.predeploy ? ["pre-deploy"] : []
                  }
                  isPredeploy
                  fieldArrayName={"app.predeploy"}
                />
              </>,
            ].filter((x) => x)}
          />
        </ScrollableContent>
        <ButtonContainer>
          <Button
            color="#b91133"
            onClick={() => {
              onCancel();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loadingText={"Saving..."}
            width={"150px"}
            status={buttonStatus}
          >
            Save Changes
          </Button>
        </ButtonContainer>
      </form>
      {showGHAModal && (
        <GithubActionModal
          type="preview"
          closeModal={() => {
            setShowGHAModal(false);
          }}
          githubAppInstallationID={latestSource.git_repo_id}
          githubRepoOwner={latestSource.git_repo_name.split("/")[0]}
          githubRepoName={latestSource.git_repo_name.split("/")[1]}
          branch={latestSource.git_branch}
          stackName={porterApp.name}
          projectId={projectId}
          clusterId={clusterId}
          deployPorterApp={async () =>
            await createTemplateAndWorkflow({
              app: validatedAppProto,
              variables,
              secrets,
            })
          }
          deploymentError={createError}
          porterYamlPath={latestSource.porter_yaml_path}
          redirectPath={`/preview-environments`}
        />
      )}
    </FormProvider>
  );
};

export default AppTemplateForm;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  column-gap: 0.5rem;
`;

const ScrollableContent = styled.div`
  width: 100%;
  min-height: 200px;
  max-height: 575px;
  overflow-y: auto;
  padding: 10px;
  position: relative;
`;
