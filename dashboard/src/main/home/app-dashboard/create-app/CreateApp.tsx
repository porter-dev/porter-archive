import React, { useCallback, useContext, useEffect, useMemo } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import web from "assets/web.png";
import AnimateHeight from "react-animate-height";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";

import styled from "styled-components";
import { useForm, Controller, FormProvider } from "react-hook-form";
import Back from "components/porter/Back";
import VerticalSteps from "components/porter/VerticalSteps";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import { ControlledInput } from "components/porter/ControlledInput";
import Link from "components/porter/Link";

import { Context } from "shared/Context";
import {
  PorterAppFormData,
  SourceOptions,
  porterAppFormValidator,
} from "lib/porter-apps";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import SourceSelector from "../new-app-flow/SourceSelector";
import Button from "components/porter/Button";
import RepoSettings from "./RepoSettings";
import Container from "components/porter/Container";
import ServiceList from "../validate-apply/services-settings/ServiceList";
import {
  defaultSerialized,
  deserializeService,
} from "lib/porter-apps/services";
import { usePorterYaml } from "lib/hooks/usePorterYaml";
import { valueExists } from "shared/util";
import api from "shared/api";
import { PorterApp } from "@porter-dev/api-contracts";
import GithubActionModal from "../new-app-flow/GithubActionModal";
import { useDefaultDeploymentTarget } from "lib/hooks/useDeploymentTarget";
import Error from "components/porter/Error";
import { useAppAnalytics } from "lib/hooks/useAppAnalytics";
import { useAppValidation } from "lib/hooks/useAppValidation";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  PopulatedEnvGroup,
  populatedEnvGroup,
} from "../validate-apply/app-settings/types";
import EnvSettings from "../validate-apply/app-settings/EnvSettings";
import ImageSettings from "../image-settings/ImageSettings";
import { useClusterResourceLimits } from "lib/hooks/useClusterResourceLimits";

type CreateAppProps = {} & RouteComponentProps;

