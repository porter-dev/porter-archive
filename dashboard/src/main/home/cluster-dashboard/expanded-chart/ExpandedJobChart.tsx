import React, { useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import yaml from "js-yaml";

import backArrow from "assets/back_arrow.png";
import { merge, set } from "lodash";
import loading from "assets/loading.gif";

import {
  ChartType,
  ChartTypeWithExtendedConfig,
  ClusterType,
} from "shared/types";
import { Context } from "shared/Context";
import api from "shared/api";

import TitleSection from "components/TitleSection";
import SettingsSection from "./SettingsSection";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import ValuesYaml from "./ValuesYaml";
import DeploymentType from "./DeploymentType";
import { useRouting } from "../../../../shared/routing";
import { useRouteMatch } from "react-router";
import RevisionSection from "./RevisionSection";
import { onlyInLeft } from "shared/array_utils";
import Loading from "components/Loading";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";
import JobList from "./jobs/JobList";
import SaveButton from "components/SaveButton";
import useAuth from "shared/auth/useAuth";
import ExpandedJobRun from "./jobs/ExpandedJobRun";
import { useEffectDebugger } from "shared/hooks/useEffectDebugger";

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
  const { setCurrentOverlay } = useContext(Context);
  const [isAuthorized] = useAuth();
  const {
    chart,
    status,
    refreshChart,
    deleteChart,
    updateChart,
    upgradeChart,
    loadChartWithSpecificRevision,
  } = useChart(oldChart, closeChart);
  const {
    jobs,
    hasPorterImageTemplate,
    runJob,
    selectedJob,
    setSelectedJob,
  } = useJobs(chart);

  const [devOpsMode, setDevOpsMode] = useState(
    () => localStorage.getItem("devOpsMode") === "true"
  );

  let rightTabOptions = [] as any[];

  if (devOpsMode) {
    rightTabOptions.push({ label: "Helm Values", value: "values" });
  }

  if (isAuthorized("job", "", ["get", "delete"])) {
    rightTabOptions.push({ label: "Settings", value: "settings" });
  }

  const leftTabOptions = [{ label: "Jobs", value: "jobs" }];

  const processValuesToUpdateChart = (newConfig?: any) => (
    currentChart: ChartType
  ) => {
    // return "";
    let conf: string;
    let values = {} as any;

    if (!newConfig) {
      conf = yaml.dump({
        ...currentChart.config,
      });
    } else {
      // Convert dotted keys to nested objects
      values = {};

      for (let key in newConfig) {
        set(values, key, newConfig[key]);
      }

      // Weave in preexisting values and convert to yaml
      conf = yaml.dump(
        {
          ...merge(currentChart.config, values),
        },
        { forceQuotes: true }
      );
    }

    return conf;
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

    if (currentTab === "jobs") {
      return (
        <TabWrapper>
          <ButtonWrapper>
            <SaveButton
              onClick={() => {
                runJob();
              }}
              status={"saveValuesStatus"}
              makeFlush={true}
              clearPosition={true}
              rounded={true}
              statusPosition="right"
            >
              <i className="material-icons">play_arrow</i> Run Job
            </SaveButton>
          </ButtonWrapper>
          <JobList
            jobs={jobs}
            setJobs={() => {}}
            expandJob={(job: any) => {
              setSelectedJob(job);
            }}
            isDeployedFromGithub={!!chart?.git_action_config?.git_repo}
            repositoryUrl={chart?.git_action_config?.git_repo}
            currentChartVersion={Number(chart.version)}
            latestChartVersion={Number(chart.latest_version)}
          />
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
                message: `Are you sure you want to delete ${chart.name}?`,
                onYes: deleteChart,
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

  if (status === "loading") {
    return <Loading />;
  }

  if (status === "deleting") {
    return (
      <StyledExpandedChart>
        <ExpandedJobHeader
          chart={chart}
          jobs={jobs}
          closeChart={closeChart}
          refreshChart={refreshChart}
          upgradeChart={upgradeChart}
          loadChartWithSpecificRevision={loadChartWithSpecificRevision}
        />
        <LineBreak />
        <Placeholder>
          <TextWrap>
            <Header>
              <Spinner src={loading} /> Deleting "{chart.name}"
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

  const formData = { ...chart.form };

  return (
    <>
      <StyledExpandedChart>
        <ExpandedJobHeader
          chart={chart}
          jobs={jobs}
          closeChart={closeChart}
          refreshChart={refreshChart}
          upgradeChart={upgradeChart}
          loadChartWithSpecificRevision={loadChartWithSpecificRevision}
        />
        <BodyWrapper>
          {(leftTabOptions?.length > 0 ||
            formData.tabs?.length > 0 ||
            rightTabOptions?.length > 0) && (
            <PorterFormWrapper
              formData={formData}
              valuesToOverride={{
                namespace: chart.namespace,
                clusterId: currentCluster?.id,
              }}
              renderTabContents={renderTabContents}
              isReadOnly={
                hasPorterImageTemplate ||
                !isAuthorized("job", "", ["get", "update"])
              }
              onSubmit={(formValues) =>
                updateChart(processValuesToUpdateChart(formValues))
              }
              leftTabOptions={leftTabOptions}
              rightTabOptions={rightTabOptions}
              saveValuesStatus={"saveValuesStatus"}
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
  refreshChart: () => void;
  upgradeChart: () => void;
  loadChartWithSpecificRevision: (revision: number) => void;
}> = ({
  chart,
  closeChart,
  jobs,
  refreshChart,
  upgradeChart,
  loadChartWithSpecificRevision,
}) => (
  <HeaderWrapper>
    <BackButton onClick={closeChart}>
      <BackButtonImg src={backArrow} />
    </BackButton>
    <TitleSection icon={chart.chart.metadata.icon} iconWidth="33px">
      {chart.name}
      <DeploymentType currentChart={chart} />
      <TagWrapper>
        Namespace <NamespaceTag>{chart.namespace}</NamespaceTag>
      </TagWrapper>
    </TitleSection>

    <InfoWrapper>
      <LastDeployed>
        Run {jobs?.length} times <Dot>•</Dot>Last template update at
        {" " + readableDate(chart.info.last_deployed)}
      </LastDeployed>
    </InfoWrapper>
    <RevisionSection
      chart={chart}
      refreshChart={() => refreshChart()}
      setRevision={(chart) => {
        loadChartWithSpecificRevision(chart?.version);
      }}
      forceRefreshRevisions={false}
      refreshRevisionsOff={() => {}}
      status={""}
      shouldUpdate={
        chart.latest_version &&
        chart.latest_version !== chart.chart.metadata.version
      }
      latestVersion={chart.latest_version}
      upgradeVersion={() => {
        upgradeChart();
      }}
    />
  </HeaderWrapper>
);

const useChart = (oldChart: ChartType, closeChart: () => void) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [chart, setChart] = useState<ChartTypeWithExtendedConfig>(null);
  const { url: matchUrl } = useRouteMatch();

  const [status, setStatus] = useState<"ready" | "loading" | "deleting">(
    "loading"
  );
  const { pushFiltered, getQueryParam, pushQueryParams } = useRouting();

  useEffect(() => {
    const { namespace, name: chartName } = oldChart;
    setStatus("loading");

    const revision = getQueryParam("chart_revision");

    api
      .getChart<ChartTypeWithExtendedConfig>(
        "token",
        {},
        {
          id: currentProject?.id,
          cluster_id: currentCluster?.id,
          namespace,
          name: chartName,
          revision: Number(revision) ? Number(revision) : 0,
        }
      )
      .then((res) => {
        if (res?.data) {
          setChart(res.data);
        }
      })
      .finally(() => {
        setStatus("ready");
      });
  }, [oldChart, currentCluster, currentProject]);

  /**
   * Upgrade chart version
   */
  const upgradeChart = async () => {
    // convert current values to yaml
    let valuesYaml = yaml.dump({
      ...(chart.config as Object),
    });

    try {
      await api.upgradeChartValues(
        "<token>",
        {
          values: valuesYaml,
          version: chart.latest_version,
        },
        {
          id: currentProject.id,
          name: chart.name,
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
        }
      );

      window.analytics.track("Chart Upgraded", {
        chart: chart.name,
        values: valuesYaml,
      });
    } catch (err) {
      let parsedErr = err?.response?.data?.error;

      if (parsedErr) {
        err = parsedErr;
      }
      setCurrentError(parsedErr);

      window.analytics.track("Failed to Upgrade Chart", {
        chart: chart.name,
        values: valuesYaml,
        error: err,
      });
    }
  };

  /**
   * Delete/Uninstall chart
   */
  const deleteChart = async () => {
    try {
      await api.uninstallTemplate(
        "<token>",
        {},
        {
          namespace: chart.namespace,
          name: chart.name,
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
      setStatus("ready");
      closeChart();
      return;
    } catch (error) {
      console.log(error);
      throw new Error("Couldn't uninstall the chart");
    }
  };

  /**
   * Update chart values
   */
  const updateChart = async (
    processValues:
      | ((chart: ChartType) => string)
      | ((chart: ChartType, oldChart?: ChartType) => string)
  ) => {
    const values = processValues(chart, oldChart);

    const oldSyncedEnvGroups = oldChart.config?.container?.env?.synced || [];
    const newSyncedEnvGroups = chart.config?.container?.env?.synced || [];

    const deletedEnvGroups = onlyInLeft<{
      keys: Array<any>;
      name: string;
      version: number;
    }>(
      oldSyncedEnvGroups,
      newSyncedEnvGroups,
      (oldVal, newVal) => oldVal.name === newVal.name
    );

    const addedEnvGroups = onlyInLeft<{
      keys: Array<any>;
      name: string;
      version: number;
    }>(
      newSyncedEnvGroups,
      oldSyncedEnvGroups,
      (oldVal, newVal) => oldVal.name === newVal.name
    );

    const addApplicationToEnvGroupPromises = addedEnvGroups.map(
      (envGroup: any) => {
        return api.addApplicationToEnvGroup(
          "<token>",
          {
            name: envGroup?.name,
            app_name: chart.name,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            namespace: chart.namespace,
          }
        );
      }
    );

    try {
      await Promise.all(addApplicationToEnvGroupPromises);
    } catch (error) {
      setCurrentError(
        "We coudln't sync the env group to the application, please try again."
      );
    }

    const removeApplicationToEnvGroupPromises = deletedEnvGroups.map(
      (envGroup: any) => {
        return api.removeApplicationFromEnvGroup(
          "<token>",
          {
            name: envGroup?.name,
            app_name: chart.name,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            namespace: chart.namespace,
          }
        );
      }
    );
    try {
      await Promise.all(removeApplicationToEnvGroupPromises);
    } catch (error) {
      setCurrentError(
        "We coudln't remove the synced env group from the application, please try again."
      );
    }

    api
      .upgradeChartValues(
        "<token>",
        {
          values,
        },
        {
          id: currentProject.id,
          name: chart.name,
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        refreshChart();
      })
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;

        if (parsedErr) {
          err = parsedErr;
        }
        throw new Error(parsedErr);
      });
  };

  /**
   * Refresh the chart data
   */
  const refreshChart = async () => {
    try {
      const newChart = await api
        .getChart(
          "<token>",
          {},
          {
            name: chart.name,
            revision: 0,
            namespace: chart.namespace,
            cluster_id: currentCluster.id,
            id: currentProject.id,
          }
        )
        .then((res) => res.data);

      pushQueryParams({
        chart_version: newChart.version,
      });

      setChart(newChart);
    } catch (error) {}
  };

  const loadChartWithSpecificRevision = async (revision: number) => {
    try {
      const newChart = await api
        .getChart(
          "<token>",
          {},
          {
            name: chart.name,
            revision: revision,
            namespace: chart.namespace,
            cluster_id: currentCluster.id,
            id: currentProject.id,
          }
        )
        .then((res) => res.data);

      pushFiltered(matchUrl, ["project_id", "job"], {
        chart_revision: newChart.version,
      });

      setChart(newChart);
    } catch (error) {}
  };

  return {
    chart,
    status,
    upgradeChart,
    deleteChart,
    updateChart,
    refreshChart,
    loadChartWithSpecificRevision,
  };
};

const PORTER_IMAGE_TEMPLATES = [
  "porterdev/hello-porter-job",
  "porterdev/hello-porter-job:latest",
  "public.ecr.aws/o1j4x7p4/hello-porter-job",
  "public.ecr.aws/o1j4x7p4/hello-porter-job:latest",
];

const useJobs = (chart: ChartType) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [jobs, setJobs] = useState([]);
  const jobsRef = useRef([]);
  const [hasPorterImageTemplate, setHasPorterImageTemplate] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    closeWebsocket,
  } = useWebsockets();

  const sortJobsAndSave = (newJobs: any[]) => {
    // Set job run from URL if needed
    const urlParams = new URLSearchParams(location.search);
    const urlJob = urlParams.get("job");

    const getTime = (job: any) => {
      return new Date(job?.status?.startTime).getTime();
    };

    newJobs.sort((job1, job2) => {
      // if (job1.metadata.name === urlJob) {
      //   this.setJobRun(job1);
      // } else if (job2.metadata.name === urlJob) {
      //   this.setJobRun(job2);
      // }

      return getTime(job2) - getTime(job1);
    });

    let latestImageDetected =
      newJobs[0]?.spec?.template?.spec?.containers[0]?.image;
    if (!PORTER_IMAGE_TEMPLATES.includes(latestImageDetected)) {
      // this.setState({ jobs, newestImage, imageIsPlaceholder: false });
      setHasPorterImageTemplate(false);
    }
    jobsRef.current = newJobs;
    setJobs(newJobs);
  };

  const mergeNewJob = (newJob: any) => {
    let newJobs = [...jobsRef.current];
    const existingJobIndex = newJobs.findIndex((currentJob) => {
      return (
        currentJob.metadata?.name === newJob.metadata?.name &&
        currentJob.metadata?.namespace === newJob.metadata?.namespace
      );
    });

    if (existingJobIndex > -1) {
      newJobs.splice(existingJobIndex, 1, newJob);
    } else {
      newJobs.push(newJob);
    }
    sortJobsAndSave(newJobs);
  };

  const removeJob = (deletedJob: any) => {
    let newJobs = jobsRef.current.filter((job: any) => {
      return deletedJob.metadata?.name !== job.metadata?.name;
    });

    sortJobsAndSave([...newJobs]);
  };

  const setupCronJobWebsocket = () => {
    const releaseName = chart.name;
    const releaseNamespace = chart.namespace;
    if (!releaseName || !releaseNamespace) {
      return;
    }

    const websocketId = `cronjob-websocket-${releaseName}`;

    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/cronjob/status`;

    const config: NewWebsocketOptions = {
      onopen: console.log,
      onmessage: (evt: MessageEvent) => {
        const event = JSON.parse(evt.data);
        const object = event.Object;
        object.metadata.kind = event.Kind;

        setHasPorterImageTemplate((prevValue) => {
          // if imageIsPlaceholder is true update the newestImage and imageIsPlaceholder fields

          if (event.event_type !== "ADD" && event.event_type !== "UPDATE") {
            return prevValue;
          }

          if (!hasPorterImageTemplate) {
            return prevValue;
          }

          // filter job belonging to chart
          const relNameAnnotation =
            event.Object?.metadata?.annotations["meta.helm.sh/release-name"];
          const relNamespaceAnnotation =
            event.Object?.metadata?.annotations[
              "meta.helm.sh/release-namespace"
            ];

          if (
            releaseName !== relNameAnnotation ||
            releaseNamespace !== relNamespaceAnnotation
          ) {
            return prevValue;
          }

          const newestImage =
            event.Object?.spec?.jobTemplate?.spec?.template?.spec?.containers[0]
              ?.image;

          if (!PORTER_IMAGE_TEMPLATES.includes(newestImage)) {
            return false;
          }

          return true;
        });
      },
      onclose: console.log,
      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(websocketId);
      },
    };

    newWebsocket(websocketId, endpoint, config);
    openWebsocket(websocketId);
  };

  const setupJobWebsocket = () => {
    const chartVersion = `${chart?.chart?.metadata?.name}-${chart?.chart?.metadata?.version}`;

    const websocketId = `job-websocket-${chart.name}`;

    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/job/status`;

    const config: NewWebsocketOptions = {
      onopen: console.log,
      onmessage: (evt: MessageEvent) => {
        const event = JSON.parse(evt.data);

        const chartLabel = event.Object?.metadata?.labels["helm.sh/chart"];
        const releaseLabel =
          event.Object?.metadata?.labels["meta.helm.sh/release-name"];

        if (chartLabel !== chartVersion || releaseLabel !== chart.name) {
          return;
        }

        // if event type is add or update, merge with existing jobs
        if (event.event_type === "ADD" || event.event_type === "UPDATE") {
          mergeNewJob(event.Object);
          return;
        }

        if (event.event_type === "DELETE") {
          // filter job belonging to chart
          removeJob(event.Object);
        }
      },
      onclose: console.log,
      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(websocketId);
      },
    };
    newWebsocket(websocketId, endpoint, config);
    openWebsocket(websocketId);
  };

  useEffect(() => {
    let isSubscribed = true;

    if (!chart) {
      return () => {
        isSubscribed = false;
        closeAllWebsockets();
      };
    }

    const newestImage = chart?.config?.image?.repository;

    setHasPorterImageTemplate(PORTER_IMAGE_TEMPLATES.includes(newestImage));

    api
      .getJobs(
        "<token>",
        {},
        {
          id: currentProject?.id,
          cluster_id: currentCluster?.id,
          namespace: chart.namespace,
          release_name: chart.name,
        }
      )
      .then((res) => {
        if (isSubscribed) {
          sortJobsAndSave(res.data);
          setupJobWebsocket();
          setupCronJobWebsocket();
        }
      });
    return () => {
      isSubscribed = false;
      closeAllWebsockets();
    };
  }, [chart]);

  const runJob = () => {
    const config = chart.config;
    const values = {};

    for (let key in config) {
      set(values, key, config[key]);
    }

    set(values, "paused", false);

    const yamlValues = yaml.dump(
      {
        ...values,
      },
      { forceQuotes: true }
    );

    api
      .upgradeChartValues(
        "<token>",
        {
          values: yamlValues,
        },
        {
          id: currentProject.id,
          name: chart.name,
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        // this.setState({ saveValuesStatus: "successful" });
        // this.refreshChart(0);
      })
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;

        if (parsedErr) {
          err = parsedErr;
        }

        // this.setState({
        //   saveValuesStatus: parsedErr,
        // });

        setCurrentError(parsedErr);
      });
  };

  return {
    jobs,
    hasPorterImageTemplate,
    runJob,
    selectedJob,
    setSelectedJob,
  };
};

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 15px 0px 55px;
`;

const ButtonWrapper = styled.div`
  margin: 5px 0 35px;
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
