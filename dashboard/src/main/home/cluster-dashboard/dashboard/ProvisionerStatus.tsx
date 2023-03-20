import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import aws from "assets/aws.png";
import api from "shared/api";
import loading from "assets/loading.gif";

import { Context } from "shared/Context";
import ExpandableSection from "components/porter/ExpandableSection";
import LoadingBar from "components/porter/LoadingBar";
import Spacer from "components/porter/Spacer";
import Helper from "components/form-components/Helper";
import Text from "components/porter/Text";

type Props = {
  provisionFailureReason: string;
};

const ProvisionerStatus: React.FC<Props> = ({
  provisionFailureReason,
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [progress, setProgress] = useState(1);

  // Continuously poll provisioning status
  const pollProvisioningStatus = async () => {
    try {
      const res = await api.getClusterState(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
      const { status } = res.data;
      console.log("status", status);
      switch (status) {
        case status["BOOTSTRAP_READY"]:
          setProgress(2);
          break;
        case status["CONTROL_PLANE_READY"]:
          setProgress(3);
          break;
        case status["INFRASTRUCTURE_READY"]:
          setProgress(4);
          break;
        default:
          setProgress(1);
      }
    } catch (err) {
      console.log("hello", err);
    }
  };

  useEffect(() => {
    pollProvisioningStatus(); 
  }, []);

  return (
    <StyledProvisionerStatus>
      <HeaderSection>
        <Flex>
          <Icon src={aws} />
          AWS provisioning status
        </Flex>
        <Spacer height="18px" />
        <LoadingBar
          color={provisionFailureReason && "failed"}
          completed={progress} 
          total={5} 
        />
        <Spacer height="18px" />
        <Text color="#aaaabb">
          Setup can take up to 20 minutes. You can close this window and come back later. 
        </Text>
      </HeaderSection>
      {
        provisionFailureReason && (
          <DummyLogs>Error: {provisionFailureReason}</DummyLogs>
        )
      }
    </StyledProvisionerStatus>
  );
};

export default ProvisionerStatus;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const HeaderSection = styled.div`
  padding: 15px;
  padding-bottom: 18px;
`;

const DummyLogs = styled.div`
  padding: 15px;
  width: 100%;
  display: flex;
  font-size: 13px;
  background: #101420;
  font-family: monospace;
`;

const Icon = styled.img`
  height: 16px;
  margin-right: 10px;
  margin-bottom: -1px;
`;

const Img = styled.img`
  height: 15px;
  margin-right: 7px;
`;

const Status = styled.div`
  color: #aaaabb;
  display: flex;
  align-items: center;
  margin-left: 15px;
`;

const StyledProvisionerStatus = styled.div`
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  font-size: 13px;
  width: 100%;
  overflow: hidden;
`;