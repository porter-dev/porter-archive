import React, { useContext, useEffect, useState } from "react";
import { get, isEmpty } from "lodash";
import styled from "styled-components";

import leftArrow from "assets/left-arrow.svg";
import KeyValueArray from "components/form-components/KeyValueArray";
import Loading from "components/Loading";
import TabRegion, { TabOption } from "components/TabRegion";
import TitleSection from "components/TitleSection";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";
import DeploymentType from "../DeploymentType";
import JobMetricsSection from "../metrics/JobMetricsSection";
import Logs from "../status/Logs";
import { useRouting } from "shared/routing";
import LogsSection from "../logs-section/LogsSection";
import EventsTab from "../events/EventsTab";

const readableDate = (s: string) => {
  let ts = new Date(s);
  let date = ts.toLocaleDateString();
  let time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} on ${date}`;
};

const getLatestPod = (pods: any[]) => {
  if (!Array.isArray(pods)) {
    return undefined;
  }

  return [...pods]
    .sort((a: any, b: any) => {
      if (!a?.metadata?.creationTimestamp) {
        return 1;
      }

      if (!b?.metadata?.creationTimestamp) {
        return -1;
      }

      return (
        new Date(b?.metadata?.creationTimestamp).getTime() -
        new Date(a?.metadata?.creationTimestamp).getTime()
      );
    })
    .shift();
};

const renderStatus = (job: any, time: string) => {
  if (job.status?.succeeded >= 1) {
    return <Status color="#38a88a">Succeeded {time}</Status>;
  }

  if (job.status?.failed >= 1) {
    return <Status color="#cc3d42">Failed</Status>;
  }

  return <Status color="#ffffff11">Running</Status>;
};

type ExpandedJobRunTabs = "events" | "logs" | "metrics" | "config" | string;

const ExpandedJobRun = ({
  currentChart,
  jobRun,
  onClose,
}: {
  currentChart: ChartType;
  jobRun: any;
  onClose: () => void;
}) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [currentTab, setCurrentTab] = useState<ExpandedJobRunTabs>(
    currentCluster.agent_integration_enabled ? "events" : "logs"
  );
  const [pods, setPods] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { pushQueryParams } = useRouting();
  const [useDeprecatedLogs, setUseDeprecatedLogs] = useState(false);

  let chart = currentChart;
  let run = jobRun;

  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);
    api
      .getJobPods(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: jobRun.metadata?.name,
          cluster_id: currentCluster.id,
          namespace: jobRun.metadata?.namespace,
        }
      )
      .then((res) => {
        if (isSubscribed) {
          setPods(res.data);
          setIsLoading(false);
        }
      })
      .catch((err) => setCurrentError(JSON.stringify(err)));

    return () => {
      isSubscribed = false;
    };
  }, [jobRun]);

  useEffect(() => {
    return () => {
      pushQueryParams({}, ["job"]);
    };
  }, []);

  const renderConfigSection = (job: any) => {
    let commandString = job?.spec?.template?.spec?.containers[0]?.command?.join(
      " "
    );
    let envArray = job?.spec?.template?.spec?.containers[0]?.env;
    let envObject = {} as any;
    envArray &&
      envArray.forEach((env: any, i: number) => {
        const secretName = get(env, "valueFrom.secretKeyRef.name");
        envObject[env.name] = secretName
          ? `PORTERSECRET_${secretName}`
          : env.value;
      });

    // Handle no config to show
    if (!commandString && isEmpty(envObject)) {
      return <Placeholder>No config was found.</Placeholder>;
    }

    let tag = job.spec.template.spec.containers[0].image.split(":")[1];
    return (
      <ConfigSection>
        {commandString ? (
          <>
            Command: <Command>{commandString}</Command>
          </>
        ) : (
          <DarkMatter size="-18px" />
        )}
        <Row>
          Image Tag: <Command>{tag}</Command>
        </Row>
        {!isEmpty(envObject) && (
          <>
            <KeyValueArray
              envLoader={true}
              values={envObject}
              label="Environment variables:"
              disabled={true}
            />
            <DarkMatter />
          </>
        )}
      </ConfigSection>
    );
  };

  const renderEventsSection = () => {
    return (
      <EventsTab
        currentChart={currentChart}
        overridingJobName={jobRun.metadata?.name}
        setLogData={() => setCurrentTab("logs")}
      />
    );
  };

  const renderLogsSection = () => {
    if (useDeprecatedLogs || !currentCluster.agent_integration_enabled) {
      return (
        <JobLogsWrapper>
          <Logs
            selectedPod={pods[0]}
            podError={!pods[0] ? "Pod no longer exists." : ""}
            rawText={true}
          />
        </JobLogsWrapper>
      );
    }

    return (
      <JobLogsWrapper>
        <DeprecatedWarning>
          Not seeing your logs? Switch back to{" "}
          <DeprecatedSelect
            onClick={() => {
              setUseDeprecatedLogs(true);
            }}
          >
            {" "}
            deprecated logging.
          </DeprecatedSelect>
        </DeprecatedWarning>
        <LogsSection
          isFullscreen={false}
          setIsFullscreen={() => {}}
          overridingPodName={pods[0]?.metadata?.name || jobRun.metadata?.name}
          currentChart={currentChart}
        />
      </JobLogsWrapper>
    );
  };

  if (isLoading) {
    return <Loading />;
  }

  let options: TabOption[] = [];

  if (currentCluster.agent_integration_enabled) {
    options.push({
      label: "Events",
      value: "events",
    });
  }

  options.push(
    {
      label: "Logs",
      value: "logs",
    },
    {
      label: "Metrics",
      value: "metrics",
    },
    {
      label: "Config",
      value: "config",
    }
  );

  return (
    <StyledExpandedChart>
      <BreadcrumbRow>
        <Breadcrumb onClick={onClose}>
          <ArrowIcon src={leftArrow} />
          <Wrap>Back</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <HeaderWrapper>
        <TitleSection icon={currentChart.chart.metadata.icon} iconWidth="33px">
          {chart.name} <Gray>at {readableDate(run.status.startTime)}</Gray>
        </TitleSection>
        <InfoWrapper>
          <LastDeployed>
            {renderStatus(
              run,
              run.status.completionTime
                ? readableDate(run.status.completionTime)
                : ""
            )}
            <TagWrapper>
              Namespace <NamespaceTag>{chart.namespace}</NamespaceTag>
            </TagWrapper>
            <DeploymentType currentChart={currentChart} />
          </LastDeployed>
        </InfoWrapper>
      </HeaderWrapper>
      <BodyWrapper>
        <TabRegion
          currentTab={currentTab}
          setCurrentTab={(newTab: string) => {
            setCurrentTab(newTab);
          }}
          options={options}
        >
          {currentTab === "events" && renderEventsSection()}
          {currentTab === "logs" && renderLogsSection()}
          {currentTab === "config" && <>{renderConfigSection(run)}</>}
          {currentTab === "metrics" && (
            <JobMetricsSection jobChart={currentChart} jobRun={run} />
          )}
        </TabRegion>
      </BodyWrapper>
    </StyledExpandedChart>
  );
};

export default ExpandedJobRun;

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

const Row = styled.div`
  margin-top: 20px;
