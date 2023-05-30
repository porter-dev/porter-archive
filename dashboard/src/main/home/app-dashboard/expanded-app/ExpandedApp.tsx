import React, { useEffect, useState, useContext, useCallback } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import styled from "styled-components";
import yaml from "js-yaml";
import { z } from "zod";

import notFound from "assets/not-found.png";
import web from "assets/web.png";
import box from "assets/box.png";
import github from "assets/github.png";
import pr_icon from "assets/pull_request_icon.svg";
import loadingImg from "assets/loading.gif";
import refresh from "assets/refresh.png";
import danger from "assets/danger.svg";

import api from "shared/api";
import JSZip from "jszip";
import { Context } from "shared/Context";
import useAuth from "shared/auth/useAuth";
import Error from "components/porter/Error";

import Banner from "components/porter/Banner";
import Loading from "components/Loading";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Back from "components/porter/Back";
import TabSelector from "components/TabSelector";
import { ChartType, PorterAppOptions, ResourceType } from "shared/types";
import RevisionSection from "main/home/cluster-dashboard/expanded-chart/RevisionSection";
import BuildSettingsTabStack from "./BuildSettingsTabStack";
import Button from "components/porter/Button";
import Services from "../new-app-flow/Services";
import { ReleaseService, Service } from "../new-app-flow/serviceTypes";
import ConfirmOverlay from "components/porter/ConfirmOverlay";
import Fieldset from "components/porter/Fieldset";
import { PorterJson, createFinalPorterYaml } from "../new-app-flow/schema";
import EnvGroupArray, {
  KeyValueType,
} from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import { PorterYamlSchema } from "../new-app-flow/schema";
import { EnvVariablesTab } from "./EnvVariablesTab";
import GHABanner from "./GHABanner";
import LogSection from "./LogSection";
import EventsTab from "./EventsTab";
import ActivityFeed from "./activity-feed/ActivityFeed";
import JobRuns from "./JobRuns";
import MetricsSection from "./MetricsSection";
import StatusSectionFC from "./status/StatusSection";
import ExpandedJob from "./expanded-job/ExpandedJob";
import { Log } from "main/home/cluster-dashboard/expanded-chart/logs-section/useAgentLogs";
import Anser, { AnserJsonEntry } from "anser";
import dayjs from "dayjs";
import Modal from "components/porter/Modal";
import TitleSection from "components/TitleSection";
import GHALogsModal from "./status/GHALogsModal";

type Props = RouteComponentProps & {};

const icons = [
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
  web,
];

