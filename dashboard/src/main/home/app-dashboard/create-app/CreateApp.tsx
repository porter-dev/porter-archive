import React, { useContext, useEffect, useMemo } from "react";
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
import { PorterAppFormData } from "lib/porter-apps";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import SourceSelector from "../new-app-flow/SourceSelector";
import Button from "components/porter/Button";
import RepoSettings from "./RepoSettings";
import ImageSettings from "./ImageSettings";
import Container from "components/porter/Container";
import ServiceList from "../validate-apply/services-settings/ServiceList";

type CreateAppProps = {} & RouteComponentProps;

const CreateApp: React.FC<CreateAppProps> = ({}) => {
  const { currentProject } = useContext(Context);
  const [step, setStep] = React.useState(0);

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
  }, [source?.type, source?.git_repo_name, source?.git_branch, image?.tag]);

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
