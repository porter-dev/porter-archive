import React, { useEffect, useState, useContext } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import notFound from "assets/not-found.png";

import Fieldset from "components/porter/Fieldset";
import Loading from "components/Loading";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import Back from "components/porter/Back";
import TabSelector from "components/TabSelector";

type Props = RouteComponentProps & {
};

const ExpandedApp: React.FC<Props> = ({
  ...props
}) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [appData, setAppData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("events");
  const [isExpanded, setIsExpanded] = useState(false);

  const getPorterApp = async () => {
    setIsLoading(true);
    const { appName } = props.match.params as any;
    try {
      const resPorterApp = await api.getPorterApp(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          name: appName,
        }
      );
      const resChartData = await api.getChart(
        "<token>",
        {},
        {
          id: currentProject.id,
          namespace: `porter-stack-${appName}`,
          cluster_id: currentCluster.id,
          name: appName,
          revision: 0,
        }
      );
      setAppData({
        app: resPorterApp?.data,
        chart: resChartData?.data,
      });
      setIsLoading(false);
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (currentCluster) {
      getPorterApp();
    }
  }, [currentCluster]);

  const renderTabContents = () => {
    switch (tab) {
      case "overview":
        return (
          <div>TODO: service list</div>
        );
      case "build-settings":
        return (
          <div>TODO: build settings</div>
        );
      case "settings":
        return (
          <div>TODO: stack deletion</div>
        )
      default:
        return (
          <div>dream on</div>
        )
    }
  };

  return (
    <StyledExpandedApp>
      {isLoading && (
        <Loading />
      )}
      {!appData && !isLoading && (
        <Placeholder>
          <Container row>
            <PlaceholderIcon src={notFound} />
            <Text color="helper">
              No application matching "{(props.match.params as any).appName}" was found.
            </Text>
          </Container>
          <Spacer y={1} />
          <Link to="/apps">Return to dashboard</Link> 
        </Placeholder>
      )}
      {appData && (
        <>
          <Back to="/apps" />
          <Container row>
            <Icon src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg" />
            <Text size={21}>
              {appData.name}
            </Text>
            <Spacer inline x={1} />
            <Text size={13}>
              repo: porter-dev/porter
            </Text>
            <Spacer inline x={1} />
            <Text size={13}>
              branch: main
            </Text>
          </Container>
          <Spacer y={1} />
          <Text color="helper">
            Last updated 2 days ago
          </Text>
          <Spacer y={1} />
          <TabSelector
            options={[
              { label: "Events", value: "events" },
              { label: "Logs", value: "logs" },
              { label: "Metrics", value: "metrics" },
              { label: "Overview", value: "overview" },
              { label: "Build settings", value: "build-settings" },
              { label: "Settings", value: "settings" },
            ]}
            currentTab={tab}
            setCurrentTab={setTab}
          />
          <Spacer y={1} />
          {renderTabContents()}
        </>
      )}
    </StyledExpandedApp>
  );
};

export default withRouter(ExpandedApp);

const Icon = styled.img`
  height: 24px;
  margin-right: 15px;
`;

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 13px;
`;

const StyledExpandedApp = styled.div`
  width: 100%;
  height: 100%;
`;