const CreateApp: React.FC<CreateAppProps> = ({ history }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [step, setStep] = React.useState(0);
  const [detectedServices, setDetectedServices] = React.useState<{
    detected: boolean;
    count: number;
  }>({ detected: false, count: 0 });
  const [showGHAModal, setShowGHAModal] = React.useState(false);
  const [
    userHasSeenNoPorterYamlFoundModal,
    setUserHasSeenNoPorterYamlFoundModal,
  ] = React.useState(false);

  const [
    validatedAppProto,
    setValidatedAppProto,
  ] = React.useState<PorterApp | null>(null);
  const [isDeploying, setIsDeploying] = React.useState(false);
  const [deployError, setDeployError] = React.useState("");
  const [{ variables, secrets }, setFinalizedAppEnv] = React.useState<{
    variables: Record<string, string>;
    secrets: Record<string, string>;
  }>({
    variables: {},
    secrets: {},
  });
  const { maxCPU, maxRAM } = useClusterResourceLimits({
    projectId: currentProject?.id,
    clusterId: currentCluster?.id,
  })

  const { data: porterApps = [] } = useQuery<string[]>(
    ["getPorterApps", currentProject?.id, currentCluster?.id],
    async () => {
      if (!currentProject?.id || !currentCluster?.id) {
        return Promise.resolve([]);
      }

      const res = await api.getPorterApps(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
          cluster_id: currentCluster?.id,
        }
      );

      const apps = await z
        .object({
          name: z.string(),
        })
        .array()
        .parseAsync(res.data);
      return apps.map((app) => app.name);
    },
    {
      enabled: !!currentProject?.id && !!currentCluster?.id,
    }
  );

  const { data: baseEnvGroups = [] } = useQuery(
    ["getAllEnvGroups", currentProject?.id, currentCluster?.id],
    async () => {
      if (!currentProject?.id || !currentCluster?.id) {
        return [];
      }
      const res = await api.getAllEnvGroups<PopulatedEnvGroup[]>(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
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

  const porterAppFormMethods = useForm<PorterAppFormData>({
    resolver: zodResolver(porterAppFormValidator),
    reValidateMode: "onSubmit",
    defaultValues: {
      app: {
        name: {
          value: "",
          readOnly: false,
        },
        build: {
          method: "pack",
          context: "./",
          builder: "",
          buildpacks: [],
        },
        env: [],
      },
      source: {
        git_repo_name: "",
        git_branch: "",
        porter_yaml_path: "./porter.yaml",
      },
      deletions: {
        serviceNames: [],
        envGroupNames: [],
        predeploy: [],
      },
    },
  });
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    setError,
    clearErrors,
    formState: { isSubmitting: isValidating, errors },
  } = porterAppFormMethods;

  const name = watch("app.name");
  const source = watch("source");
  const build = watch("app.build");
  const image = watch("source.image");
  const services = watch("app.services");

  const { detectedServices: servicesFromYaml, detectedName } = usePorterYaml({
    source: source?.type === "github" ? source : null,
    appName: "", // only want to know if porter.yaml has name set, otherwise use name from input
  });
  const deploymentTarget = useDefaultDeploymentTarget();
  const { updateAppStep } = useAppAnalytics();
  const { validateApp } = useAppValidation({
    deploymentTargetID: deploymentTarget?.deployment_target_id,
    creating: true,
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      setDeployError("");
      const { validatedAppProto, variables, secrets } = await validateApp(data);
      setValidatedAppProto(validatedAppProto);
      setFinalizedAppEnv({ variables, secrets });

      if (source.type === "github") {
        setShowGHAModal(true);
        return;
      }

      await createAndApply({
        app: validatedAppProto,
        source,
        variables,
        secrets,
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setDeployError(err.response?.data?.error);
        return;
      }
      setDeployError(
        "An error occurred while validating your application. Please try again."
      );
    }
  });

  const createAndApply = useCallback(
    async ({
      app,
      source,
      variables,
      secrets,
    }: {
      app: PorterApp | null;
      source: SourceOptions;
      variables: Record<string, string>;
      secrets: Record<string, string>;
    }) => {
      setIsDeploying(true);
      // log analytics event that we started form submission
      updateAppStep({ step: "stack-launch-complete", appName: name.value });

      try {
        if (!currentProject?.id || !currentCluster?.id) {
          return false;
        }

        if (!app || !deploymentTarget) {
          return false;
        }

        await api.createApp(
          "<token>",
          {
            ...source,
            name: app.name,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        );

        const res = await api.updateEnvironmentGroupV2(
          "<token>",
          {
            deployment_target_id: deploymentTarget.deployment_target_id,
            variables: variables,
            b64_app_proto: btoa(app.toJsonString()),
            secrets: secrets,
          },
          {
            id: currentProject.id,
            cluster_id: currentCluster.id,
            app_name: app.name,
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
          ...app,
          envGroups: updatedEnvGroups.env_groups.map((eg) => ({
            name: eg.name,
            version: eg.latest_version,
          })),
        });

        await api.applyApp(
          "<token>",
          {
            b64_app_proto: btoa(protoWithUpdatedEnv.toJsonString()),
            deployment_target_id: deploymentTarget.deployment_target_id,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        );

        // log analytics event that we successfully deployed
        updateAppStep({ step: "stack-launch-success", appName: name.value });

        if (source.type === "docker-registry") {
          history.push(`/apps/${app.name}`);
        }

        return true;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          updateAppStep({
            step: "stack-launch-failure",
            errorMessage: err.response?.data?.error,
            appName: name.value,
          });
          setDeployError(err.response?.data?.error);
          return false;
        }

        const msg =
          "An error occurred while deploying your application. Please try again.";
        updateAppStep({
          step: "stack-launch-failure",
          errorMessage: msg,
          appName: name.value,
        });
        setDeployError(msg);
        return false;
      } finally {
        setIsDeploying(false);
      }
    },
    [currentProject?.id, currentCluster?.id, deploymentTarget]
  );

  useEffect(() => {
    // set step to 1 if name is filled out
    if (name.value) {
      setStep((prev) => Math.max(prev, 1));
    } else {
      setStep(0);
    }

    // set step to 2 if source is filled out
    if (source?.type && source.type === "github") {
      if (source.git_repo_name && source.git_branch) {
        setStep((prev) => Math.max(prev, 2));
      }
    }

    // set step to 2 if source is filled out
    if (source?.type && source.type === "docker-registry") {
      if (image && image.tag) {
        setStep((prev) => Math.max(prev, 2));
      }
    }
  }, [
    name.value,
    source?.type,
    source?.git_repo_name,
    source?.git_branch,
    image?.tag,
  ]);

  useEffect(() => {
    if (services?.length > 0) {
      setStep((prev) => Math.max(prev, 5));
    } else {
      setStep((prev) => Math.min(prev, 2));
    }
  }, [services]);

  // todo(ianedwards): it's a bit odd that the button error can be set to either a string or JSX,
  // need to look into refactoring that where possible and then improve this error handling
  const submitBtnStatus = useMemo(() => {
    if (isValidating || isDeploying) {
      return "loading";
    }

    if (deployError) {
      return <Error message={deployError} />;
    }

    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      if (errorKeys.includes("app")) {
        const appErrors = Object.keys(errors?.app ?? {});
        if (appErrors.includes("build")) {
          return (
            <Error message={"Build settings are not properly configured."} />
          );
        }

        if (appErrors.includes("services")) {
          return (
            <Error message={"Service settings are not properly configured."} />
          );
        }
      }
      return <Error message={"App could not be deployed as defined."} />;
    }

    return;
  }, [isValidating, isDeploying, deployError, errors]);

  const submitDisabled = useMemo(() => {
    return !name || !source || services?.length === 0;
  }, [name, source, services?.length]);

  // reset services when source changes
  useEffect(() => {
    setValue("app.services", []);
    setValue("app.predeploy", []);
    setDetectedServices({
      detected: false,
      count: 0,
    });

    if (source?.type === "docker-registry") {
      setValue("app.build", {
        context: "./",
        method: "pack",
        builder: "",
        buildpacks: [],
      });
      setValue("source", {
        ...source,
        git_repo_name: undefined,
        git_branch: undefined,
      });
    }
  }, [source?.type, source?.git_repo_name, source?.git_branch, image?.tag]);

  useEffect(() => {
    if (servicesFromYaml && !detectedServices.detected) {
      const { services, predeploy, build: detectedBuild } = servicesFromYaml;
      setValue("app.services", services);
      setValue("app.predeploy", [predeploy].filter(valueExists));

      if (detectedBuild) {
        setValue("app.build", detectedBuild);
      }
      setDetectedServices({
        detected: true,
        count: services.length,
      });
    }

    if (!servicesFromYaml && detectedServices.detected) {
      setValue("app.services", []);
      setValue("app.predeploy", []);
      setDetectedServices({
        detected: false,
        count: 0,
      });
    }

    if (detectedName) {
      setValue("app.name", { value: detectedName, readOnly: true });
    }

    if (!detectedName && name.readOnly) {
      setValue("app.name", { value: "", readOnly: false });
    }
  }, [servicesFromYaml, detectedName, detectedServices.detected]);

  useEffect(() => {
    if (porterApps.includes(name.value)) {
      setError("app.name.value", {
        message: "An app with this name already exists",
      });
    } else {
      clearErrors("app.name.value");
    }
  }, [porterApps, name.value]);

  if (!currentProject || !currentCluster) {
    return null;
  }

  return (
    <CenterWrapper>
      <Div>
        <StyledConfigureTemplate>
          <Back to="/apps" />
          <DashboardHeader
            prefix={<Icon src={web} />}
            title="Deploy a new application"
            capitalize={false}
            disableLineBreak
          />
          <DarkMatter />
          <FormProvider {...porterAppFormMethods}>
            <form onSubmit={onSubmit}>
              <VerticalSteps
                currentStep={step}
                steps={[
                  <>
                    <Text size={16}>Application name</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                      Lowercase letters, numbers, and "-" only.
                    </Text>
                    <Spacer y={0.5} />
                    <ControlledInput
                      placeholder="ex: academic-sophon"
                      type="text"
                      width="300px"
                      error={errors.app?.name?.message}
                      disabled={name.readOnly}
                      disabledTooltip={
                        "You may only edit this field in your porter.yaml."
                      }
                      {...register("app.name.value")}
                    />
                  </>,
                  <>
                    <Text size={16}>Deployment method</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                      Deploy from a Git repository or a Docker registry.
                      <Spacer inline width="5px" />
                      <Link
                        hasunderline
                        to="https://docs.porter.run/standard/deploying-applications/overview"
                        target="_blank"
                      >
                        Learn more
                      </Link>
                    </Text>
                    <Spacer y={0.5} />
                    <Controller
                      name="source.type"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <SourceSelector
                          selectedSourceType={value}
                          setSourceType={(sourceType) => {
                            onChange(sourceType);
                          }}
                        />
                      )}
                    />
                    <AnimateHeight height={source ? "auto" : 0}>
                      <Spacer y={1} />
                      {source?.type ? (
                        source.type === "github" ? (
                          <>
                            <RepoSettings
                              build={build}
                              source={source}
                              projectId={currentProject.id}
                            />
                            {/* todo(ianedwards): re-enable porter.yaml modal after validate/apply v2 is rolled out and proven to be stable */}
                            {/* {!userHasSeenNoPorterYamlFoundModal &&
                              !porterYamlFound &&
                              !isLoadingPorterYaml && (
                                <Controller
                                  name="source.porter_yaml_path"
                                  control={control}
                                  render={({ field: { onChange, value } }) => (
                                    <PorterYamlModal
                                      close={() =>
                                        setUserHasSeenNoPorterYamlFoundModal(
                                          true
                                        )
                                      }
                                      setPorterYamlPath={(porterYamlPath) => {
                                        onChange(porterYamlPath);
                                      }}
                                      porterYamlPath={value}
                                    />
                                  )}
                                />
                              )} */}
                          </>
                        ) : (
                          <ImageSettings
                            projectId={currentProject.id}
                            imageUri={image?.repository ?? ""}
                            setImageUri={(uri: string) => setValue("source.image", { ...image, repository: uri })}
                            imageTag={image?.tag ?? ""}
                            setImageTag={(tag: string) => setValue("source.image", { ...image, tag })}
                            resetImageInfo={() => setValue("source.image", { ...image, repository: "", tag: "" })}
                          />
                        )
                      ) : null}
                    </AnimateHeight>
                  </>,
                  <>
                    <Container row>
                      <Text size={16}>Application services</Text>
                      {detectedServices.detected && (
                        <AppearingDiv
                          color={
                            detectedServices.detected ? "#8590ff" : "#fcba03"
                          }
                        >
                          {detectedServices.count > 0 ? (
                            <I className="material-icons">check</I>
                          ) : (
                            <I className="material-icons">error</I>
                          )}
                          <Text
                            color={
                              detectedServices.detected ? "#8590ff" : "#fcba03"
                            }
                          >
                            {detectedServices.count > 0
                              ? `Detected ${detectedServices.count} service${detectedServices.count > 1 ? "s" : ""
                              } from porter.yaml.`
                              : `Could not detect any services from porter.yaml. Make sure it exists in the root of your repo.`}
                          </Text>
                        </AppearingDiv>
                      )}
                    </Container>
                    <Spacer y={0.5} />
                    <ServiceList
                      addNewText={"Add a new service"}
                      fieldArrayName={"app.services"}
                      maxCPU={maxCPU}
                      maxRAM={maxRAM}
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
                  source.type === "github" && (
                    <>
                      <Text size={16}>Pre-deploy job (optional)</Text>
                      <Spacer y={0.5} />
                      <Text color="helper">
                        You may add a pre-deploy job to perform an operation
                        before your application services deploy each time, like
                        a database migration.
                      </Text>
                      <Spacer y={0.5} />
                      <ServiceList
                        addNewText={"Add a new pre-deploy job"}
                        prePopulateService={deserializeService({
                          service: defaultSerialized({
                            name: "pre-deploy",
                            type: "predeploy",
                          }),
                          expanded: true,
                        })}
                        isPredeploy
                        fieldArrayName={"app.predeploy"}
                        maxCPU={maxCPU}
                        maxRAM={maxRAM}
                      />
                    </>
                  ),
                  <Button
                    type="submit"
                    status={submitBtnStatus}
                    loadingText={"Deploying..."}
                    width={"120px"}
                    disabled={submitDisabled}
                  >
                    Deploy app
                  </Button>,
                ].filter((x) => x)}
              />
            </form>
          </FormProvider>
          <Spacer y={3} />
        </StyledConfigureTemplate>
      </Div>
      {showGHAModal && source?.type === "github" && (
        <GithubActionModal
          closeModal={() => setShowGHAModal(false)}
          githubAppInstallationID={source.git_repo_id}
          githubRepoOwner={source.git_repo_name.split("/")[0]}
          githubRepoName={source.git_repo_name.split("/")[1]}
          branch={source.git_branch}
          stackName={name.value}
          projectId={currentProject.id}
          clusterId={currentCluster.id}
          deployPorterApp={() =>
            createAndApply({
              app: validatedAppProto,
              source,
              variables,
              secrets,
            })
          }
          deploymentError={deployError}
          porterYamlPath={source.porter_yaml_path}
        />
      )}
    </CenterWrapper>
  );
};

export default withRouter(CreateApp);

const Div = styled.div`
  width: 100%;
  max-width: 900px;
`;

const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

const StyledConfigureTemplate = styled.div`
  height: 100%;
`;

const Icon = styled.img`
  margin-right: 15px;
  height: 28px;
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const AppearingDiv = styled.div<{ color?: string }>`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  align-items: center;
  color: ${(props) => props.color || "#ffffff44"};
  margin-left: 10px;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const I = styled.i`
  font-size: 18px;
  margin-right: 5px;
`;
