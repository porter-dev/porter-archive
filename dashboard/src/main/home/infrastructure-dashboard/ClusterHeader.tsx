import React from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";

import { readableDate } from "shared/string_utils";

import { useClusterContext } from "./ClusterContextProvider";

const ClusterHeader: React.FC = () => {
  const { cluster } = useClusterContext();

  return (
    <>
      <Container row>
        <Icon src={cluster.cloud_provider.icon} height="22px" />
        <Spacer inline x={1} />
        <Text size={21}>{cluster.vanity_name}</Text>
      </Container>
      <Spacer y={0.5} />
      <CreatedAtContainer>
        <Container row>
          <Spacer inline x={0.2} />
          <StatusDot
            status={cluster.status === "READY" ? "available" : "pending"}
            heightPixels={8}
          />
          <Spacer inline x={0.7} />
          <Text color="helper">
            {cluster.status === "READY" ? "Running" : "Updating"}
          </Text>
          <Spacer inline x={1} />
        </Container>
        <div style={{ flexShrink: 0 }}>
          <Text color="#aaaabb66">
            Updated {readableDate(cluster.contract.updated_at)}
          </Text>
        </div>
        <Spacer y={0.5} />
      </CreatedAtContainer>
    </>
  );
};

export default ClusterHeader;

const CreatedAtContainer = styled.div`
  display: inline-flex;
  column-gap: 6px;
`;
