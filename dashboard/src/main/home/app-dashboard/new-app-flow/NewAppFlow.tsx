import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import _ from "lodash";

import { hardcodedNames, hardcodedIcons } from "shared/hardcodedNameDict";
import { Context } from "shared/Context";
import api from "shared/api";
import { pushFiltered } from "shared/routing";
import web from "assets/web.png";

import Back from "components/porter/Back";
import DashboardHeader from "../../cluster-dashboard/DashboardHeader";
import Link from "components/porter/Link";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import VerticalSteps from "components/porter/VerticalSteps";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import Placeholder from "components/Placeholder";
import Button from "components/porter/Button";
import { generateSlug } from "random-word-slugs";
import { RouteComponentProps, withRouter } from "react-router";
import Error from "components/porter/Error";
import SourceSelector, { SourceType } from "./SourceSelector";
import SourceSettings from "./SourceSettings"
import Services from "./Services";
import EnvGroupArray, { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import GithubActionModal from "./GithubActionModal";

type Props = RouteComponentProps & {
};


interface FormState {
  applicationName: string;
  selectedSourceType: SourceType | undefined;
  serviceList: any[];
  envVariables: KeyValueType[];
}

const INITIAL_STATE: FormState = {
  applicationName: "",
  selectedSourceType: undefined,
  serviceList: [],
  envVariables: [],
};

const Validators: {
  [key in keyof FormState]: (value: FormState[key]) => boolean;
} = {
  applicationName: (value: string) => value.trim().length > 0,
  selectedSourceType: (value: SourceType | undefined) => value !== undefined,
  serviceList: (value: any[]) => value.length > 0,
  envVariables: (value: KeyValueType[]) => true,
};



const NewAppFlow: React.FC<Props> = ({
  ...props
}) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [showGHAModal, setShowGHAModal] = useState<boolean>(false);

  return (
    <CenterWrapper>
      <StyledConfigureTemplate>
        <Back to="/apps" />
        <DashboardHeader
          prefix={
            <Icon
              src={web}
            />
          }
          title="Deploy a new application"
          capitalize={false}
          disableLineBreak
        />
        <DarkMatter />
        <VerticalSteps
          currentStep={currentStep}
          steps={[
            <>
              <Text size={16}>Application name</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                Lowercase letters, numbers, and "-" only.
              </Text>
              <Spacer y={0.5} />
              <Input
                placeholder="ex: academic-sophon"
                value={formState.applicationName}
                width="100%"
                setValue={(e) => {
                  setFormState({ ...formState, applicationName: e })
                  if (Validators.applicationName(e)) {
                    setCurrentStep(Math.max(currentStep, 1));
                  }
                }}
              />
            </>,
            <>
              <Text size={16}>Deployment method</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                Deploy from a Git repository or a Docker registry.
                <a
                  href="https://docs.porter.run/deploying-applications/overview"
                  target="_blank"
                >
                  &nbsp;Learn more.
                </a>
              </Text>
              <Spacer y={0.5} />
              <SourceSelector
                selectedSourceType={formState.selectedSourceType}
                setSourceType={(type) => {
                  setFormState({ ...formState, selectedSourceType: type })
                  if (Validators.selectedSourceType(type)) {
                    setCurrentStep(Math.max(currentStep, 2));
                  }
                }}
              />
              <SourceSettings source={formState.selectedSourceType} />
            </>,
            <>
              <Text size={16}>Services</Text>
              <Spacer y={1} />
              <Services
                setServices={
                  (services: any[]) => {
                    setFormState({ ...formState, serviceList: services })
                    if (Validators.serviceList(services)) {
                      setCurrentStep(Math.max(currentStep, 4));
                    }
                  }}
                services={formState.serviceList}
              />
            </>,
            <>
              <Text size={16}>Environment variables</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                Specify environment variables shared among all services.
              </Text>
              <EnvGroupArray
                values={formState.envVariables}
                setValues={(x: any) => setFormState({ ...formState, envVariables: x })}
                fileUpload={true}
              />
            </>,
            <>
              <Text size={16}>Release command (optional)</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                If specified, this command will be run before every deployment.
              </Text>
              <Spacer y={0.5} />
              <Input
                placeholder="yarn ./scripts/run-migrations.js"
                value={""}
                width="100%"
                setValue={(e) => { }}
              />
            </>
          ]}
        />
        <Spacer y={1} />
        <Button onClick={() => setShowGHAModal(true)}>
          DEPLYOY
        </Button>
      </StyledConfigureTemplate>
      {showGHAModal && <GithubActionModal closeModal={() => setShowGHAModal(false)} />}
    </CenterWrapper>
  );
};

export default withRouter(NewAppFlow);

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

const StyledConfigureTemplate = styled.div`
  height: 100%;
`;



