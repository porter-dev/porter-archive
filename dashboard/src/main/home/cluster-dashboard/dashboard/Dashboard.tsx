import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import TabSelector from "components/TabSelector";

import NodeList from "./NodeList";

import { NamespaceList } from "./NamespaceList";
import ClusterSettings from "./ClusterSettings";
import useAuth from "shared/auth/useAuth";

type TabEnum = "nodes" | "settings" | "namespaces";

const tabOptions: {
  label: string;
  value: TabEnum;
}[] = [
  { label: "Nodes", value: "nodes" },
  { label: "Namespaces", value: "namespaces" },
  { label: "Settings", value: "settings" },
];

export const Dashboard: React.FunctionComponent = () => {
  const [currentTab, setCurrentTab] = useState<TabEnum>("nodes");
  const [currentTabOptions, setCurrentTabOptions] = useState(tabOptions);
  const [isAuthorized] = useAuth();

  const context = useContext(Context);
  const renderTab = () => {
    switch (currentTab) {
      case "settings":
        return <ClusterSettings />;
      case "namespaces":
        return <NamespaceList />;
      case "nodes":
      default:
        return <NodeList />;
    }
  };

  useEffect(() => {
    setCurrentTabOptions(
      tabOptions.filter((option) => {
        if (option.value === "settings") {
          return isAuthorized("cluster", "", ["get", "delete"]);
        }
        return true;
      })
    );
  }, [isAuthorized]);

  return (
    <>
      <TitleSection>
        <DashboardIcon>
          <i className="material-icons">device_hub</i>
        </DashboardIcon>
        <Title>{context.currentCluster.name}</Title>
      </TitleSection>

      <InfoSection>
        <TopRow>
          <InfoLabel>
            <i className="material-icons">info</i> Info
          </InfoLabel>
        </TopRow>
        <Description>
          Cluster dashboard for {context.currentCluster.name}
        </Description>
      </InfoSection>

      <TabSelector
        options={currentTabOptions}
        currentTab={currentTab}
        setCurrentTab={(value: TabEnum) => setCurrentTab(value)}
      />

      {renderTab()}
    </>
  );
};

const DashboardIcon = styled.div`
  height: 45px;
  min-width: 45px;
  width: 45px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;
  > i {
    font-size: 22px;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #aaaabb;
  margin-top: 13px;
  margin-left: 2px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #7a838f;
  font-size: 13px;
  > i {
    color: #8b949f;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const InfoSection = styled.div`
  margin-top: 20px;
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
  margin-bottom: 35px;
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  margin-left: 18px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  height: 80px;
  margin-top: 10px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-left: 0px;

  > i {
    margin-left: 10px;
    cursor: pointer;
    font-size: 18px;
    color: #858faaaa;
    padding: 5px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
    margin-bottom: -3px;
  }
`;
