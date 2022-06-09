import React, { useContext, useEffect, useState } from "react";
import { get, isEmpty } from "lodash";
import styled from "styled-components";

import backArrow from "assets/back_arrow.png";
import KeyValueArray from "components/form-components/KeyValueArray";
import Loading from "components/Loading";
import TabRegion from "components/TabRegion";
import TitleSection from "components/TitleSection";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";
import DeploymentType from "../DeploymentType";
import JobMetricsSection from "../metrics/JobMetricsSection";
import Logs from "../status/Logs";
import { useRouting } from "shared/routing";

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

const renderStatus = (job: any, pods: any[], time: string) => {
  if (job.status?.succeeded >= 1) {
    return <Status color="#38a88a">Succeeded {time}</Status>;
  }

  if (job.status?.failed >= 1) {
    const appPod = getLatestPod(pods);

    if (appPod) {
      const appContainerStatus = appPod?.status?.containerStatuses?.find(
        (container: any) =>
          container?.state?.terminated?.reason !== "Completed" &&
          !container?.state?.running
      );

      if (appContainerStatus) {
        const reason = appContainerStatus.state.terminated.reason;
        const exitCode = appContainerStatus.state.terminated.exitCode;
        const finishTime = appContainerStatus.state.terminated.finishedAt;

        return (
          <Status color="#cc3d42">
            Failed at {time ? time : readableDate(finishTime)} - Reason:{" "}
            {reason} - Exit Code: {exitCode}
          </Status>
        );
      }
    }

    return (
      <Status color="#cc3d42">
        Failed {time}
        {job.status.conditions.length > 0 &&
          `: ${job.status.conditions[0].reason}`}
      </Status>
    );
  }

  return <Status color="#ffffff11">Running</Status>;
};

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
  const [currentTab, setCurrentTab] = useState<
    "logs" | "metrics" | "config" | string
  >("logs");
  const [pods, setPods] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { pushQueryParams } = useRouting();

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
              label="Environment Variables:"
              disabled={true}
            />
            <DarkMatter />
          </>
        )}
      </ConfigSection>
    );
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <StyledExpandedChart>
      <HeaderWrapper>
        <BackButton onClick={() => onClose()}>
          <BackButtonImg src={backArrow} />
        </BackButton>
        <TitleSection icon={currentChart.chart.metadata.icon} iconWidth="33px">
          {chart.name} <Gray>at {readableDate(run.status.startTime)}</Gray>
        </TitleSection>

        <InfoWrapper>
          <LastDeployed>
            {renderStatus(
              run,
              pods,
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
          setCurrentTab={(x: string) => setCurrentTab(x)}
          options={[
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
            },
          ]}
        >
          {currentTab === "logs" && (
            <JobLogsWrapper>
              <Logs
                selectedPod={pods[0]}
                podError={!pods[0] ? "Pod no longer exists." : ""}
                rawText={true}
              />
            </JobLogsWrapper>
          )}
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
  height: 55vh;
  width: 100%;
  border-radius: 8px;
  background-color: black;
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