const ExpandedApp: React.FC<Props> = ({ ...props }) => {
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [appData, setAppData] = useState(null);
  const [workflowCheckPassed, setWorkflowCheckPassed] = useState<boolean>(
    false
  );
  const [hasBuiltImage, setHasBuiltImage] = useState<boolean>(false);

  const [error, setError] = useState(null);
  const [forceRefreshRevisions, setForceRefreshRevisions] = useState<boolean>(
    false
  );
  const [isLoadingChartData, setIsLoadingChartData] = useState<boolean>(true);

  const [tab, setTab] = useState("overview");
  const [saveValuesStatus, setSaveValueStatus] = useState<string>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [bannerLoading, setBannerLoading] = useState<boolean>(false);

  const [components, setComponents] = useState<ResourceType[]>([]);

  const [showRevisions, setShowRevisions] = useState<boolean>(false);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState<boolean>(false);
  const [porterJson, setPorterJson] = useState<
    z.infer<typeof PorterYamlSchema> | undefined
  >(undefined);
  const [expandedJob, setExpandedJob] = useState(null);
  const [logs, setLogs] = useState<Log[]>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [releaseJob, setReleaseJob] = useState<ReleaseService[]>([]);
  const [envVars, setEnvVars] = useState<KeyValueType[]>([]);
  const [buttonStatus, setButtonStatus] = useState<React.ReactNode>("");
  const [subdomain, setSubdomain] = useState<string>("");

  const getPorterApp = async () => {
    // setIsLoading(true);
    setBannerLoading(true);
    const { appName } = props.match.params as any;
    try {
      if (!currentCluster || !currentProject) {
        return;
      }
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

      let releaseChartData;
      // get the release chart
      try {
        releaseChartData = await api.getChart(
          "<token>",
          {},
          {
            id: currentProject.id,
            namespace: `porter-stack-${appName}`,
            cluster_id: currentCluster.id,
            name: `${appName}-r`,
            revision: 0,
          }
        );
      } catch (err) {
        // do nothing, unable to find release chart
        // console.log(err);
      }

      // update apps and release
      const newAppData = {
        app: resPorterApp?.data,
        chart: resChartData?.data,
        releaseChart: releaseChartData?.data,
      };
      const porterJson = await fetchPorterYamlContent(
        resPorterApp?.data?.porter_yaml_path ?? "porter.yaml",
        newAppData
      );

      setPorterJson(porterJson);
      setAppData(newAppData);
      updateServicesAndEnvVariables(
        resChartData?.data,
        releaseChartData?.data,
        porterJson
      );

      // Only check GHA status if no built image is set
      const hasBuiltImage = !!resChartData.data.config?.global?.image
        ?.repository;
      if (hasBuiltImage || !resPorterApp.data.repo_name) {
        setWorkflowCheckPassed(true);
        setHasBuiltImage(true);
      } else {
        try {
          await api.getBranchContents(
            "<token>",
            {
              dir: `./.github/workflows/porter_stack_${resPorterApp.data.name}.yml`,
            },
            {
              project_id: currentProject.id,
              git_repo_id: resPorterApp.data.git_repo_id,
              kind: "github",
              owner: resPorterApp.data.repo_name.split("/")[0],
              name: resPorterApp.data.repo_name.split("/")[1],
              branch: resPorterApp.data.git_branch,
            }
          );
          setWorkflowCheckPassed(true);
        } catch (err) {
          // Handle unmerged PR
          if (err.response?.status === 404) {
            try {
              // Check for user-copied porter.yml as fallback
              const resPorterYml = await api.getBranchContents(
                "<token>",
                { dir: `./.github/workflows/porter.yml` },
                {
                  project_id: currentProject.id,
                  git_repo_id: resPorterApp.data.git_repo_id,
                  kind: "github",
                  owner: resPorterApp.data.repo_name.split("/")[0],
                  name: resPorterApp.data.repo_name.split("/")[1],
                  branch: resPorterApp.data.git_branch,
                }
              );
              setWorkflowCheckPassed(true);
            } catch (err) {
              setWorkflowCheckPassed(false);
            }
          }
        }
      }
    } catch (err) {
      setError(err);
      console.log(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deletePorterApp = async () => {
    setShowDeleteOverlay(false);
    setDeleting(true);
    const { appName } = props.match.params as any;
    try {
      await api.deletePorterApp(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          name: appName,
        }
      );
      await api.deleteNamespace(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          id: currentProject.id,
          namespace: `porter-stack-${appName}`,
        }
      );
      props.history.push("/apps");
    } catch (err) {
      setError(err);
    } finally {
      setDeleting(false);
    }
  };

  const updatePorterApp = async (options: Partial<PorterAppOptions>) => {
    try {
      setButtonStatus("loading");
      if (
        appData != null &&
        currentCluster != null &&
        currentProject != null &&
        appData.app != null
      ) {
        const finalPorterYaml = createFinalPorterYaml(
          services,
          releaseJob,
          envVars,
          porterJson,
          // if we are using a heroku buildpack, inject a PORT env variable
          appData.app.builder != null && appData.app.builder.includes("heroku")
        );
        const yamlString = yaml.dump(finalPorterYaml);
        const base64Encoded = btoa(yamlString);
        await api.createPorterApp(
          "<token>",
          {
            porter_yaml: base64Encoded,
            ...options,
            override_release: true,
          },
          {
            cluster_id: currentCluster.id,
            project_id: currentProject.id,
            stack_name: appData.app.name,
          }
        );
        setButtonStatus("success");
      } else {
        setButtonStatus(<Error message="Unable to update app" />);
      }
    } catch (err) {
      // TODO: better error handling
      console.log(err);
      const errMessage =
        err?.response?.data?.error ??
        err?.toString() ??
        "An error occurred while deploying your app. Please try again.";
      setButtonStatus(<Error message={errMessage} />);
    }
  };

  useEffect(() => {
    setBannerLoading(true);
    getBuildLogs().then(() => {
      setBannerLoading(false);
    });
  }, [appData]);

  const getBuildLogs = async () => {
    try {
      const res = await api.getGHWorkflowLogs(
        "",
        {},
        {
          project_id: appData.app.project_id,
          cluster_id: appData.app.cluster_id,
          git_installation_id: appData.app.git_repo_id,
          owner: appData.app.repo_name?.split("/")[0],
          name: appData.app.repo_name?.split("/")[1],
          filename: "porter_stack_" + appData.chart.name + ".yml",
        }
      );
      let logs: Log[] = [];
      if (res.data != null) {
        // Fetch the logs
        const logsResponse = await fetch(res.data);

        // Ensure that the response body is only read once
        const logsBlob = await logsResponse.blob();

        if (logsResponse.headers.get("Content-Type") === "application/zip") {
          const zip = await JSZip.loadAsync(logsBlob);

          zip.forEach(async function (relativePath, zipEntry) {
            const fileData = await zip.file(relativePath)?.async("string");

            if (
              fileData &&
              fileData.includes("Run porter-dev/porter-cli-action@v0.1.0")
            ) {
              const lines = fileData.split("\n");
              const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z/;

              lines.forEach((line, index) => {
                const lineWithoutTimestamp = line.replace(timestampPattern, "").trimStart();
                const anserLine: AnserJsonEntry[] = Anser.ansiToJson(lineWithoutTimestamp);
                if (lineWithoutTimestamp.toLowerCase().includes("error")) {
                  anserLine[0].fg = "238,75,43";
                }

                const log: Log = {
                  line: anserLine,
                  lineNumber: index + 1,
                  timestamp: line.match(timestampPattern)?.[0],
                };

                logs.push(log);
              });
            }
          });
          setLogs(logs);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchPorterYamlContent = async (
    porterYaml: string,
    appData: any
  ): Promise<PorterJson | undefined> => {
    try {
      const res = await api.getPorterYamlContents(
        "<token>",
        {
          path: porterYaml,
        },
        {
          project_id: appData.app.project_id,
          git_repo_id: appData.app.git_repo_id,
          owner: appData.app.repo_name?.split("/")[0],
          name: appData.app.repo_name?.split("/")[1],
          kind: "github",
          branch: appData.app.git_branch,
        }
      );
      if (res.data == null || res.data == "") {
        return undefined;
      }
      const parsedYaml = yaml.load(atob(res.data));
      const parsedData = PorterYamlSchema.parse(parsedYaml);
      const porterYamlToJson = parsedData as PorterJson;
      return porterYamlToJson;
    } catch (err) {
      // TODO: handle error
    }
  };

  const renderIcon = (b: string, size?: string) => {
    var src = box;
    if (b) {
      const bp = b.split(",")[0]?.split("/")[1];
      switch (bp) {
        case "ruby":
          src = icons[0];
          break;
        case "nodejs":
          src = icons[1];
          break;
        case "python":
          src = icons[2];
          break;
        case "go":
          src = icons[3];
          break;
        default:
          break;
      }
    }
    return <Icon src={src} />;
  };

  const updateServicesAndEnvVariables = async (
    currentChart?: ChartType,
    releaseChart?: ChartType,
    porterJson?: PorterJson
  ) => {
    // handle normal chart
    const helmValues = currentChart?.config;
    const defaultValues = (currentChart?.chart as any)?.values;
    if (
      (defaultValues && Object.keys(defaultValues).length > 0) ||
      (helmValues && Object.keys(helmValues).length > 0)
    ) {
      const svcs = Service.deserialize(helmValues, defaultValues, porterJson);
      setServices(svcs);
      const { global, ...helmValuesWithoutGlobal } = helmValues;
      if (Object.keys(helmValuesWithoutGlobal).length > 0) {
        const envs = Service.retrieveEnvFromHelmValues(helmValuesWithoutGlobal);
        setEnvVars(envs);
        const subdomain = Service.retrieveSubdomainFromHelmValues(
          svcs,
          helmValuesWithoutGlobal
        );
        setSubdomain(subdomain);
      }
    }

    // handle release chart
    if (releaseChart?.config || porterJson?.release) {
      setReleaseJob([
        Service.deserializeRelease(releaseChart?.config, porterJson),
      ]);
    }
  };

  // todo: keep a history of the release job chart, difficult because they can be upgraded asynchronously
  const updateComponents = async (currentChart: ChartType) => {
    setLoading(true);
    try {
      const res = await api.getChartComponents(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: currentChart.name,
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          revision: currentChart.version,
        }
      );
      setComponents(res.data.Objects);
      updateServicesAndEnvVariables(currentChart, undefined, porterJson);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const getChartData = async (chart: ChartType) => {
    setIsLoadingChartData(true);
    const res = await api.getChart(
      "<token>",
      {},
      {
        name: chart.name,
        namespace: chart.namespace,
        cluster_id: currentCluster.id,
        revision: chart.version,
        id: currentProject.id,
      }
    );

    const updatedChart = res.data;

    if (appData != null && updatedChart != null) {
      setAppData({ ...appData, chart: updatedChart });
    }

    // let releaseChartData;
    // // get the release chart
    // try {
    //   releaseChartData = await api.getChart(
    //     "<token>",
    //     {},
    //     {
    //       id: currentProject.id,
    //       namespace: `porter-stack-${chart.name}`,
    //       cluster_id: currentCluster.id,
    //       name: `${chart.name}-r`,
    //       revision: 0,
    //     }
    //   );
    // } catch (err) {
    //   // do nothing, unable to find release chart
    //   console.log(err);
    // }

    // const releaseChart = releaseChartData?.data;

    // if (appData != null && updatedChart != null) {
    //   if (releaseChart != null) {
    //     setAppData({ ...appData, chart: updatedChart, releaseChart });
    //   } else {
    //     setAppData({ ...appData, chart: updatedChart });
    //   }
    // }

    updateComponents(updatedChart).finally(() => setIsLoadingChartData(false));
  };

  const setRevision = (chart: ChartType, isCurrent?: boolean) => {
    // // if we've set the revision, we also override the revision in log data
    // let newLogData = logData;

    // newLogData.revision = `${chart.version}`;

    // setLogData(newLogData);

    // setIsPreview(!isCurrent);
    getChartData(chart);
  };

  const appUpgradeVersion = useCallback(
    async (version: string, cb: () => void) => {
      // convert current values to yaml
      const values = appData.chart.config;

      const valuesYaml = yaml.dump({
        ...values,
      });

      setSaveValueStatus("loading");
      getChartData(appData.chart);

      try {
        await api.upgradeChartValues(
          "<token>",
          {
            values: valuesYaml,
            version: version,
            latest_revision: appData.chart.version,
          },
          {
            id: currentProject.id,
            namespace: appData.chart.namespace,
            name: appData.chart.name,
            cluster_id: currentCluster.id,
          }
        );
        setSaveValueStatus("successful");
        setForceRefreshRevisions(true);

        window.analytics?.track("Chart Upgraded", {
          chart: appData.chart.name,
          values: valuesYaml,
        });

        cb && cb();
      } catch (err) {
        const parsedErr = err?.response?.data?.error;

        if (parsedErr) {
          err = parsedErr;
        }

        setSaveValueStatus(err);
        setCurrentError(parsedErr);

        window.analytics?.track("Failed to Upgrade Chart", {
          chart: appData.chart.name,
          values: valuesYaml,
          error: err,
        });
      }
    },
    [appData?.chart]
  );

  useEffect(() => {
    const { appName } = props.match.params as any;
    if (currentCluster && appName && currentProject) {
      getPorterApp();
    }
  }, [currentCluster]);

  const getReadableDate = (s: string) => {
    const ts = new Date(s);
    const date = ts.toLocaleDateString();
    const time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };
  const renderTabContents = () => {
    switch (tab) {
      case "overview":
        return (
          <>
            {!isLoading && services.length === 0 && (
              <>
                <Fieldset>
                  <Container row>
                    <PlaceholderIcon src={notFound} />
                    <Text color="helper">No services were found.</Text>
                  </Container>
                </Fieldset>
                <Spacer y={0.5} />
              </>
            )}
            <Services
              setServices={(x) => {
                if (buttonStatus !== "") {
                  setButtonStatus("");
                }
                setServices(x);
              }}
              chart={appData.chart}
              services={services}
              addNewText={"Add a new service"}
              setExpandedJob={(x: string) => setExpandedJob(x)}
            />
            <Spacer y={1} />
            <Button
              onClick={async () => await updatePorterApp({})}
              status={buttonStatus}
              loadingText={"Updating..."}
              disabled={services.length === 0}
            >
              Update app
            </Button>
          </>
        );
      case "build-settings":
        return (
          <BuildSettingsTabStack
            appData={appData}
            setAppData={setAppData}
            onTabSwitch={getPorterApp}
            clearStatus={() => setButtonStatus("")}
            updatePorterApp={updatePorterApp}
          />
        );
      case "settings":
        return (
          <>
            <Text size={16}>Delete "{appData.app.name}"</Text>
            <Spacer y={1} />
            <Text color="helper">
              Delete this application and all of its resources.
            </Text>
            <Spacer y={1} />
            <Button
              onClick={() => {
                setShowDeleteOverlay(true);
              }}
              color="#b91133"
            >
              Delete
            </Button>
          </>
        );
      case "events":
        return <EventsTab currentChart={appData.chart} />;
      case "activity":
        return (
          <ActivityFeed
            chart={appData.chart}
            stackName={appData?.app?.name}
            appData={appData}
          />
        );
      case "logs":
        return <LogSection currentChart={appData.chart} />;
      case "metrics":
        return <MetricsSection currentChart={appData.chart} />;
      case "status":
        return <StatusSectionFC currentChart={appData.chart} />;
      case "environment-variables":
        return (
          <EnvVariablesTab
            envVars={envVars}
            setEnvVars={setEnvVars}
            status={buttonStatus}
            updatePorterApp={updatePorterApp}
            clearStatus={() => setButtonStatus("")}
          />
        );
      case "pre-deploy":
        return (
          <>
            {!isLoading && releaseJob.length === 0 && (
              <>
                <Fieldset>
                  <Container row>
                    <PlaceholderIcon src={notFound} />
                    <Text color="helper">
                      No pre-deploy jobs were found. Add a pre-deploy job to
                      perform an operation before your application services
                      deploy, like a database migration.
                    </Text>
                  </Container>
                </Fieldset>
                <Spacer y={0.5} />
              </>
            )}
            <Services
              setServices={(x) => {
                if (buttonStatus !== "") {
                  setButtonStatus("");
                }
                setReleaseJob(x as ReleaseService[]);
              }}
              chart={appData.releaseChart}
              services={releaseJob}
              limitOne={true}
              customOnClick={() => {
                setReleaseJob([
                  Service.default(
                    "pre-deploy",
                    "release",
                    porterJson
                  ) as ReleaseService,
                ]);
              }}
              addNewText={"Add a new pre-deploy job"}
              defaultExpanded={true}
            />
            <Button
              onClick={async () => await updatePorterApp({})}
              status={buttonStatus}
              loadingText={"Updating..."}
              disabled={releaseJob.length === 0}
            >
              Update pre-deploy job
            </Button>
            <Spacer y={0.5} />
            {releaseJob.length > 0 && (
              <JobRuns
                lastRunStatus="all"
                namespace={appData.chart?.namespace}
                sortType="Newest"
                releaseName={appData.app.name + "-r"}
              />
            )}
          </>
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  if (expandedJob) {
    return (
      <ExpandedJob
        appName={appData.app.name}
        jobName={expandedJob}
        goBack={() => setExpandedJob(null)}
      />
    );
  }

  return (
    <>
      {isLoading && !appData && <Loading />}
      {!appData && !isLoading && (
        <Placeholder>
          <Container row>
            <PlaceholderIcon src={notFound} />
            <Text color="helper">
              No application matching "{(props.match.params as any).appName}"
              was found.
            </Text>
          </Container>
          <Spacer y={1} />
          <Link to="/apps">Return to dashboard</Link>
        </Placeholder>
      )}
      {appData && appData.app && (
        <StyledExpandedApp>
          <Back to="/apps" />
          <Container row>
            {renderIcon(appData.app?.build_packs)}
            <Text size={21}>{appData.app.name}</Text>
            {appData.app.repo_name && (
              <>
                <Spacer inline x={1} />
                <Container row>
                  <SmallIcon src={github} />
                  <Text size={13} color="helper">
                    <Link
                      target="_blank"
                      to={`https://github.com/${appData.app.repo_name}`}
                    >
                      {appData.app.repo_name}
                    </Link>
                  </Text>
                </Container>
              </>
            )}
            {appData.app.git_branch && (
              <>
                <Spacer inline x={1} />
                <TagWrapper>
                  Branch
                  <BranchTag>
                    <BranchIcon src={pr_icon} />
                    {appData.app.git_branch}
                  </BranchTag>
                </TagWrapper>
              </>
            )}
            {!appData.app.repo_name && appData.app.image_repo_uri && (
              <>
                <Spacer inline x={1} />
                <Container row>
                  <SmallIcon
                    height="19px"
                    src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png"
                  />
                  <Text size={13} color="helper">
                    {appData.app.image_repo_uri}
                  </Text>
                </Container>
              </>
            )}
          </Container>
          <Spacer y={0.5} />
          {subdomain && (
            <>
              <Container>
                <Text>
                  <a href={subdomain} target="_blank">
                    {subdomain}
                  </a>
                </Text>
              </Container>
              <Spacer y={0.5} />
            </>
          )}
          <Text color="#aaaabb66">
            Last deployed {getReadableDate(appData.chart.info.last_deployed)}
          </Text>
          <Spacer y={1} />
          {deleting ? (
            <Fieldset>
              <Text size={16}>
                <Spinner src={loadingImg} /> Deleting "{appData.app.name}"
              </Text>
              <Spacer y={0.5} />
              <Text color="helper">
                You will be automatically redirected after deletion is complete.
              </Text>
            </Fieldset>
          ) : (
            <>
              {!workflowCheckPassed ? (
                bannerLoading ? (
                  <Banner>
                    <Loading />
                  </Banner>
                ) : (
                  <GHABanner
                    repoName={appData.app.repo_name}
                    branchName={appData.app.git_branch}
                    pullRequestUrl={appData.app.pull_request_url}
                    stackName={appData.app.name}
                    gitRepoId={appData.app.git_repo_id}
                    porterYamlPath={appData.app.porter_yaml_path}
                  />
                )
              ) : !hasBuiltImage ? (
                <>
                  {logs ? (
                    <Banner
                      type="error"
                      suffix={
                        <>
                          <>
                            <RefreshButton
                              onClick={() => window.location.reload()}
                            >
                              <img src={refresh} /> Refresh
                            </RefreshButton>
                          </>
                        </>
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "-20px",
                        }}
                      >
                        Your build was not successful
                        <Spacer inline width="15px" />
                        <>
                          <Link
                            hasunderline
                            target="_blank"
                            onClick={() => setModalVisible(true)}
                          >
                            View Logs
                          </Link>
                          {modalVisible && (
                            <GHALogsModal
                              appData={appData}
                              logs={logs}
                              modalVisible={modalVisible}
                              setModalVisible={setModalVisible}
                            />
                          )}
                        </>
                      </div>

                      <Spacer inline width="5px" />
                    </Banner>
                  ) : bannerLoading ? (
                    <Banner>
                      <Loading />
                    </Banner>
                  ) : (
                    <Banner
                      suffix={
                        <>
                          <RefreshButton
                            onClick={() => window.location.reload()}
                          >
                            <img src={refresh} /> Refresh
                          </RefreshButton>
                        </>
                      }
                    >
                      Your GitHub repo has not been built yet.
                      <Spacer inline width="5px" />
                      <Link
                        hasunderline
                        target="_blank"
                        to={`https://github.com/${appData.app.repo_name}/actions`}
                      >
                        Check status
                      </Link>
                    </Banner>
                  )}
                </>
              ) : (
                <>
                  <DarkMatter />
                  <RevisionSection
                    showRevisions={showRevisions}
                    toggleShowRevisions={() => {
                      setShowRevisions(!showRevisions);
                    }}
                    chart={appData.chart}
                    refreshChart={() => getChartData(appData.chart)}
                    setRevision={setRevision}
                    forceRefreshRevisions={forceRefreshRevisions}
                    refreshRevisionsOff={() => setForceRefreshRevisions(false)}
                    shouldUpdate={
                      appData.chart.latest_version &&
                      appData.chart.latest_version !==
                      appData.chart.chart.metadata.version
                    }
                    latestVersion={appData.chart.latest_version}
                    upgradeVersion={appUpgradeVersion}
                  />
                  <DarkMatter antiHeight="-18px" />
                </>
              )}
              <Spacer y={1} />
              <TabSelector
                options={
                  appData.app.git_repo_id
                    ? hasBuiltImage
                      ? [
                        { label: "Overview", value: "overview" },
                        { label: "Activity", value: "activity" },
                        { label: "Events", value: "events" },
                        { label: "Logs", value: "logs" },
                        { label: "Metrics", value: "metrics" },
                        { label: "Debug", value: "status" },
                        { label: "Pre-deploy", value: "pre-deploy" },
                        {
                          label: "Environment",
                          value: "environment-variables",
                        },
                        { label: "Build settings", value: "build-settings" },
                        { label: "Settings", value: "settings" },
                      ]
                      : [
                        { label: "Overview", value: "overview" },
                        { label: "Activity", value: "activity" },
                        { label: "Pre-deploy", value: "pre-deploy" },
                        {
                          label: "Environment",
                          value: "environment-variables",
                        },
                        { label: "Build settings", value: "build-settings" },
                        { label: "Settings", value: "settings" },
                      ]
                    : [
                      { label: "Overview", value: "overview" },
                      { label: "Activity", value: "activity" },
                      { label: "Events", value: "events" },
                      { label: "Logs", value: "logs" },
                      { label: "Metrics", value: "metrics" },
                      { label: "Debug", value: "status" },
                      { label: "Pre-deploy", value: "pre-deploy" },
                      {
                        label: "Environment",
                        value: "environment-variables",
                      },
                      { label: "Settings", value: "settings" },
                    ]
                }
                currentTab={tab}
                setCurrentTab={(tab: string) => {
                  if (buttonStatus !== "") {
                    setButtonStatus("");
                  }
                  setTab(tab);
                }}
              />
              <Spacer y={1} />
              {renderTabContents()}
              <Spacer y={2} />
            </>
          )}
        </StyledExpandedApp>
      )}
      {showDeleteOverlay && (
        <ConfirmOverlay
          message={`Are you sure you want to delete "${appData.app.name}"?`}
          onYes={() => {
            deletePorterApp();
          }}
          onNo={() => {
            setShowDeleteOverlay(false);
          }}
        />
      )}
    </>
  );
};

export default withRouter(ExpandedApp);

const RefreshButton = styled.div`
  color: #ffffff44;
  display: flex;
  align-items: center;
  cursor: pointer;
  :hover {
    color: #ffffff;
    > img {
      opacity: 1;
    }
  }

  > img {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 11px;
    margin-right: 10px;
    opacity: 0.3;
  }
`;

const LogsButton = styled.div`
  color: white;
  display: flex;
  align-items: center;
  cursor: pointer;
  :hover {
    color: red;
    > img {
      opacity: 1;
    }
  }

  > img {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 5px;
    margin-right: 10px;
    opacity: 0.8;
  }
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-20px"};
`;

const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 6px;
`;

const BranchTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #ffffff22;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  height: ${(props) => props.height || "15px"};
  opacity: ${(props) => props.opacity || 1};
  margin-right: 10px;
`;

const BranchIcon = styled.img`
  height: 14px;
  opacity: 0.65;
  margin-right: 5px;
`;

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

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
