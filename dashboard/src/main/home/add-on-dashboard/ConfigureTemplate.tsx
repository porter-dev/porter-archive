import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import _ from "lodash";

import { hardcodedNames, hardcodedIcons } from "shared/hardcodedNameDict";

import Back from "components/porter/Back";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import { Context } from "shared/Context";
import api from "shared/api";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import VerticalSteps from "components/porter/VerticalSteps";

type Props = {
  goBack: () => void;
  currentTemplate: any;
};

const ConfigureTemplate: React.FC<Props> = ({
  goBack,
  currentTemplate,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [name, setName] = useState<string>("");

  return (
    <StyledConfigureTemplate>
      <Back onClick={goBack} />
      <DashboardHeader
        prefix={
          <Icon 
            src={hardcodedIcons[currentTemplate.name] || currentTemplate.icon}
          />
        }
        title={`Configure new ${hardcodedNames[currentTemplate.name] || currentTemplate.name} instance`}
        capitalize={false}
        disableLineBreak
      />
      <DarkMatter />
      <VerticalSteps
        currentStep={currentStep}
        steps={[
          <>
            <Text size={16}>Add-on name</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Randomly generated if left blank (lowercase letters, numbers, and "-" only).
            </Text>
            <Spacer height="20px" />
            <Input
              placeholder="ex: academic-sophon"
              value={name}
              width="300px"
              setValue={(e) => {
                if (e) {
                  setCurrentStep(1);
                } else {
                  setCurrentStep(0);
                }
                setName(e);
              }}
            />
          </>,
          <>
            <Text size={16}>Add-on settings</Text>
            <Spacer y={0.5} />
            <Text color="helper">
            Configure settings for this add-on.
            </Text>
            <Spacer height="20px" />
            THIS IS WHERE THE FORM GOES
          </>
        ]}
      />
    </StyledConfigureTemplate>
  );
};

export default ConfigureTemplate;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

const Icon = styled.img`
  margin-right: 15px;
  height: 30px;
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