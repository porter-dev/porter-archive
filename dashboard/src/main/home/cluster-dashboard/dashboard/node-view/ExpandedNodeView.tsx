import React, { useContext, useEffect, useMemo, useState } from "react";
import { useHistory, useLocation, useParams } from "react-router";
import styled from "styled-components";
import closeImg from "assets/close.png";
import api from "shared/api";
import { Context } from "shared/Context";

import nodePng from "assets/node.png";
import TabSelector from "components/TabSelector";
import { pushFiltered } from "shared/routing";
import NodeUsage from "./NodeUsage";
import { ConditionsTable } from "./ConditionsTable";
import StatusSection from "components/StatusSection";

type ExpandedNodeViewParams = {
  nodeId: string;
};

type TabEnum = "conditions";

const tabOptions: {
  label: string;
  value: TabEnum;
}[] = [{ label: "Conditions", value: "conditions" }];

export const ExpandedNodeView = () => {
  const { nodeId } = useParams<ExpandedNodeViewParams>();
  const history = useHistory();
  const location = useLocation();
  const { currentCluster, currentProject } = useContext(Context);
  const [node, setNode] = useState(undefined);
  const [currentTab, setCurrentTab] = useState("conditions");

  useEffect(() => {
    let isSubscribed = true;
    api
      .getClusterNode(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          nodeName: nodeId,
        }
      )
      .then((res) => {
        if (isSubscribed) {
          setNode(res.data);
        }
      });

    return () => (isSubscribed = false);
  }, [nodeId, currentCluster.id, currentProject.id]);

  const closeNodeView = () => {
    pushFiltered({ history, location }, "/cluster-dashboard", []);
  };

  const instanceType = useMemo(() => {
    const instanceType =
      node?.labels && node?.labels["node.kubernetes.io/instance-type"];
    if (instanceType) {
      return ` (${instanceType})`;
    }
    return "";
  }, [node?.labels]);

  const currentTabPage = useMemo(() => {
    switch (currentTab) {
      case "conditions":
      default:
        return <ConditionsTable node={node} />;
    }
  }, [currentTab, node]);

  const nodeStatus = useMemo(() => {
    if (!node || !node.node_conditions) {
      return "loading";
    }

    return node.node_conditions.reduce((prevValue: boolean, current: any) => {
      if (current.type !== "Ready" && current.status !== "False") {
        return "failed";
      }
      if (current.type === "Ready" && current.status !== "True") {
        return "failed";
      }
      return prevValue;
    }, "healthy");
  }, [node]);

  return (
    <>
      <CloseOverlay onClick={closeNodeView} />
      <StyledExpandedChart>
        <HeaderWrapper>
          <TitleSection>
            <Title>
              <IconWrapper>
                <img src={nodePng} />
              </IconWrapper>
              {nodeId}
              <InstanceType>{instanceType}</InstanceType>
            </Title>
          </TitleSection>

          <CloseButton onClick={closeNodeView}>
            <CloseButtonImg src={closeImg} />
          </CloseButton>
        </HeaderWrapper>
        <BodyWrapper>
          <NodeUsage node={node} />

          <StatusWrapper>
            <StatusSection status={nodeStatus} />
          </StatusWrapper>

          <TabSelector
            options={tabOptions}
            currentTab={currentTab}
            setCurrentTab={(value: TabEnum) => setCurrentTab(value)}
          />
          {currentTabPage}
        </BodyWrapper>
      </StyledExpandedChart>
    </>
  );
};

export default ExpandedNodeView;

const StatusWrapper = styled.div`
  margin-left: 3px;
  margin-bottom: 15px;
`;

const InstanceType = styled.div`
  font-weight: 400;
  color: #ffffff44;
  margin-left: 12px;
`;

const BodyWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const HeaderWrapper = styled.div``;

const CloseOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #202227;
  animation: fadeIn 0.2s 0s;
  opacity: 0;
  animation-fill-mode: forwards;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const IconWrapper = styled.div`
  font-size: 16px;
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 3px;
  margin-right: 12px;

  > img {
    filter: brightness(50%);
    width: 18px;
  }
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
  user-select: text;
`;

const TitleSection = styled.div`
  width: 100%;
  position: relative;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledExpandedChart = styled.div`
  width: calc(100% - 50px);
  height: calc(100% - 50px);
  z-index: 0;
  position: absolute;
  top: 25px;
  left: 25px;
  border-radius: 10px;
  background: #26272f;
  box-shadow: 0 5px 12px 4px #00000033;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  padding: 25px;
  display: flex;
  overflow: hidden;
  flex-direction: column;

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
