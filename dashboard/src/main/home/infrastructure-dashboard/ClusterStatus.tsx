import React from "react";
import pluralize from "pluralize";
import styled from "styled-components";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";

import { useClusterContext } from "./ClusterContextProvider";

const ClusterStatus: React.FC = () => {
  const { cluster, applicationNodes } = useClusterContext();

  return (
    <Container row style={{ flexShrink: 0 }}>
      <Spacer inline x={0.2} />
      <StatusDot
        status={cluster.status === "READY" ? "available" : "pending"}
        heightPixels={8}
      />
      <Spacer inline x={0.7} />
      {cluster.status === "READY" ? (
        <Text color="helper">
          Applications using {applicationNodes.length}{" "}
          <Code>
            {applicationNodes[0]?.labels["node.kubernetes.io/instance-type"]}
          </Code>{" "}
          {pluralize("instance", applicationNodes.length)}
        </Text>
      ) : (
        <Text color="helper">Updating</Text>
      )}
    </Container>
  );
};

export default ClusterStatus;

const Code = styled.span`
  font-family: monospace;
  font-size: 12px;
`;
