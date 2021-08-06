import React, { useContext, useEffect, useMemo, useState } from "react";
import { useHistory, useLocation, useParams } from "react-router";
import styled from "styled-components";
import backArrow from "assets/back_arrow.png";
import api from "shared/api";
import { Context } from "shared/Context";

import nodePng from "assets/node.png";
import TabSelector from "components/TabSelector";
import { pushFiltered } from "shared/routing";
import NodeUsage from "./NodeUsage";
import { ConditionsTable } from "./ConditionsTable";
import StatusSection from "components/StatusSection";
import TitleSection from "components/TitleSection";

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
    <StyledExpandedNodeView>
      <HeaderWrapper>
        <BackButton onClick={closeNodeView}>
          <BackButtonImg src={backArrow} />
        </BackButton>
        <TitleSection icon={nodePng}>
          {nodeId}
          <InstanceType>{instanceType}</InstanceType>
        </TitleSection>
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
    </StyledExpandedNodeView>
  );
};

export default ExpandedNodeView;

const BackButton = styled.div`
  position: absolute;
  top: 0px;
  right: 0px;
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;

const StatusWrapper = styled.div`
  margin-left: 3px;
  margin-bottom: 20px;
`;

const InstanceType = styled.div`
  font-weight: 400;
  color: #ffffff44;
  margin-left: 12px;
  font-size: 16px;
`;

const BodyWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const HeaderWrapper = styled.div`
  position: relative;
`;

const StyledExpandedNodeView = styled.div`
  width: 100%;
  z-index: 0;
  animation: fadeIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  display: flex;
  overflow-y: auto;
  padding-bottom: 120px;
  flex-direction: column;
  overflow: visible;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
