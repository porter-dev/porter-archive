import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import yaml from "js-yaml";

import leftArrow from "assets/left-arrow.svg";
import { cloneDeep, set } from "lodash";
import loading from "assets/loading.gif";

import { ChartType, ClusterType } from "shared/types";
import { Context } from "shared/Context";

import TitleSection from "components/TitleSection";
import SettingsSection from "./SettingsSection";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import ValuesYaml from "./ValuesYaml";
import DeploymentType from "./DeploymentType";
import RevisionSection from "./RevisionSection";
import Loading from "components/Loading";
import JobList from "./jobs/JobList";
import SaveButton from "components/SaveButton";
import useAuth from "shared/auth/useAuth";
import ExpandedJobRun from "./jobs/ExpandedJobRun";
import { useJobs } from "./jobs/useJobs";
import { useChart } from "shared/hooks/useChart";
import ConnectToJobInstructionsModal from "./jobs/ConnectToJobInstructionsModal";
import CommandLineIcon from "assets/command-line-icon";
import CronParser from "cron-parser";
import CronPrettifier from "cronstrue";
import BuildSettingsTab from "./build-settings/BuildSettingsTab";
import { useStackEnvGroups } from "./useStackEnvGroups";
import api from "shared/api";

const readableDate = (s: string) => {
  let ts = new Date(s);
  let date = ts.toLocaleDateString();
  let time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} on ${date}`;
};

export const ExpandedJobChartFC: React.FC<{
  namespace: string;
  currentChart: ChartType;
  currentCluster: ClusterType;
  closeChart: () => void;
  setSidebar: (x: boolean) => void;
}> = ({ currentChart: oldChart, closeChart, currentCluster }) => {
  const { currentProject, setCurrentOverlay } = useContext(Context);
  const [isAuthorized] = useAuth();
  const {
    chart,
    status,
    saveStatus,
    refreshChart,
    deleteChart,
    updateChart,
    upgradeChart,
    loadChartWithSpecificRevision,
  } = useChart(oldChart, closeChart);

  const {
    jobs,
    hasPorterImageTemplate,
    status: jobsStatus,
    triggerRunStatus,
    runJob,
    selectedJob,
    setSelectedJob,
  } = useJobs(chart);

  const {
    isStack,
    stackEnvGroups,
    isLoadingStackEnvGroups,
  } = useStackEnvGroups(chart);

  const [devOpsMode, setDevOpsMode] = useState(
    () => localStorage.getItem("devOpsMode") === "true"
  );
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [disableForm, setDisableForm] = useState(false);

  let rightTabOptions = [] as any[];

  if (devOpsMode) {
    rightTabOptions.push({ label: "Helm Values", value: "values" });
  }

  if (isAuthorized("job", "", ["get", "delete"])) {
    rightTabOptions.push({ label: "Settings", value: "settings" });
  }

  if (chart?.git_action_config?.git_repo) {
    rightTabOptions.push({
      label: "Build Settings",
      value: "build-settings",
    });
  }

  const leftTabOptions = [{ label: "Jobs", value: "jobs" }];

  const processValuesToUpdateChart = (props?: {
    values: any;
    metadata: any;
  }) => (currentChart: ChartType) => {
    const newConfig = props.values;
    let conf: string;
    let values = currentChart.config;

    if (!newConfig) {
      set(values, "paused", true);

      conf = yaml.dump(values, { forceQuotes: true });
    } else {
      // Convert dotted keys to nested objects
      for (let key in newConfig) {
        set(values, key, newConfig[key]);
      }

      set(values, "paused", true);

      // Weave in preexisting values and convert to yaml
      conf = yaml.dump(values, { forceQuotes: true });
    }

    return { yaml: conf, metadata: props.metadata };
  };

  const handleDeleteChart = async () => {
    deleteChart();
    setCurrentOverlay(null);
  };

  const renderTabContents = (currentTab: string) => {
    if (currentTab === "jobs" && hasPorterImageTemplate) {
      return (
        <Placeholder>
          <TextWrap>
            <Header>
              <Spinner src={loading} /> This job is currently being deployed
            </Header>
            Navigate to the
            <A
              href={`https://github.com/${chart?.git_action_config?.git_repo}/actions`}
              target={"_blank"}
            >
              Actions tab
            </A>{" "}
            of your GitHub repo to view live build logs.
          </TextWrap>
        </Placeholder>
      );
    }

    let interval = null;
    if (chart?.config?.schedule.enabled) {
      interval = CronParser.parseExpression(chart?.config?.schedule.value, {
        utc: true,
      });
    }
    // @ts-ignore
    const rtf = new Intl.DateTimeFormat("en", {
      localeMatcher: "best fit", // other values: "lookup"
      // @ts-ignore
      dateStyle: "full",
      timeStyle: "long",
    });

    let runDescription = "";

    try {
      runDescription = `Runs ${CronPrettifier.toString(
        chart?.config?.schedule.value
      ).toLowerCase()} UTC`;
    } catch (error) {
      runDescription =
        "An unexpected error happened while trying to parse the cron expression.";
    }

    if (currentTab === "jobs") {
      return (
        <TabWrapper>
          <ButtonWrapper
            style={{
              marginBottom: chart?.config?.schedule?.enabled ? "0px" : "35px",
            }}
          >
            <SaveButton
              onClick={() => {
                runJob();
              }}
              status={triggerRunStatus}
              makeFlush={true}
              clearPosition={true}
              rounded={true}
              statusPosition="right"
            >
              <i className="material-icons">play_arrow</i> Run Job
            </SaveButton>
            <CLIModalIconWrapper
              onClick={(e) => {
                e.preventDefault();
                setShowConnectionModal(true);
              }}
            >
              <CLIModalIcon />
              Shell Access
            </CLIModalIconWrapper>
          </ButtonWrapper>

          {chart?.config?.schedule?.enabled ? (
            <RunsDescription>
              <i className="material-icons">access_time</i>
              {runDescription}
              <Dot
                style={{
                  color: "#ffffff88",
                }}
              >
                •
              </Dot>{" "}
              Next run on
              {" " + rtf.format(interval.next().toDate())}
            </RunsDescription>
          ) : null}

          {jobsStatus === "loading" ? (
            <Loading></Loading>
          ) : (
            <>
              <JobList
                jobs={jobs}
                setJobs={() => {}}
                expandJob={(job: any) => {
                  setSelectedJob(job);
                }}
                isDeployedFromGithub={!!chart?.git_action_config?.git_repo}
                repositoryUrl={chart?.git_action_config?.git_repo}
                currentChartVersion={Number(chart?.version)}
                latestChartVersion={Number(chart?.latest_version)}
              />
            </>
          )}
        </TabWrapper>
      );
    }

    if (currentTab === "values") {
      return (
        <ValuesYaml
          currentChart={chart}
          refreshChart={() => refreshChart()}
          disabled={!isAuthorized("job", "", ["get", "update"])}
        />
      );
    }

    if (currentTab === "build-settings") {
      return (
        <BuildSettingsTab
          chart={chart}
          isPreviousVersion={disableForm}
          onSave={refreshChart}
        />
      );
    }

    if (
      currentTab === "settings" &&
      isAuthorized("job", "", ["get", "delete"])
    ) {
      return (
        <SettingsSection
          currentChart={chart}
          refreshChart={() => refreshChart()}
          setShowDeleteOverlay={(showOverlay: boolean) => {
            if (showOverlay) {
              setCurrentOverlay({
                message: `Are you sure you want to delete ${chart?.name}?`,
                onYes: handleDeleteChart,
                onNo: () => setCurrentOverlay(null),
              });
            } else {
              setCurrentOverlay(null);
            }
          }}
          saveButtonText="Save Config"
        />
      );
    }

    return null;
  };

  const formData = useMemo(() => cloneDeep(chart?.form || {}), [chart]);

  if (status === "loading" || isLoadingStackEnvGroups) {
    return <Loading />;
  }

  if (status === "deleting") {
    return (
      <StyledExpandedChart>
        <ExpandedJobHeader
          chart={chart}
          jobs={jobs}
          disableRevisions
          closeChart={closeChart}
          refreshChart={refreshChart}
          upgradeChart={upgradeChart}
          loadChartWithSpecificRevision={loadChartWithSpecificRevision}
          setDisableForm={setDisableForm}
        />
        <LineBreak />
        <Placeholder>
          <TextWrap>
            <Header>
              <Spinner src={loading} /> Deleting "{chart?.name}"
            </Header>
            You will be automatically redirected after deletion is complete.
          </TextWrap>
        </Placeholder>
      </StyledExpandedChart>
    );
  }

  if (selectedJob !== null) {
    return (
      <ExpandedJobRun
        currentChart={chart}
        jobRun={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    );
  }

  return (
    <>
      <ConnectToJobInstructionsModal
        show={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        chartName={chart?.name}
      />
      <StyledExpandedChart>
        <ExpandedJobHeader
          chart={chart}
          jobs={jobs}
          closeChart={closeChart}
          refreshChart={refreshChart}
          upgradeChart={upgradeChart}
          loadChartWithSpecificRevision={loadChartWithSpecificRevision}
          setDisableForm={setDisableForm}
        />
        <BodyWrapper>
          {(leftTabOptions?.length > 0 ||
            formData.tabs?.length > 0 ||
            rightTabOptions?.length > 0) && (
            <PorterFormWrapper
              formData={formData}
              valuesToOverride={{
                namespace: chart?.namespace,
                clusterId: currentCluster?.id,
              }}
              renderTabContents={renderTabContents}
              isReadOnly={
                hasPorterImageTemplate ||
                !isAuthorized("job", "", ["get", "update"]) ||
                disableForm
              }
              onSubmit={(formValues) =>
                updateChart(processValuesToUpdateChart(formValues))
              }
              includeMetadata
              leftTabOptions={leftTabOptions}
              rightTabOptions={rightTabOptions}
              saveValuesStatus={saveStatus}
              saveButtonText="Save Config"
              includeHiddenFields
              addendum={
                <TabButton
                  onClick={() =>
                    setDevOpsMode((prev) => {
                      localStorage.setItem("devOpsMode", prev.toString());
                      return !prev;
                    })
                  }
                  devOpsMode={devOpsMode}
                >
                  <i className="material-icons">offline_bolt</i> DevOps Mode
                </TabButton>
              }
              injectedProps={{
                "key-value-array": {
                  availableSyncEnvGroups:
                    isStack && !disableForm ? stackEnvGroups : undefined,
                },
                "url-link": {
                  chart: chart,
                },
              }}
            />
          )}
        </BodyWrapper>
      </StyledExpandedChart>
    </>
  );
};

const ExpandedJobHeader: React.FC<{
  chart: ChartType;
  jobs: any[];
  closeChart: () => void;
  refreshChart: () => Promise<void>;
  upgradeChart: () => Promise<void>;
  loadChartWithSpecificRevision: (revision: number) => void;
  setDisableForm: (disable: boolean) => void;
  disableRevisions?: boolean;
}> = ({
  chart,
  closeChart,
  jobs,
  refreshChart,
  upgradeChart,
  loadChartWithSpecificRevision,
  setDisableForm,
  disableRevisions,
}) => (
  <>
    <BreadcrumbRow>
      <Breadcrumb onClick={closeChart}>
        <ArrowIcon src={leftArrow} />
        <Wrap>Back</Wrap>
      </Breadcrumb>
    </BreadcrumbRow>
    <HeaderWrapper>
      <TitleSection icon={chart?.chart.metadata.icon} iconWidth="33px">
        {chart?.name}
        <DeploymentType currentChart={chart} />
        <TagWrapper>
          Namespace <NamespaceTag>{chart.namespace}</NamespaceTag>
        </TagWrapper>
      </TitleSection>
      {chart?.config?.description ? (
        <Description>{chart?.config?.description}</Description>
      ) : null}

      <InfoWrapper>
        <LastDeployed>
          Run {jobs?.length} times <Dot>•</Dot>Last template update at
          {" " + readableDate(chart.info.last_deployed)}
        </LastDeployed>
      </InfoWrapper>
      {!disableRevisions ? (
        <RevisionSection
          chart={chart}
          refreshChart={() => refreshChart()}
          setRevision={(chart, isCurrent) => {
            loadChartWithSpecificRevision(chart?.version);
            setDisableForm(!isCurrent);
          }}
          forceRefreshRevisions={false}
          refreshRevisionsOff={() => {}}
          shouldUpdate={
            chart?.latest_version &&
            chart?.latest_version !== chart?.chart.metadata.version
          }
          latestVersion={chart?.latest_version}
          upgradeVersion={(_version, cb) => {
            upgradeChart().then(() => {
              if (typeof cb === "function") {
                cb();
              }
            });
          }}
        />
      ) : null}
    </HeaderWrapper>
  </>
);

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

const RunsDescription = styled.div`
  color: #ffffff;
  font-size: 13px;
  margin-top: 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  padding: 14px 20px;
  background: #2b2e36;
  border: 1px solid #ffffff22;
  color: #ffffffdd;
  border-radius: 4px;
  user-select: text;

  > i {
    font-size: 16px;
    color: #ffffffdd;
    margin-right: 10px;
  }
`;

const Description = styled.div`
  user-select: text;
  font-size: 13px;
  margin-left: 0;
  display: flex;
  align-items: center;
  color: #ffffffdd;
  line-height: 150%;
`;

const CLIModalIconWrapper = styled.div`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 20px 6px 10px;
  text-align: left;
  border: 1px solid #ffffff55;
  border-radius: 8px;
  background: #ffffff11;
  color: #ffffffdd;
  cursor: pointer;

  :hover {
    cursor: pointer;
    background: #ffffff22;
    > path {
      fill: #ffffff77;
    }
  }

  > path {
    fill: #ffffff99;
  }
`;

const CLIModalIcon = styled(CommandLineIcon)`
  width: 32px;
  height: 32px;
  padding: 8px;

  > path {
    fill: #ffffff99;
  }
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 1px;
  background: #494b4f;
  margin: 15px 0px 55px;
`;

const ButtonWrapper = styled.div`
  display: flex;
  margin: 5px 0 0 0;
  justify-content: space-between;
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

const TextWrap = styled.div``;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
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

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;

const BodyWrapper = styled.div`
  position: relative;
  overflow: hidden;
`;

const TabWrapper = styled.div`
  height: 100%;
  width: 100%;
  padding-bottom: 47px;
  overflow: hidden;
`;

const HeaderWrapper = styled.div`
  position: relative;
`;

const Dot = styled.div`
  margin-right: 9px;
  margin-left: 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 24px 0px 17px 0px;
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

const TabButton = styled.div`
  position: absolute;
  right: 0px;
  height: 30px;
  background: linear-gradient(to right, #20222700, #202227 20%);
  padding-left: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: ${(props: { devOpsMode: boolean }) =>
    props.devOpsMode ? "#aaaabb" : "#aaaabb55"};
  margin-left: 35px;
  border-radius: 20px;
  text-shadow: 0px 0px 8px
    ${(props: { devOpsMode: boolean }) =>
      props.devOpsMode ? "#ffffff66" : "none"};
  cursor: pointer;
  :hover {
    color: ${(props: { devOpsMode: boolean }) =>
      props.devOpsMode ? "" : "#aaaabb99"};
  }

  > i {
    font-size: 17px;
    margin-right: 9px;
  }
`;

const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
`;
