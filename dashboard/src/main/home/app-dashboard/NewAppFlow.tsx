import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import _ from "lodash";

import { hardcodedNames, hardcodedIcons } from "shared/hardcodedNameDict";
import { Context } from "shared/Context";
import api from "shared/api";
import { pushFiltered } from "shared/routing";
import web from "assets/web.png";

import Back from "components/porter/Back";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";
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

type Props = RouteComponentProps & {
};

const NewAppFlow: React.FC<Props> = ({
  ...props
}) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(1);

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
              Randomly generated if left blank (lowercase letters, numbers, and "-" only).
            </Text>
            <Spacer height="20px" />
            <Input
              placeholder="ex: academic-sophon"
              value=""
              width="300px"
              setValue={(e) => {}}
            />
          </>,
          <>
            <Text size={16}>Hello world</Text>
            <Spacer y={0.5} />
            <Text color="helper">
            Foo bar foo bar.
            </Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Randomly generated if left blank (lowercase letters, numbers, and "-" only).
            </Text>
            <Spacer height="20px" />
            <Input
              placeholder="ex: academic-sophon"
              value=""
              width="300px"
              setValue={(e) => {}}
            />
            <Spacer y={0.5} />
            <Text color="helper">
              Randomly generated if left blank (lowercase letters, numbers, and "-" only).
            </Text>
            <Spacer height="20px" />
            <Input
              placeholder="ex: academic-sophon"
              value=""
              width="300px"
              setValue={(e) => {}}
            />
          </>,
          <>
            <Text size={16}>Some settings</Text>
            <Spacer y={0.5} />
            <Text color="helper">
            Configure settings for this add-on.
            </Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Randomly generated if left blank (lowercase letters, numbers, and "-" only).
            </Text>
            <Spacer height="20px" />
            <Input
              placeholder="ex: academic-sophon"
              value=""
              width="300px"
              setValue={(e) => {}}
            />
            <Spacer y={0.5} />
            <Text color="helper">
              Randomly generated if left blank (lowercase letters, numbers, and "-" only).
            </Text>
            <Spacer height="20px" />
            <Input
              placeholder="ex: academic-sophon"
              value=""
              width="300px"
              setValue={(e) => {}}
            />
            <Spacer y={0.5} />
            <Text color="helper">
              Randomly generated if left blank (lowercase letters, numbers, and "-" only).
            </Text>
            <Spacer height="20px" />
            <Input
              placeholder="ex: academic-sophon"
              value=""
              width="300px"
              setValue={(e) => {}}
            />
          </>,
          <>
            <Text size={16}>More configuration</Text>
            <Spacer y={0.5} />
            <Text color="helper">
            Configure settings for this add-on.
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