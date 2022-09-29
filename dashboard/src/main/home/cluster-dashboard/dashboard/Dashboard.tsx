import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import TabSelector from "components/TabSelector";
import TitleSection from "components/TitleSection";
import api from "shared/api";

import NodeList from "./NodeList";

import { NamespaceList } from "./NamespaceList";
import ClusterSettings from "./ClusterSettings";
import useAuth from "shared/auth/useAuth";
import Metrics from "./Metrics";
import { useLocation } from "react-router";
import { getQueryParam } from "shared/routing";
import IncidentsTab from "./incidents/IncidentsTab";

import CopyToClipboard from "components/CopyToClipboard";
import Loading from "components/Loading";

import { DetailedIngressError } from "shared/types";

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
  const [ingressIp, setIngressIp] = useState(null);
  const [ingressError, setIngressError] = useState(null);

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

  // Need to reset tab to reset views that don't auto-update on cluster switch (esp namespaces + settings)
  useEffect(() => {
    setCurrentTab("nodes");
  }, [context.currentCluster]);

  const renderIngressIp = (
    ingressIp: string | undefined,
    ingressError: DetailedIngressError
  ) => {
    if (typeof ingressIp !== "string") {
      return (
        <Url onClick={(e) => e.preventDefault()}>
          <Loading />
        </Url>
      );
    }

    if (!ingressIp.length && ingressError) {
      return (
        <>
          <Bolded>Ingress IP:</Bolded>
          <span>{ingressError.message}</span>
        </>
      );
    }

    if (!ingressIp.length) {
      return (
        <>
          <Bolded>Ingress IP:</Bolded>
          <span>Ingress IP not available</span>
        </>
      );
    }

    return (
      <CopyToClipboard
        as={Url}
        text={ingressIp}
        wrapperProps={{ onClick: (e: any) => e.stopPropagation() }}
      >
        <Bolded>Ingress IP:</Bolded>
        <span>{ingressIp}</span>
        <i className="material-icons-outlined">content_copy</i>
      </CopyToClipboard>
    );
  };

  const updateClusterWithDetailedData = async () => {
    try {
      const res = await api.getCluster(
        "<token>",
        {},
        {
          project_id: context.currentProject.id,
          cluster_id: context.currentCluster.id,
        }
      );
      if (res.data) {
        const { ingress_ip, ingress_error } = res.data;
        setIngressIp(ingress_ip);
        setIngressError(ingress_error);
      }
    } catch (error) {}
  };

  useEffect(() => {
    updateClusterWithDetailedData();
  }, []);

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
        <Description>{renderIngressIp(ingressIp, ingressError)}</Description>
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
  height: 35px;
  min-width: 35px;
  width: 35px;
  border-radius: 5px;
  margin-right: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;
  > i {
    font-size: 18px;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #8b949f;
  margin-top: 13px;
  margin-left: 2px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #8b949f;
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

const Url = styled.a`
  font-size: 13px;
  user-select: text;
  font-weight: 400;
  display: flex;
  align-items: center;
  cursor: pointer;
  > i {
    margin-left: 10px;
    font-size: 15px;
  }

  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const Bolded = styled.span`
  color: #8b949f;
  margin-right: 6px;
  white-space: nowrap;
`;
