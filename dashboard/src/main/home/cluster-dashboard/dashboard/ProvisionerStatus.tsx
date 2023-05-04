import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import aws from "assets/aws.png";
import api from "shared/api";

import { Context } from "shared/Context";
import LoadingBar from "components/porter/LoadingBar";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Button from "components/porter/Button";

type Props = {
  provisionFailureReason: string;
};

const PROVISIONING_STATUS_POLL_INTERVAL = 60 * 1000; // poll every minute

const ProvisionerStatus: React.FC<Props> = ({ provisionFailureReason }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [progress, setProgress] = useState<number>(1);

  // Continuously poll provisioning status and cluster status
  const pollProvisioningAndClusterStatus = async () => {
    if (currentProject && currentCluster) {
      try {
        const resState = await api.getClusterState(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        );
        const {
          is_control_plane_ready,
          is_infrastructure_ready,
          phase,
        } = resState.data;
        let newProgress = 1;
        if (is_control_plane_ready) {
          newProgress += 1;
        }
        if (is_infrastructure_ready) {
          newProgress += 1;
        }
        if (phase === "Provisioned") {
          newProgress += 1;
        }
        setProgress(newProgress);
        if (newProgress >= 4) {
          const resStatus = await api.getCluster(
            "<token>",
            {},
            {
              project_id: currentProject.id,
              cluster_id: currentCluster.id,
            }
          );
          const status = resStatus.data.status;
          if (status === "READY") {
            window.location.reload();
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
  };

  useEffect(() => {
    const intervalId = setInterval(
      pollProvisioningAndClusterStatus,
      PROVISIONING_STATUS_POLL_INTERVAL
    );
    pollProvisioningAndClusterStatus();
    return () => clearInterval(intervalId);
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
          color={provisionFailureReason ? "failed" : undefined}
          completed={progress}
          total={5}
        />
        <Spacer height="18px" />
        <Text color="#aaaabb">
          Setup can take up to 20 minutes. You can close this window and come
          back later.
        </Text>
      </HeaderSection>
      {provisionFailureReason && (
        <DummyLogs>Error: {provisionFailureReason}</DummyLogs>
      )}
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

const StyledProvisionerStatus = styled.div`
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  font-size: 13px;
  width: 100%;
  overflow: hidden;
`;
