import React, { useCallback, useContext, useEffect } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import web from "assets/web.png";
import AnimateHeight from "react-animate-height";
import axios from "axios";

import styled from "styled-components";
import { useForm, Controller, FormProvider } from "react-hook-form";
import Back from "components/porter/Back";
import VerticalSteps from "components/porter/VerticalSteps";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import { ControlledInput } from "components/porter/ControlledInput";
import Link from "components/porter/Link";

import { Context } from "shared/Context";
import { PorterAppFormData, SourceOptions } from "lib/porter-apps";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import SourceSelector from "../new-app-flow/SourceSelector";
import Button from "components/porter/Button";
import RepoSettings from "./RepoSettings";
import ImageSettings from "./ImageSettings";
import Container from "components/porter/Container";
import ServiceList from "../validate-apply/services-settings/ServiceList";
import {
  defaultSerialized,
  deserializeService,
} from "lib/porter-apps/services";
import EnvVariables from "../validate-apply/app-settings/EnvVariables";
import { usePorterYaml } from "lib/hooks/usePorterYaml";
import { valueExists } from "shared/util";
import api from "shared/api";
import { PorterApp } from "@porter-dev/api-contracts";
import GithubActionModal from "../new-app-flow/GithubActionModal";
import { useDefaultDeploymentTarget } from "lib/hooks/useDeploymentTarget";
import Error from "components/porter/Error";
import { useAppAnalytics } from "lib/hooks/useAppAnalytics";
import { useAppValidation } from "lib/hooks/useAppValidation";

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
    validatedAppProto,
    setValidatedAppProto,
  ] = React.useState<PorterApp | null>(null);
  const [isDeploying, setIsDeploying] = React.useState(false);
  const [deployError, setDeployError] = React.useState("");

  const porterAppFormMethods = useForm<PorterAppFormData>({
    reValidateMode: "onSubmit",
    defaultValues: {
      app: {
        name: "",
        build: {
          context: "./",
          builder: "",
          buildpacks: [],
          dockerfile: "",
        },
      },
      source: {
        git_repo_name: "",
        git_repo_id: 0,
        git_branch: "",
        porter_yaml_path: "./porter.yaml",
      },
    },
  });
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = porterAppFormMethods;

  const name = watch("app.name");
  const source = watch("source");
  const build = watch("app.build");
  const image = watch("source.image");

  const servicesFromYaml = usePorterYaml(source);
  const deploymentTarget = useDefaultDeploymentTarget();
  const { updateAppStep } = useAppAnalytics(name);
  const { validateApp } = useAppValidation({
    deploymentTargetID: deploymentTarget?.deployment_target_id,
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      const validatedAppProto = await validateApp(data);
      setValidatedAppProto(validatedAppProto);

      if (source?.type === "github") {
        setShowGHAModal(true);
        return;
      }

      await createAndApply({ app: validatedAppProto, source });
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
    }: {
      app: PorterApp | null;
      source: SourceOptions;
    }) => {
      setIsDeploying(true);
      // log analytics event that we started form submission
      updateAppStep("stack-launch-complete");

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

        await api.applyApp(
          "<token>",
          {
            b64_app_proto: btoa(app.toJsonString()),
            deployment_target_id: deploymentTarget.deployment_target_id,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        );

        // log analytics event that we successfully deployed
        updateAppStep("stack-launch-success");

        if (source.type === "docker-registry") {
          history.push(`/apps/${app.name}`);
        }

        return true;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          updateAppStep("stack-launch-failure", err.response?.data?.error);
          setDeployError(err.response?.data?.error);
          return false;
        }

        const msg =
          "An error occurred while deploying your application. Please try again.";
        updateAppStep("stack-launch-failure", msg);
        setDeployError(msg);
        return false;
      } finally {
        setIsDeploying(false);
      }
    },
    [currentProject?.id, currentCluster?.id]
  );

  useEffect(() => {
    // set step to 1 if name is filled out
    if (name) {
      setStep((prev) => Math.max(prev, 1));
    }

    // set step to 2 if source is filled out
    if (source?.type && source.type === "github") {
      if (source.git_repo_name && source.git_branch) {
        setStep((prev) => Math.max(prev, 5));
      }
    }

    // set step to 3 if source is filled out
    if (source?.type && source.type === "docker-registry") {
      if (image && image.tag) {
        setStep((prev) => Math.max(prev, 5));
      }
    }
  }, [
    name,
    source?.type,
    source?.git_repo_name,
    source?.git_branch,
    image?.tag,
  ]);

  // reset services when source changes
  useEffect(() => {
    setValue("app.services", []);
    setDetectedServices({
      detected: false,
      count: 0,
    });
  }, [source?.type, source?.git_repo_name, source?.git_branch, image?.tag]);

  useEffect(() => {
    if (servicesFromYaml && !detectedServices.detected) {
      const { services, predeploy } = servicesFromYaml;
      setValue("app.services", [...services, predeploy].filter(valueExists));
      setDetectedServices({
        detected: true,
        count: services.length,
      });
    }
  }, [servicesFromYaml, detectedServices.detected]);

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
                      {...register("app.name")}
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
                          <RepoSettings
                            build={build}
                            source={source}
                            projectId={currentProject.id}
                          />
                        ) : (
                          <ImageSettings />
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
                              ? `Detected ${detectedServices.count} service${
                                  detectedServices.count > 1 ? "s" : ""
                                } from porter.yaml.`
                              : `Could not detect any services from porter.yaml. Make sure it exists in the root of your repo.`}
                          </Text>
                        </AppearingDiv>
                      )}
                    </Container>
                    <Spacer y={0.5} />
                    <ServiceList
                      defaultExpanded={true}
                      addNewText={"Add a new service"}
                    />
                  </>,
                  <>
                    <Text size={16}>Environment variables (optional)</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                      Specify environment variables shared among all services.
                    </Text>
                    <EnvVariables />
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
                        limitOne={true}
                        addNewText={"Add a new pre-deploy job"}
                        prePopulateService={deserializeService(
                          defaultSerialized({
                            name: "pre-deploy",
                            type: "predeploy",
                          })
                        )}
                        isPredeploy
                      />
                    </>
                  ),
                  <Button
                    type="submit"
                    status={
                      isSubmitting || isDeploying ? (
                        "loading"
                      ) : deployError ? (
                        <Error message={deployError} />
                      ) : undefined
                    }
                    loadingText={"Deploying..."}
                    width={"120px"}
                    disabled={!name || !source || isSubmitting || isDeploying}
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
          stackName={name}
          projectId={currentProject.id}
          clusterId={currentCluster.id}
          deployPorterApp={() =>
            createAndApply({ app: validatedAppProto, source })
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
