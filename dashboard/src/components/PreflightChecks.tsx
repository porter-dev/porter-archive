import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";

import { OFState } from "main/home/onboarding/state";
import api from "shared/api";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";

import SelectRow from "components/form-components/SelectRow";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "./form-components/InputRow";
import {
  Contract,
  EnumKubernetesKind,
  EnumCloudProvider,
  Cluster,
  GKE,
  GKENetwork,
  GKENodePool,
  GKENodePoolType
} from "@porter-dev/api-contracts";
import { ClusterType } from "shared/types";
import Button from "./porter/Button";
import Error from "./porter/Error";
import Spacer from "./porter/Spacer";
import Step from "./porter/Step";
import Link from "./porter/Link";
import Text from "./porter/Text";
import healthy from "assets/status-healthy.png";
import failure from "assets/failure.svg";
import Loading from "components/Loading";
import Placeholder from "./Placeholder";
import Fieldset from "./porter/Fieldset";
import ExpandableSection from "./porter/ExpandableSection";

const locationOptions = [
  { value: "us-east1", label: "us-east1" },
];

const defaultClusterNetworking = new GKENetwork({
  cidrRange: "10.78.0.0/16",
  controlPlaneCidr: "10.77.0.0/28",
  podCidr: "10.76.0.0/16",
  serviceCidr: "10.75.0.0/16",
});

const defaultClusterVersion = "1.25";


type Props = RouteComponentProps & {
  preflightData: any
};

const VALID_CIDR_RANGE_PATTERN = /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.0\.0\/16$/;

const PreflightChecks: React.FC<Props> = (props) => {
  const {
    user,
    currentProject,
    currentCluster,
    setCurrentCluster,
    setShouldRefreshClusters,
  } = useContext(Context);
  const [createStatus, setCreateStatus] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [region, setRegion] = useState(locationOptions[0].value);
  const [minInstances, setMinInstances] = useState(1);
  const [maxInstances, setMaxInstances] = useState(10);
  const [clusterNetworking, setClusterNetworking] = useState(defaultClusterNetworking);
  const [clusterVersion, setClusterVersion] = useState(defaultClusterVersion);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isClicked, setIsClicked] = useState(false);
  const [detected, setDetected] = useState<Detected | undefined>(undefined);
  const [preflightData, setPreflightData] = useState({})
  const [isLoading, setIsLoading] = useState(false);


  const PreflightCheckItem = ({ check }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasMessage = !!check.value.message;

    const handleToggle = () => {
      if (hasMessage) {
        setIsExpanded(!isExpanded);
      }
    }

    if (isLoading) {
      return <Loading />;
    }

    return (
      <CheckItemContainer hasMessage={hasMessage} onClick={handleToggle}>
        <CheckItemTop>
          {hasMessage ? <StatusIcon src={failure} /> : <StatusIcon src={healthy} />}
          <Spacer inline x={1} />
          <Text style={{ marginLeft: '10px', flex: 1 }}>{check.key}</Text>
          {hasMessage && <ExpandIcon className="material-icons" isExpanded={isExpanded}>
            arrow_drop_down
          </ExpandIcon>}
        </CheckItemTop>
        {isExpanded && hasMessage && (
          <>

            <Text>
              {check.value.message}
            </Text>

          </>
        )}
      </CheckItemContainer>
    );
  };



  return (
    <>


      {props.preflightData && (<>
        <AppearingDiv>

          <>
            {preflightData?.preflight_checks?.map((check: { key: React.Key | null | undefined; }) => (
              <PreflightCheckItem key={check.key} check={check} />
            ))}
            {/* 
            {preflightFailed && (
              <Button onClick={gcpIntegration}>
                Retry Preflight Check
              </Button>
            )
            } */}
          </>

        </AppearingDiv>
        <Spacer y={1} />

      </>
      )}
    </>
  );
};

export default withRouter(PreflightChecks);


const AppearingDiv = styled.div<{ color?: string }>`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  flex-direction: column; 
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
const StatusIcon = styled.img`
height: 14px;
`;

const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${props => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  cursor: ${props => (props.hasMessage ? 'pointer' : 'default')};
  background: ${props => props.theme.clickable.bg};

`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${props => props.theme.clickable.bg};
`;

const ExpandIcon = styled.i<{ isExpanded: boolean }>`
  margin-left: 8px;
  color: #ffffff66;
  font-size: 20px;
  cursor: pointer;
  border-radius: 20px;
  transform: ${props => props.isExpanded ? "" : "rotate(-90deg)"};
`;