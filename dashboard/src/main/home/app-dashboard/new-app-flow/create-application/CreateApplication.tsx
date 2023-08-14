import React, { useContext, useEffect } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import web from "assets/web.png";

import styled from "styled-components";
import { PorterApp } from "@porter-dev/api-contracts";
import { useForm, Controller, FormProvider } from "react-hook-form";
import Back from "components/porter/Back";
import DashboardHeader from "../../../cluster-dashboard/DashboardHeader";
import VerticalSteps from "components/porter/VerticalSteps";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import { ControlledInput } from "components/porter/ControlledInput";
import Link from "components/porter/Link";
import SourceSelector from "../SourceSelector";
import SourceSetup from "./SourceSetup";
import RepoBuildSettings from "./RepoBuildSettings";
import { Context } from "shared/Context";
import { Buildpack } from "../../types/buildpack";

type CreateApplicationProps = {} & RouteComponentProps;

export type SourceOptions =
  | {
      type: "github";
      git_repo_name: string;
      git_repo_id: number;
      git_branch: string;
      porter_yaml_path: string;
    }
  | {
      type: "docker-registry";
      image_repo_uri: string;
    };

export type Build = {
  build_context: string;
  builder: string;
  buildpacks: Buildpack[];
  dockerfile: string;
};

export type PorterAppFormData = PorterApp & {
  source: SourceOptions;
  build: Build;
};

const CreateApplication: React.FC<CreateApplicationProps> = ({}) => {
  const { currentProject } = useContext(Context);
  const [step, setStep] = React.useState(0);

  const methods = useForm<PorterAppFormData>({
    reValidateMode: "onSubmit",
    defaultValues: {
      name: "",
      source: {
        git_repo_name: "",
        git_repo_id: 0,
        git_branch: "",
        porter_yaml_path: "./porter.yaml",
      },
      build: {
        build_context: "./",
        builder: "",
        buildpacks: [],
        dockerfile: "",
      },
    },
  });
  const { register, control, watch } = methods;

  const name = watch("name");
  const source = watch("source");
  const build = watch("build");

  useEffect(() => {
    if (name) {
      setStep((prev) => Math.max(prev, 1));
    }
  }, [name]);

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
          <FormProvider {...methods}>
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
                    id={"name"}
                    placeholder="ex: academic-sophon"
                    autoComplete="off"
                    type="text"
                    {...register("name")}
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
                  {source?.type ? (
                    source.type === "github" ? (
                      <RepoBuildSettings
                        build={build}
                        source={source}
                        projectId={currentProject.id}
                      />
                    ) : (
                      <div></div>
                    )
                  ) : null}
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

export default withRouter(CreateApplication);

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
