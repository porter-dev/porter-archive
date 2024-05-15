import React, { useContext, useState } from "react";
import styled from "styled-components";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import DashboardHeader from "components/porter/DashboardHeader";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { Context } from "shared/Context";
import inferenceGrad from "assets/inference-grad.svg";

const PreviewEnvs: React.FC = () => {
  const { currentCluster } = useContext(Context);
  const [models, setModels] = useState<any[]>([]);

  const renderContents = () => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />;
    }

    if (models.length === 0) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>No ML models have been deployed yet</Text>
          <Spacer y={0.5} />

          <Text color={"helper"}>Get started by deploying a model.</Text>
          <Spacer y={1} />
          <Link to="/inference/models">
            <Button onClick={() => ({})} height="35px" alt>
              Deploy a new model <Spacer inline x={1} />{" "}
              <i className="material-icons" style={{ fontSize: "18px" }}>
                east
              </i>
            </Button>
          </Link>
        </DashboardPlaceholder>
      );
    }
  };

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={inferenceGrad}
        title={
          <Container row>
            Inference
            <Spacer inline x={1} />
            <Badge>Beta</Badge>
          </Container>
        }
        capitalize={false}
        description="Run open source ML models in your own cloud."
      />
      {renderContents()}
    </StyledAppDashboard>
  );
};

export default PreviewEnvs;

const Badge = styled.div`
  background: linear-gradient(60deg, #4b366d 0%, #6475b9 100%);
  color: white;
  border-radius: 3px;
  padding: 2px 5px;
  margin-right: -5px;
  font-size: 13px;
`;

const StyledAppDashboard = styled.div`
  width: 100%;
  height: 100%;
`;
