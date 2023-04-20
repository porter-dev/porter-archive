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
import SourceSelector from "./SourceSelector";
import SourceSettings from "./SourceSettings"

type Props = RouteComponentProps & {
};

export type SourceType = "github" | "docker-registry";

interface FormState {
  applicationName: string;
  selectedSourceType: SourceType | undefined;
}

const INITIAL_STATE: FormState = {
  applicationName: "",
  selectedSourceType: undefined,
};

const Validators: {
  [key in keyof FormState]: (value: FormState[key]) => boolean;
} = {
  applicationName: (value: string) => value.trim().length > 0,
  selectedSourceType: (value: SourceType | undefined) => value !== undefined,
};



const NewAppFlow: React.FC<Props> = ({
  ...props
}) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);


  return (
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
            <Spacer height="20px" />
            <Input
              placeholder="ex: academic-sophon"
              value={formState.applicationName}
              width="300px"
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
            <Spacer y={0.5} />
            <Text color="helper">
              Add services to this application.
            </Text>
            <Spacer y={1} />
            SOME MORE STUFF HERE
          </>,
          <>
            <Text size={16}>Services</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Add services to this application.
            </Text>
            <Spacer y={1} />
            SOME MORE STUFF HERE
          </>
        ]}
      />
      <Spacer height="80px" />
    </StyledConfigureTemplate>
  );
};

export default withRouter(NewAppFlow);

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
  width: 100%;
  height: 100%;
`;