`;

const DarkMatter = styled.div<{ size?: string }>`
  width: 100%;
  margin-bottom: ${(props) => props.size || "-13px"};
`;

const Command = styled.span`
  font-family: monospace;
  color: #aaaabb;
  margin-left: 7px;
`;

const ConfigSection = styled.div`
  padding: 20px 30px 30px;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
  border-radius: 8px;
  background: #ffffff08;
`;

const JobLogsWrapper = styled.div`
  min-height: 450px;
  height: 65vh;
  width: 100%;
  border-radius: 8px;
  overflow-y: auto;
`;

const Status = styled.div<{ color: string }>`
  padding: 5px 10px;
  background: ${(props) => props.color};
  font-size: 13px;
  border-radius: 3px;
  height: 25px;
  color: #ffffff;
  margin-bottom: -3px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Gray = styled.div`
  color: #ffffff44;
  margin-left: 15px;
  font-weight: 400;
  font-size: 18px;
`;

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

const Placeholder = styled.div`
  min-height: 400px;
  height: 50vh;
  padding: 30px;
  padding-bottom: 70px;
  font-size: 13px;
  color: #ffffff44;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BodyWrapper = styled.div`
  position: relative;
  overflow: hidden;
`;

const HeaderWrapper = styled.div`
  position: relative;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin: 24px 0px 17px 0px;
  height: 20px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 0;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const TagWrapper = styled.div`
  height: 25px;
  font-size: 12px;
  display: flex;
  margin-left: 20px;
  margin-bottom: -3px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
  background: #26282e;
`;

const NamespaceTag = styled.div`
  height: 100%;
  margin-left: 6px;
  color: #aaaabb;
  background: #43454a;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
`;

const StyledExpandedChart = styled.div`
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

const DeprecatedWarning = styled.div`
  font-size: 12px;
  color: #ccc;
  text-align: right;
  width: 100%;
  margin-bottom: 20px;
`;

const DeprecatedSelect = styled.span`
  cursor: pointer;
  color: #949effff;
`;
