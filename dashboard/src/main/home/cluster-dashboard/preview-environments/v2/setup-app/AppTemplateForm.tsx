import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import VerticalSteps from "components/porter/VerticalSteps";
import {
  PorterAppFormData,
  SourceOptions,
  applyPreviewOverrides,
  clientAppFromProto,
  porterAppFormValidator,
} from "lib/porter-apps";
import {
  defaultSerialized,
  deserializeService,
} from "lib/porter-apps/services";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import Spacer from "components/porter/Spacer";
import ServiceList from "main/home/app-dashboard/validate-apply/services-settings/ServiceList";
import Text from "components/porter/Text";
import EnvSettings from "main/home/app-dashboard/validate-apply/app-settings/EnvSettings";
import api from "shared/api";
import { z } from "zod";
import { populatedEnvGroup } from "main/home/app-dashboard/validate-apply/app-settings/types";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "react-router";
import Button from "components/porter/Button";
import { useAppValidation } from "lib/hooks/useAppValidation";
import { PorterApp } from "@porter-dev/api-contracts";
import axios from "axios";

const AppTemplateForm: React.FC = () => {
  const [step, setStep] = useState(0);
  const [validatedAppProto, setValidatedAppProto] = useState<PorterApp | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [{ variables, secrets }, setFinalizedAppEnv] = useState<{
    variables: Record<string, string>;
    secrets: Record<string, string>;
  }>({
    variables: {},
    secrets: {},
  });

  const {
    porterApp,
    appEnv,
    latestProto,
    servicesFromYaml,
    clusterId,
    projectId,
    deploymentTarget,
  } = useLatestRevision();
  const { validateApp } = useAppValidation({
    deploymentTargetID: deploymentTarget.id,
    creating: true,
  });

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

      const { environment_groups } = await z
        .object({
          environment_groups: z.array(populatedEnvGroup).default([]),
        })
        .parseAsync(res.data);

      return environment_groups;
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
        proto: latestProto,
        overrides: servicesFromYaml,
        variables: appEnv?.variables,
        secrets: appEnv?.secret_variables,
      }),
      overrides: servicesFromYaml?.previews,
    });
  }, [latestProto, appEnv, servicesFromYaml]);

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

  const { reset, handleSubmit } = porterAppFormMethods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setCreateError("");
      const { validatedAppProto, variables, secrets } = await validateApp(data);
      setValidatedAppProto(validatedAppProto);
      setFinalizedAppEnv({ variables, secrets });

      // todo(ianedwards): this is essentially a no-op for now
      // follow up will be to actually create the template and commit the workflow
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
        <VerticalSteps
          currentStep={step}
          steps={[
            <>
              <Text size={16}>Application services</Text>
              <Spacer y={0.5} />
              <ServiceList
                addNewText={"Add a new service"}
                fieldArrayName={"app.services"}
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
                You may add a pre-deploy job to perform an operation before your
                application services deploy each time, like a database
                migration.
              </Text>
              <Spacer y={0.5} />
              <ServiceList
                addNewText={"Add a new pre-deploy job"}
                prePopulateService={deserializeService({
                  service: defaultSerialized({
                    name: "pre-deploy",
                    type: "predeploy",
                  }),
                })}
                existingServiceNames={
                  latestProto.predeploy ? ["pre-deploy"] : []
                }
                isPredeploy
                fieldArrayName={"app.predeploy"}
              />
            </>,
            <Button type="submit" loadingText={"Deploying..."} width={"150px"}>
              Enable Previews
            </Button>,
          ].filter((x) => x)}
        />
      </form>
    </FormProvider>
  );
};

export default AppTemplateForm;
