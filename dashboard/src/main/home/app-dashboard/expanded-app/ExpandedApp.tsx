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

import api from "shared/api";
import { Context } from "shared/Context";
import useAuth from "shared/auth/useAuth";
import Error from "components/porter/Error";

import Loading from "components/Loading";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Back from "components/porter/Back";
import TabSelector from "components/TabSelector";
import { ChartType, ResourceType } from "shared/types";
import RevisionSection from "main/home/cluster-dashboard/expanded-chart/RevisionSection";
import BuildSettingsTabStack from "./BuildSettingsTabStack";
import Button from "components/porter/Button";
import Services from "../new-app-flow/Services";
import { Service } from "../new-app-flow/serviceTypes";
import ConfirmOverlay from "components/porter/ConfirmOverlay";
import { createFinalPorterYaml } from "../new-app-flow/schema";
import EnvGroupArray, { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import { PorterYamlSchema } from "../new-app-flow/schema";

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
  const [rawYaml, setRawYaml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [appData, setAppData] = useState(null);
  const [error, setError] = useState(null);
  const [forceRefreshRevisions, setForceRefreshRevisions] = useState<boolean>(
    false
  );
  const [isLoadingChartData, setIsLoadingChartData] = useState<boolean>(true);
  const [imageIsPlaceholder, setImageIsPlaceholer] = useState<boolean>(false);

  const [tab, setTab] = useState("events");
  const [saveValuesStatus, setSaveValueStatus] = useState<string>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [components, setComponents] = useState<ResourceType[]>([]);

  const [showRevisions, setShowRevisions] = useState<boolean>(false);
  const [newestImage, setNewestImage] = useState<string>(null);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState<boolean>(false);
  const [porterJson, setPorterJson] = useState<
    z.infer<typeof PorterYamlSchema> | undefined
  >(undefined);

  const [services, setServices] = useState<Service[]>([]);
  const [envVars, setEnvVars] = useState<KeyValueType[]>([]);
  const [updating, setUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string>("");

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

      const newAppData = {
        app: resPorterApp?.data,
        chart: resChartData?.data,
      };
      setAppData(newAppData);

      const helmValues = resChartData?.data?.config;
      const defaultValues = resChartData?.data?.chart?.values;
      if ((defaultValues && Object.keys(defaultValues).length > 0) || (helmValues && Object.keys(helmValues).length > 0)) {
        const svcs = Service.deserialize(helmValues, defaultValues);
        setServices(svcs);
        console.log(helmValues);
      }
      console.log(newAppData);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deletePorterApp = async () => {
    setIsLoading(true);
    const { appName } = props.match.params as any;
    try {
      const res = await api.deletePorterApp(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          name: appName,
        }
      );
      const nsRes = await api.deleteNamespace(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          id: currentProject.id,
          namespace: `porter-stack-${appName}`,
        }
      );
      console.log(res);
      setIsLoading(false);
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  };

  const updatePorterApp = async () => {
    try {
      setUpdating(true);
      if (
        appData != null
        && currentCluster != null
        && currentProject != null
        && appData.app != null
      ) {
        const finalPorterYaml = createFinalPorterYaml(
          services,
          [],
          undefined,
          appData.app.name,
          currentProject.id,
          currentCluster.id,
        )
        const yamlString = yaml.dump(finalPorterYaml);
        const base64Encoded = btoa(yamlString);
        await api.updatePorterStack(
          "<token>",
          {
            stack_name: appData.app.name,
            porter_yaml: base64Encoded,
          },
          {
            cluster_id: currentCluster.id,
            project_id: currentProject.id,
            stack_name: appData.app.name,
          }
        )
      } else {
        setUpdateError("Unable to update app, please try again later.");
      }
    } catch (err) {
      // TODO: better error handling
      console.log(err);
      const errMessage = err?.response?.data?.error ?? err?.toString() ?? 'An error occurred while deploying your app. Please try again.'
      setUpdateError(errMessage);
    } finally {
      setUpdating(false)
    }
  }

  const fetchPorterYamlContent = async (porterYaml: string) => {
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
      setRawYaml(atob(res.data));
      let parsedYaml;
      parsedYaml = yaml.load(rawYaml);
      const parsedData = PorterYamlSchema.parse(parsedYaml);
      const porterYamlToJson = parsedData as z.infer<typeof PorterYamlSchema>;
      setPorterJson(porterYamlToJson);
      console.log(porterJson);
    } catch (err) {
      console.log(err);
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
    const image = res.data?.config?.image?.repository;
    const tag = res.data?.config?.image?.tag?.toString();
    const newNewestImage = tag ? image + ":" + tag : image;
    let imageIsPlaceholder = false;
    if (
      (image === "porterdev/hello-porter" ||
        image === "public.ecr.aws/o1j4x7p4/hello-porter") &&
      !newestImage
    ) {
      imageIsPlaceholder = true;
    }
    setImageIsPlaceholer(imageIsPlaceholder);
    setNewestImage(newNewestImage);

    const updatedChart = res.data;

    setAppData({ chart: updatedChart });

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
            <Services
              setServices={setServices}
              services={services}
            />
            <Spacer y={0.5} />
            <Button
              onClick={() => {
                updatePorterApp();
              }}
              status={updating ? "loading" : updateError ? (
                <Error message={updateError} />
              ) : undefined}
              loadingText={"Updating..."}
              width={"150px"}
            >
              Update app
            </Button>
            <Spacer y={0.5} />
          </>
        )
      case "build-settings":
        return (
          <BuildSettingsTabStack
            appData={appData}
            setAppData={setAppData}
            onTabSwitch={getPorterApp}
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
      case "environment-variables":
        return (
          <>
            <Text size={16}>Environment variables</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Shared among all services.
            </Text>
            <EnvGroupArray
              values={envVars}
              setValues={setEnvVars}
              fileUpload={true}
            />
            <Spacer y={0.5} />
            <Button
              onClick={() => {
                updatePorterApp();
              }}
              status={updating ? "loading" : updateError ? (
                <Error message={updateError} />
              ) : undefined}
              loadingText={"Updating..."}
              width={"150px"}
            >
              Update app
            </Button>
            <Spacer y={0.5} />
          </>);
      default:
        return <div>dream on</div>;
    }
  };

  return (
    <>
      {isLoading && <Loading />}
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
      {appData && (
        <StyledExpandedApp>
          <Back to="/apps" />
          <Container row>
            {renderIcon(appData.app?.build_packs)}
            <Text size={21}>{appData.app.name}</Text>
            {appData.app.repo_name && (
              <>
                <Spacer inline x={1} />
                <Text size={13} color="helper">
                  <SmallIcon src={github} />
                  {appData.app.repo_name}
                </Text>
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
                <Text size={13} color="helper">
                  <SmallIcon
                    height="19px"
                    src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png"
                  />
                  {appData.app.image_repo_uri}
                </Text>
              </>
            )}
          </Container>
          <Spacer y={1} />
          <Text color="#aaaabb66">
            Last deployed {getReadableDate(appData.chart.info.last_deployed)}
          </Text>
          <Spacer y={1} />
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
          <Spacer y={1} />
          <TabSelector
            options={
              appData.app.git_repo_id
                ? [
                  { label: "Events", value: "events" },
                  { label: "Logs", value: "logs" },
                  { label: "Metrics", value: "metrics" },
                  { label: "Overview", value: "overview" },
                  { label: "Build settings", value: "build-settings" },
                  { label: "Settings", value: "settings" },
                ]
                : [
                  { label: "Events", value: "events" },
                  { label: "Logs", value: "logs" },
                  { label: "Metrics", value: "metrics" },
                  { label: "Overview", value: "overview" },
                  { label: "Settings", value: "settings" },
                ]
            }
            currentTab={tab}
            setCurrentTab={setTab}
          />
          <Spacer y={1} />
          {renderTabContents()}
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

const BranchSection = styled.div`
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
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

const HeaderWrapper = styled.div`
  position: relative;
`;
const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 8px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;
const Dot = styled.div`
  margin-right: 16px;
`;
const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 3px;
  margin-top: 22px;
`;
