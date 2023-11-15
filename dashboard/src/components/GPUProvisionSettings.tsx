import React, { useContext, useState } from "react";
import {
  type EKSPreflightValues,
} from "@porter-dev/api-contracts";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";

import Heading from "components/form-components/Heading";

import { type ClusterState } from "shared/types";

import healthy from "assets/status-healthy.png";

import Button from "./porter/Button";

import Select from "./porter/Select";
import Spacer from "./porter/Spacer";
import Text from "./porter/Text";
import VerticalSteps from "./porter/VerticalSteps";
import PreflightChecks from "./PreflightChecks";
import InputSlider from "./porter/InputSlider";
import { Context } from "shared/Context";


const gpuMachineTypeOptions = [

  { value: "g4dn.xlarge", label: "g4dn.xlarge" },
  { value: "g4dn.2xlarge", label: "g4dn.2xlarge" },
];


type Props = RouteComponentProps & {
  handleClusterStateChange: <K extends keyof ClusterState>(key: K, value: ClusterState[K]) => void;
  clusterState: ClusterState;
  isReadOnly: boolean;
  isLoading: boolean;
  preflightData: EKSPreflightValues | null;
  preflightError: string | undefined;
  preflightFailed: boolean;
  showHelpMessage: boolean;
  showEmailMessage: boolean;
  proceedToProvision: () => void;
  getStatus: () => React.ReactNode;
  createCluster: () => void;
  preflightChecks: () => void;
  dismissPreflight: () => void;
  requestQuotasAndProvision: () => void;
};

const GPUProvisionerSettings: React.FC<Props> = ({
  handleClusterStateChange,
  isReadOnly,
  clusterState,
  preflightChecks,
  isLoading,
  preflightData,
  createCluster,
  preflightError,
  preflightFailed,
  showEmailMessage,
  showHelpMessage,
  proceedToProvision,
  dismissPreflight,
  getStatus,
  requestQuotasAndProvision,

}) => {
  const [gpuStep, setGPUStep] = useState(0);
  const {
    currentProject,
  } = useContext(Context);

  const renderGPUSettings = (): JSX.Element => {
    return (
      <VerticalSteps
        currentStep={gpuStep}
        onlyShowCurrentStep={true}
        steps={[
          <>
            <Heading isAtTop> Select GPU Instance Type </Heading>
            <Spacer y={.5} />
            <Select
              options={gpuMachineTypeOptions}
              width="350px"
              disabled={isReadOnly}
              value={clusterState.gpuInstanceType}
              setValue={(x: string) => {
                handleClusterStateChange("gpuInstanceType", x)
                // handleClusterStateChange("machineType", x)
              }
              }
              label="Machine type"
            />
            <Spacer y={1} />
            <InputSlider
              label="Max Instances: "
              unit="nodes"
              min={0}
              max={5}
              step={1}
              width="350px"
              disabled={isReadOnly || isLoading}
              value={clusterState.gpuMaxInstances.toString()}
              setValue={(x: number) => {
                handleClusterStateChange("gpuMaxInstances", x)

              }}
            />
            <Button onClick={() => {
              setGPUStep(1)
              preflightChecks();
            }}>
              Continue
            </Button>

            <Spacer y={.5} />
          </>,
          <>
            {showEmailMessage ?
              <>
                <CheckItemContainer>
                  <CheckItemTop>
                    <StatusIcon src={healthy} />
                    <Spacer inline x={1} />
                    <Text style={{ marginLeft: '10px', flex: 1 }}>{"Porter will request to increase quotas when you provision"}</Text>
                  </CheckItemTop>
                </CheckItemContainer>

              </> :
              <>
                <PreflightChecks provider='AWS' preflightData={preflightData} error={preflightError} />
                <Spacer y={.5} />
                {(preflightFailed && preflightData) &&
                  <>
                    {(showHelpMessage && currentProject?.quota_increase) ? <>
                      <Text color="helper">
                        Your account currently is blocked from provisioning in {clusterState.awsRegion} due to a quota limit imposed by AWS. Either change the region or request to increase quotas.
                      </Text>
                      <Spacer y={.5} />
                      <Text color="helper">
                        Porter can automatically request quota increases on your behalf and email you once the cluster is provisioned.
                      </Text>
                      <Spacer y={.5} />
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '15px' }}>
                        <Button
                          disabled={isLoading}
                          onClick={proceedToProvision}

                        >
                          Auto request increase
                        </Button>
                        <Button
                          disabled={isLoading}
                          onClick={dismissPreflight}
                          color="#313539"
                        >
                          I'll do it myself
                        </Button>
                      </div>

                    </> : (
                      <><Text color="helper">
                        Your account currently is blocked from provisioning in {clusterState.awsRegion} due to a quota limit imposed by AWS. Either change the region or request to increase quotas.
                      </Text><Spacer y={.5} /><Button
                        disabled={isLoading}
                        onClick={preflightChecks}

                      >
                          Retry checks
                        </Button></>)}
                  </>}
              </>}
            <Spacer y={1} />

            <StepChangeButtonsContainer>
              <Button
                disabled={isLoading}
                onClick={() => { setGPUStep(2); }}>Continue</Button>
              <Spacer inline x={0.5} />
              <Button onClick={() => { setGPUStep(0); }} color="#222222">Back</Button>
            </StepChangeButtonsContainer>

          </>, <>
            <Text size={16}>Provision your cluster</Text>
            <Spacer y={1} />
            {showEmailMessage && <>
              <Text color="helper">
                After your quota requests have been approved by AWS, Porter will email you when your cluster has been provisioned.
              </Text>
              <Spacer y={1} />
            </>}
            <StepChangeButtonsContainer>
              <Button
                disabled={(preflightFailed && !showEmailMessage) || isLoading}
                onClick={showEmailMessage ? requestQuotasAndProvision : createCluster}
                status={getStatus()}
              >
                Provision
              </Button>
              <Spacer inline x={0.5} />
              <Button onClick={() => { setGPUStep(1); }} color="#222222">Back</Button>
            </StepChangeButtonsContainer>
            <Spacer y={1} /></>
          ,

        ].filter((x) => x)}
      />
    );
  };
  return (
    <>
      {renderGPUSettings()}
    </>
  );
};

export default withRouter(GPUProvisionerSettings);


const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  cursor: ${(props) => (props.hasMessage ? "pointer" : "default")};
  background: ${(props) => props.theme.clickable.bg};
`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${(props) => props.theme.clickable.bg};
`;

const StatusIcon = styled.img`
  height: 14px;
`;

const StepChangeButtonsContainer = styled.div`
  display: flex;
`;