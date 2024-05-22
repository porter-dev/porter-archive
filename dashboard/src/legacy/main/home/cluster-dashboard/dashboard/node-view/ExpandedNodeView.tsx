import React, { useContext, useEffect, useMemo, useState } from "react";
import leftArrow from "legacy/assets/left-arrow.svg";
import nodePng from "legacy/assets/node.png";
import StatusSection from "legacy/components/StatusSection";
import TabSelector from "legacy/components/TabSelector";
import TitleSection from "legacy/components/TitleSection";
import api from "legacy/shared/api";
import { pushFiltered } from "legacy/shared/routing";
import { useHistory, useLocation, useParams } from "react-router";
import styled from "styled-components";

import { Context } from "shared/Context";

import { ConditionsTable } from "./ConditionsTable";
import NodeUsage from "./NodeUsage";

type ExpandedNodeViewParams = {
  nodeId: string;
};

type TabEnum = "conditions";

const tabOptions: Array<{
  label: string;
  value: TabEnum;
}> = [{ label: "Conditions", value: "conditions" }];

export const ExpandedNodeView = () => {
  const { nodeId } = useParams<ExpandedNodeViewParams>();
  const history = useHistory();
  const location = useLocation();
  const { currentCluster, currentProject } = useContext(Context);
  const [node, setNode] = useState(undefined);
  const [currentTab, setCurrentTab] = useState("conditions");

  useEffect(() => {
    const isSubscribed = true;
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
  }, [nodeId, currentCluster.id, currentProject.id]);

  const closeNodeView = () => {
    pushFiltered({ history, location }, "/cluster-dashboard", []);
  };

  const instanceType = useMemo(() => {
    const instanceType = node?.labels?.["node.kubernetes.io/instance-type"];
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
    if (!node?.node_conditions) {
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
      <BreadcrumbRow>
        <Breadcrumb onClick={closeNodeView}>
          <ArrowIcon src={leftArrow} />
          <Wrap>Back</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <HeaderWrapper>
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
          setCurrentTab={(value: TabEnum) => {
            setCurrentTab(value);
          }}
        />
        {currentTabPage}
      </BodyWrapper>
    </StyledExpandedNodeView>
  );
};

export default ExpandedNodeView;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
`;

const Breadcrumb = styled.div`
  color: #aaaabb88;
  font-size: 13px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  margin-top: -10px;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const Wrap = styled.div`
  z-index: 999;
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
