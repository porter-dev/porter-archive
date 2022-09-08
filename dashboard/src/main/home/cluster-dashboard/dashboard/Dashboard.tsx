import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import TabSelector from "components/TabSelector";
import TitleSection from "components/TitleSection";

import NodeList from "./NodeList";

import { NamespaceList } from "./NamespaceList";
import ClusterSettings from "./ClusterSettings";
import useAuth from "shared/auth/useAuth";
import Metrics from "./Metrics";
import { useLocation } from "react-router";
import { getQueryParam } from "shared/routing";
import IncidentsTab from "./incidents/IncidentsTab";

type TabEnum = "nodes" | "settings" | "namespaces" | "metrics" | "incidents";

const tabOptions: {
  label: string;
  value: TabEnum;
}[] = [
  { label: "Nodes", value: "nodes" },
  /*
  { label: "Incidents", value: "incidents" },
  */
  { label: "Metrics", value: "metrics" },
  { label: "Namespaces", value: "namespaces" },
  { label: "Settings", value: "settings" },
];

export const Dashboard: React.FunctionComponent = () => {
  const [currentTab, setCurrentTab] = useState<TabEnum>("nodes");
  const [currentTabOptions, setCurrentTabOptions] = useState(tabOptions);
  const [isAuthorized] = useAuth();
  const location = useLocation();

  const context = useContext(Context);
  const renderTab = () => {
    switch (currentTab) {
      case "incidents":
        return <IncidentsTab />;
      case "settings":
        return <ClusterSettings />;
      case "metrics":
        return <Metrics />;
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

  useEffect(() => {
    const selectedTab = getQueryParam({ location }, "selected_tab");
    if (tabOptions.find((tab) => tab.value === selectedTab)) {
      setCurrentTab(selectedTab as any);
    }
  }, [location]);

  return (
    <>
      <TitleSection>
        <DashboardIcon>
          <i className="material-icons">device_hub</i>
        </DashboardIcon>
        {context.currentCluster.name}
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
  margin-right: 17px;
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
  margin-top: 36px;
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
  margin-bottom: 35px;
`;
