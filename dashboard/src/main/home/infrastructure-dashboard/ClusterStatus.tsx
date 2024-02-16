import React, { useMemo } from "react";
import pluralize from "pluralize";
import styled from "styled-components";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";

import { useClusterContext } from "./ClusterContextProvider";

const ClusterStatus: React.FC = () => {
  const { nodes, isClusterUpdating } = useClusterContext();

  const applicationNodes = useMemo(() => {
    return nodes.filter((n) => n.nodeGroupType === "APPLICATION");
  }, [nodes]);

  return (
    <Container row style={{ flexShrink: 0 }}>
      <Spacer inline x={0.2} />
      {isClusterUpdating ? (
        <>
          <StatusDot status={"pending"} heightPixels={8} />
          <Spacer inline x={0.7} />
          <Text color="helper">Updating</Text>
        </>
      ) : (
        applicationNodes.length !== 0 && (
          <>
            <StatusDot status={"available"} heightPixels={8} />
            <Spacer inline x={0.7} />
            <Text color="helper">
              Applications using {applicationNodes.length}{" "}
              <Code>{applicationNodes[0].instanceType}</Code>{" "}
              {pluralize("instance", applicationNodes.length)}
            </Text>
          </>
        )
      )}
    </Container>
  );
};

export default ClusterStatus;

const Code = styled.span`
  font-family: monospace;
  font-size: 12px;
`;
