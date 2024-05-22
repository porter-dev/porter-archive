import React, { useMemo } from "react";
import Container from "legacy/components/porter/Container";
import Spacer from "legacy/components/porter/Spacer";
import StatusDot from "legacy/components/porter/StatusDot";
import Text from "legacy/components/porter/Text";
import _ from "lodash";
import pluralize from "pluralize";
import styled from "styled-components";

import { useClusterContext } from "./ClusterContextProvider";

const ClusterStatus: React.FC = () => {
  const { nodes, isClusterUpdating } = useClusterContext();

  const nodeInformation = useMemo(() => {
    const applicationNodes = nodes.filter(
      (n) => n.nodeGroupType === "APPLICATION"
    );
    const customNodes = nodes.filter((n) => n.nodeGroupType === "CUSTOM");
    if (!applicationNodes.length) {
      return;
    }
    return {
      APPLICATION: applicationNodes,
      CUSTOM: customNodes,
    };
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
        nodeInformation && (
          <>
            <StatusDot status={"available"} heightPixels={8} />
            <Spacer inline x={0.7} />
            <Text color="helper">
              Applications running on {nodeInformation.APPLICATION.length}{" "}
              <Code>
                {nodeInformation.APPLICATION[0].instanceType.displayName}
              </Code>{" "}
              {pluralize("instance", nodeInformation.APPLICATION.length)}
              {nodeInformation.CUSTOM.length !== 0 && (
                <>
                  {" and "}
                  {nodeInformation.CUSTOM.length}{" "}
                  <Code>
                    {nodeInformation.CUSTOM[0].instanceType.displayName}
                  </Code>{" "}
                  {pluralize("instance", nodeInformation.CUSTOM.length)}
                </>
              )}
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
