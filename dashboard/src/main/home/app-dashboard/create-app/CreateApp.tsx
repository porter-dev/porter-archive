import React, { useCallback, useContext, useEffect, useMemo } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import web from "assets/web.png";
import AnimateHeight from "react-animate-height";

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
  defaultServicesWithOverrides,
} from "lib/porter-apps";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import SourceSelector from "../new-app-flow/SourceSelector";
import Button from "components/porter/Button";
import RepoSettings from "./RepoSettings";
import ImageSettings from "./ImageSettings";
import Container from "components/porter/Container";
import ServiceList from "../validate-apply/services-settings/ServiceList";
import { useQuery } from "@tanstack/react-query";
import api from "shared/api";
import { z } from "zod";
import { PorterApp } from "@porter-dev/api-contracts";

type CreateAppProps = {} & RouteComponentProps;

const CreateApp: React.FC<CreateAppProps> = ({}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [step, setStep] = React.useState(0);
  const [detectedServices, setDetectedServices] = React.useState<{
    detected: boolean;
    count: number;
  }>({ detected: false, count: 0 });

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
    formState: { isSubmitting },
  } = porterAppFormMethods;

  const name = watch("app.name");
  const source = watch("source");
  const build = watch("app.build");
  const image = watch("app.image");

  const { data } = useQuery(
    [
      "getPorterYamlContents",
      currentProject?.id,
      source.git_branch,
      source.git_repo_name,
    ],
    async () => {
      if (!currentProject) {
        return;
      }
      if (source.type !== "github") {
        return;
      }
      const res = await api.getPorterYamlContents(
        "<token>",
        {
          path: source.porter_yaml_path,
        },
        {
          project_id: currentProject.id,
          git_repo_id: source.git_repo_id,
          kind: "github",
          owner: source.git_repo_name.split("/")[0],
          name: source.git_repo_name.split("/")[1],
          branch: source.git_branch,
        }
      );

      return z.string().parseAsync(res.data);
    },
    {
      enabled:
        source.type === "github" &&
        Boolean(source.git_repo_name) &&
        Boolean(source.git_branch),
    }
  );

  const detectServices = useCallback(
    async ({
      b64Yaml,
      projectId,
      clusterId,
    }: {
      b64Yaml: string;
      projectId: number;
      clusterId: number;
    }) => {
      try {
        const res = await api.parsePorterYaml(
          "<token>",
          { b64_yaml: b64Yaml },
          {
            project_id: projectId,
            cluster_id: clusterId,
          }
        );

        const data = await z
          .object({
            b64_app_proto: z.string(),
          })
          .parseAsync(res.data);
        const proto = PorterApp.fromJsonString(atob(data.b64_app_proto));
        const { services, predeploy } = defaultServicesWithOverrides({
          overrides: proto,
        });

        if (services.length) {
          setValue("app.services", services);
          setDetectedServices({
            detected: true,
            count: services.length,
          });
        }

        if (predeploy) {
          setValue("app.predeploy", predeploy);
        }
      } catch (err) {
        // silent failure for now
      }
    },
    []
  );

  useEffect(() => {
    // set step to 1 if name is filled out
    if (name) {
      setStep((prev) => Math.max(prev, 1));
    }

    // set step to 2 if source is filled out
    if (source?.type && source.type === "github") {
      if (source.git_repo_name && source.git_branch) {
        setStep((prev) => Math.max(prev, 3));
      }
    }

    // set step to 3 if source is filled out
    if (source?.type && source.type === "docker-registry") {
      if (image && image.tag) {
        setStep((prev) => Math.max(prev, 3));
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
    if (!currentProject || !currentCluster) {
      return;
    }

    if (data) {
      detectServices({
        b64Yaml: data,
        projectId: currentProject.id,
        clusterId: currentCluster.id,
      });
    }
  }, [data]);

  if (!currentProject) {
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
                  <Button
                    status={isSubmitting && "loading"}
                    loadingText={"Deploying..."}
                    width={"120px"}
                    disabled={true}
                  >
                    Deploy app
                  </Button>
                </>,
              ]}
            />
          </FormProvider>
          <Spacer y={3} />
        </StyledConfigureTemplate>
      </Div>
    </CenterWrapper>
  );
};

export default withRouter(CreateApp);

const ErrorText = styled.span`
  color: red;
  margin-left: 10px;
  display: ${(props: { hasError: boolean }) =>
    props.hasError ? "inline-block" : "none"};
`;

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
