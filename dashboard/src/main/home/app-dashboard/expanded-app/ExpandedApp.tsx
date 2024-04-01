import React, { useEffect, useState, useContext } from "react";
import { type RouteComponentProps, useHistory, useLocation, useParams, withRouter } from "react-router";
import styled from "styled-components";
import yaml from "js-yaml";

import notFound from "assets/not-found.png";
import web from "assets/web.png";
import box from "assets/box.png";
import github from "assets/github-white.png";
import pr_icon from "assets/pull_request_icon.svg";
import loadingImg from "assets/loading.gif";
import refresh from "assets/refresh.png";
import save from "assets/save-01.svg";

import api from "shared/api";
import { Context } from "shared/Context";
import Error from "components/porter/Error";

import Banner from "components/porter/Banner";
import Loading from "components/Loading";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Back from "components/porter/Back";
import TabSelector from "components/TabSelector";
import Icon from "components/porter/Icon";
import { type ChartType, type CreateUpdatePorterAppOptions } from "shared/types";
import BuildSettingsTab from "../build-settings/BuildSettingsTab";
import Button from "components/porter/Button";
import Services from "../new-app-flow/Services";
import { ImageInfo, Service } from "../new-app-flow/serviceTypes";
import Fieldset from "components/porter/Fieldset";
import { type PorterJson, createFinalPorterYaml , PorterYamlSchema } from "../new-app-flow/schema";
import { type KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import { EnvVariablesTab } from "./env-vars/EnvVariablesTab";
import GHABanner from "./GHABanner";
import LogSection from "./logs/LogSection";
import ActivityFeed from "./activity-feed/ActivityFeed";
import MetricsSection from "./metrics/MetricsSection";
import StatusSectionFC from "./status/StatusSection";
import ExpandedJob from "./expanded-job/ExpandedJob";
import _ from "lodash";
import AnimateHeight from "react-animate-height";
import { type NewPopulatedEnvGroup } from "../../../../components/porter-form/types";
import { type BuildMethod, PorterApp } from "../types/porterApp";
import EventFocusView from "./activity-feed/events/focus-views/EventFocusView";
import HelmValuesTab from "./HelmValuesTab";
import SettingsTab from "./SettingsTab";
import PorterAppRevisionSection from "./PorterAppRevisionSection";
import ImageSettingsTab from "./ImageSettingsTab";

type Props = RouteComponentProps & {};

const icons = [
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
  web,
];

const validTabs = [
  "activity",
  "events",
  "overview",
  "logs",
  "metrics",
  "debug",
  "environment",
  "build-settings",
  "image-settings",
  "settings",
  "helm-values",
  "job-history",
] as const;
const DEFAULT_TAB = "activity";
type ValidTab = typeof validTabs[number];
type Params = {
  eventId?: string;
  tab?: ValidTab;
}

const ExpandedApp: React.FC<Props> = ({ ...props }) => {
  const {
    currentCluster,
    currentProject,
    setCurrentError,
    user,
  } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [appData, setAppData] = useState(null);
  const [workflowCheckPassed, setWorkflowCheckPassed] = useState<boolean>(
    false
  );
  const [githubWorkflowFilename, setGithubWorkflowFilename] = useState<string>("");
  const [hasBuiltImage, setHasBuiltImage] = useState<boolean>(false);

  const [forceRefreshRevisions, setForceRefreshRevisions] = useState<boolean>(
    false
  );

  const [showRevisions, setShowRevisions] = useState<boolean>(false);

  // this is what we read from their porter.yaml in github
  const [porterJson, setPorterJson] = useState<PorterJson | undefined>(undefined);
  // this is what we use to update the release. the above is a subset of this
  const [porterYaml, setPorterYaml] = useState<PorterJson>({} as PorterJson);
  const [showUnsavedChangesBanner, setShowUnsavedChangesBanner] = useState<boolean>(false);

  const [expandedJob, setExpandedJob] = useState(null);
  const [services, setServices] = useState<Service[]>([]);
  const [envVars, setEnvVars] = useState<KeyValueType[]>([]);
  const [buttonStatus, setButtonStatus] = useState<React.ReactNode>("");
  const [subdomain, setSubdomain] = useState<string>("");
  const [syncedEnvGroups, setSyncedEnvGroups] = useState<NewPopulatedEnvGroup[]>([])
  const [deletedEnvGroups, setDeleteEnvGroups] = useState<NewPopulatedEnvGroup[]>([])
  const [porterApp, setPorterApp] = useState<PorterApp>();

  // this is the version of the porterApp that is being edited. on save, we set the real porter app to be this version
  const [tempPorterApp, setTempPorterApp] = useState<PorterApp>(PorterApp.empty());
  const [buildView, setBuildView] = useState<BuildMethod>("docker");

  const history = useHistory();

  const { tab } = useParams<Params>();
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const queryParamOpts = {
    revision: queryParams.get('version'),
    output_stream: queryParams.get('output_stream'),
    service: queryParams.get('service'),
  }
  const eventId = queryParams.get('event_id');
  const selectedTab: ValidTab = tab != null && validTabs.includes(tab) ? tab : DEFAULT_TAB;
  useEffect(() => {
    if (!_.isEqual(_.omitBy(porterApp, _.isEmpty), _.omitBy(tempPorterApp, _.isEmpty))) {
      setButtonStatus("");
      setShowUnsavedChangesBanner(true);
    } else {
      setShowUnsavedChangesBanner(false);
    }
  }, [tempPorterApp, porterApp]);

  useEffect(() => {
    const { appName } = props.match.params as any;
    if (currentCluster && appName && currentProject) {
      getPorterApp({ revision: 0 });
    }
  }, [currentCluster]);

  // this method fetches and reconstructs the porter yaml as well as the DB info (stored in PorterApp)
  const getPorterApp = async ({ revision }: { revision: number }) => {
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
          revision,
        }
      );
      let preDeployChartData;
      // get the pre-deploy chart
      try {
        preDeployChartData = await api.getChart(
          "<token>",
          {},
          {
            id: currentProject.id,
            namespace: `porter-stack-${appName}`,
            cluster_id: currentCluster.id,
            name: `${appName}-r`,
            // this is always latest because we do not tie the pre-deploy chart to the umbrella chart
            revision: 0,
          }
        );
      } catch (err) {
        // that's ok if there's an error, just means there is no pre-deploy chart
      }
      // update apps and release
      const newAppData = {
        app: resPorterApp?.data,
        chart: resChartData?.data,
        releaseChart: preDeployChartData?.data,
      };
      const porterJson = await fetchPorterYamlContent(
        resPorterApp?.data?.porter_yaml_path ?? "porter.yaml",
        newAppData
      );

      const envGroups: NewPopulatedEnvGroup[] = await api
        .getAllEnvGroups<any[]>(
          "<token>",
          {},
          {
            id: currentProject?.id,
            cluster_id: currentCluster?.id,
          }
        )
        .then((res) => res?.data?.environment_groups)
        .catch((error) => {
          console.error("Failed to fetch environment groups:", error);
          return [];
        });
      let filteredEnvGroups: NewPopulatedEnvGroup[] = [];

      if (envGroups) {
        filteredEnvGroups = envGroups?.filter(envGroup =>
          envGroup?.linked_applications?.length > 0 && envGroup?.linked_applications?.includes(appName)
        );
      }

      setSyncedEnvGroups(filteredEnvGroups || []);
      setPorterJson(porterJson);
      setAppData(newAppData);
      const globalImage = resChartData.data.config?.global?.image
      const hasBuiltImage = globalImage?.repository != null &&
        globalImage.tag != null &&
        !(globalImage.repository === ImageInfo.BASE_IMAGE.repository &&
          globalImage.tag === ImageInfo.BASE_IMAGE.tag)
      // annoying that we have to parse buildpacks like this but alas
      const parsedPorterApp = { ...resPorterApp?.data, buildpacks: newAppData.app.buildpacks?.split(",") ?? [] };
      if (parsedPorterApp.image_repo_uri && hasBuiltImage) {
        parsedPorterApp.image_info = { repository: globalImage.repository, tag: globalImage.tag };
      }
      setPorterApp(parsedPorterApp);
      setTempPorterApp(parsedPorterApp);
      setBuildView(!_.isEmpty(parsedPorterApp.dockerfile) ? "docker" : "buildpacks")
      const [newServices, newEnvVars] = updateServicesAndEnvVariables(
        resChartData?.data,
        preDeployChartData?.data,
        porterJson,
      );
      const finalPorterYaml = createFinalPorterYaml(
        newServices,
        newEnvVars,
        porterJson,
        // if we are using a heroku buildpack, inject a PORT env variable
        newAppData.app.builder?.includes("heroku")
      );
      setPorterYaml(finalPorterYaml);
      // Only check GHA status if no built image is set
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
          setGithubWorkflowFilename(`porter_stack_${resPorterApp.data.name}.yml`);
        } catch (err) {
          // Handle unmerged PR
          if (err.response?.status === 404) {
            try {
              // Check for user-copied porter.yml as fallback
              await api.getBranchContents(
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
              setGithubWorkflowFilename(`porter.yml`);
            } catch (err) {
              setWorkflowCheckPassed(false);
            }
          }
        }
      }
    } catch (err) {
      // TODO: handle error
    } finally {
      setIsLoading(false);
    }
  };

  const deletePorterApp = async (deleteGHWorkflowFile?: boolean) => {
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
    } catch (err) {
      // TODO: handle error
    }
    try {
      await api.deleteNamespace(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          id: currentProject.id,
          namespace: `porter-stack-${appName}`,
        }
      );
    } catch (err) {
      // TODO: handle error
    }

    let deleteWorkflowFile = false;

    if (deleteGHWorkflowFile && githubWorkflowFilename !== "" && appData?.app != null) {
      try {
        const res = await api.createSecretAndOpenGitHubPullRequest(
          "<token>",
          {
            github_app_installation_id: appData.app.git_repo_id,
            github_repo_owner: appData.app.repo_name.split("/")[0],
            github_repo_name: appData.app.repo_name.split("/")[1],
            branch: appData.app.git_branch,
            delete_workflow_filename: githubWorkflowFilename,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            stack_name: appData.app.name,
          }
        );
        if (res.data?.url) {
          window.open(res.data.url, "_blank", "noreferrer");
        }
        deleteWorkflowFile = true;
      } catch (err) {
        // TODO: handle error
      }
    }

    // intentionally do not await this promise
    api.updateStackStep(
      "<token>",
      {
        step: "stack-deletion",
        stack_name: appName,
        delete_workflow_file: deleteWorkflowFile,
      },
      {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
      }
    );

    props.history.push("/apps");
  };

  const updatePorterApp = async (options: Partial<CreateUpdatePorterAppOptions>) => {
    try {
      setButtonStatus("loading");
      if (
        appData != null &&
        currentCluster != null &&
        currentProject != null &&
        appData.app != null &&
        tempPorterApp != null
      ) {
        const finalPorterYaml = createFinalPorterYaml(
          services,
          envVars,
          porterJson,
          // if we are using a heroku buildpack, inject a PORT env variable
          appData.app.builder?.includes("heroku")
        );
        const yamlString = yaml.dump(finalPorterYaml);
        const base64Encoded = btoa(yamlString);
        let updatedPorterApp = {
          porter_yaml: base64Encoded,
          override_release: true,
          ...PorterApp.empty(),
          build_context: tempPorterApp.build_context,
          repo_name: tempPorterApp.repo_name,
          git_branch: tempPorterApp.git_branch,
          buildpacks: "",
          environment_groups: syncedEnvGroups?.map((env) => env.name),
          user_update: true,
          ...options,
        }
        if (buildView === "docker") {
          updatedPorterApp.dockerfile = tempPorterApp.dockerfile;
          updatedPorterApp.builder = "null";
          updatedPorterApp.buildpacks = "null";
        } else {
          updatedPorterApp.builder = tempPorterApp.builder;
          updatedPorterApp.buildpacks = tempPorterApp.buildpacks.join(",");
          updatedPorterApp.dockerfile = "null";
        }
        if (tempPorterApp.image_info?.repository && tempPorterApp.image_info?.tag) {
          updatedPorterApp = { ...updatedPorterApp, image_info: tempPorterApp.image_info, image_repo_uri: tempPorterApp.image_info.repository }
        }

        await api.createPorterApp(
          "<token>",
          updatedPorterApp,
          {
            cluster_id: currentCluster.id,
            project_id: currentProject.id,
            stack_name: appData.app.name,
          }
        );


        setPorterYaml(finalPorterYaml);
        setPorterApp(tempPorterApp);
        setButtonStatus("success");
        setShowUnsavedChangesBanner(false);
        getPorterApp({ revision: 0 });
      } else {
        setButtonStatus(<Error message="Unable to update app" />);
      }
      // redirect to the default tab
      history.push(`/apps/${appData.app.name}/${DEFAULT_TAB}`);
    } catch (err) {
      // TODO: better error handling
      const errMessage =
        err?.response?.data?.error ??
        err?.toString() ??
        "An error occurred while deploying your app. Please try again.";
      setButtonStatus(<Error message={errMessage} />);
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
      const porterYamlToJson = parsedData ;
      return porterYamlToJson;
    } catch (err) {
      // TODO: handle error
    }
  };

  const renderIcon = (b: string, size?: string) => {
    let src = box;
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
    return <Icon src={src} height={"24px"} />;
  };

  const updateServicesAndEnvVariables = (
    currentChart?: ChartType,
    releaseChart?: ChartType,
    porterJson?: PorterJson,
  ): [Service[], KeyValueType[]] => {
    // handle normal chart
    const helmValues = currentChart?.config;
    const defaultValues = (currentChart?.chart as any)?.values;
    let newServices: Service[] = [];
    let envVars: KeyValueType[] = [];

    if (
      (defaultValues && Object.keys(defaultValues).length > 0) ||
      (helmValues && Object.keys(helmValues).length > 0)
    ) {
      newServices = Service.deserialize(helmValues, defaultValues, porterJson);
      const { global, ...helmValuesWithoutGlobal } = helmValues;
      if (Object.keys(helmValuesWithoutGlobal).length > 0) {
        envVars = Service.retrieveEnvFromHelmValues(helmValuesWithoutGlobal);
        setEnvVars(envVars);
        const subdomain = Service.retrieveSubdomainFromHelmValues(
          newServices,
          helmValuesWithoutGlobal
        );
        setSubdomain(subdomain);
      }
    }

    // handle release chart
    if (releaseChart?.config || porterJson?.release) {
      const release = Service.deserializeRelease(releaseChart?.config, porterJson);
      newServices.push(release);
    }

    setServices(newServices);

    return [newServices, envVars];
  };

  const setRevision = (chart: ChartType, isCurrent?: boolean) => {
    getPorterApp({ revision: isCurrent ? 0 : chart.version });
  };

  const getReadableDate = (s: string) => {
    const ts = new Date(s);
    const date = ts.toLocaleDateString();
    const time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };

  const onAppUpdate = (services: Service[], envVars: KeyValueType[]) => {
    const newPorterYaml = createFinalPorterYaml(
      services,
      envVars,
      porterJson,
      // if we are using a heroku buildpack, inject a PORT env variable
      appData.app.builder?.includes("heroku")
    );
    if (!_.isEqual(porterYaml, newPorterYaml)) {
      setButtonStatus("");
      setShowUnsavedChangesBanner(true);
    } else {
      setShowUnsavedChangesBanner(false);
    }
  };

  const renderTabContents = () => {
    switch (selectedTab) {
      case "activity":
        return <ActivityFeed
          chart={appData.chart}
          stackName={appData?.app?.name}
          appData={appData}
        />;
      case "events":
        if (eventId != null && eventId !== "") {
          return <EventFocusView
            eventId={eventId}
            appData={appData}
          />;
        }
        return <ActivityFeed
          chart={appData.chart}
          stackName={appData?.app?.name}
          appData={appData}
        />;
      case "overview":
        return (
          <>
            {/* pre-deploy stuff - only if this is from github! */}
            {!isLoading && appData?.app?.git_repo_id != null && (
              <>
                <Text size={16}>Pre-deploy job</Text>
                <Spacer y={0.5} />
                <Services
                  setServices={(release: Service[]) => {
                    if (buttonStatus !== "") {
                      setButtonStatus("");
                    }
                    const nonRelease = services.filter(Service.isNonRelease)
                    const newServices = [...nonRelease, ...release]
                    setServices(newServices)
                    onAppUpdate(newServices, envVars)
                  }}
                  chart={appData.releaseChart}
                  services={services.filter(Service.isRelease)}
                  limitOne={true}
                  prePopulateService={Service.default("pre-deploy", "release", porterJson)}
                  addNewText={"Add a new pre-deploy job"}
                  defaultExpanded={false}
                />
                <Spacer y={0.5} />
              </>
            )}
            <Text size={16}>Application services</Text>
            <Spacer y={0.5} />
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
              setServices={(svcs: Service[]) => {
                if (buttonStatus !== "") {
                  setButtonStatus("");
                }
                const release = services.filter(Service.isRelease)
                const newServices = [...svcs, ...release]
                setServices(newServices);
                onAppUpdate(newServices, envVars);
              }}
              services={services.filter(Service.isNonRelease)}
              chart={appData.chart}
              addNewText={"Add a new service"}
              setExpandedJob={(x: string) => { setExpandedJob(x); }}
              appName={appData.app.name}
            />
            <Spacer y={0.75} />
            <Button
              onClick={async () => { await updatePorterApp({}); }}
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
          <BuildSettingsTab
            porterApp={tempPorterApp}
            setTempPorterApp={(attrs: Partial<PorterApp>) => { setTempPorterApp(PorterApp.setAttributes(tempPorterApp, attrs)); }}
            clearStatus={() => { setButtonStatus(""); }}
            updatePorterApp={updatePorterApp}
            buildView={buildView}
            setBuildView={setBuildView}
          />
        );
      case "image-settings":
        return (
          <ImageSettingsTab
            porterApp={tempPorterApp}
            setTempPorterApp={(attrs: Partial<PorterApp>) => { setTempPorterApp(PorterApp.setAttributes(tempPorterApp, attrs)); }}
            updatePorterApp={updatePorterApp}
          />
        )
      case "settings":
        return <SettingsTab
          appName={appData.app.name}
          githubWorkflowFilename={githubWorkflowFilename}
          deleteApplication={deletePorterApp}
        />;
      case "logs":
        return <LogSection
          currentChart={appData.chart}
          services={services.filter(svc => Service.isNonRelease(svc))}
          appName={appData.app.name}
          filterOpts={queryParamOpts}
        />;
      case "metrics":
        return <MetricsSection currentChart={appData.chart} appName={appData.app.name} serviceName={queryParamOpts.service} services={services} />;
      case "debug":
        return <StatusSectionFC currentChart={appData.chart} />;
      case "environment":
        return (
          <EnvVariablesTab
            envVars={envVars}
            setEnvVars={(envVars: KeyValueType[]) => {
              setEnvVars(envVars);
              // onAppUpdate(services, envVars.filter((e) => e.key !== "" || e.value !== ""));
            }}
            setShowUnsavedChangesBanner={setShowUnsavedChangesBanner}
            syncedEnvGroups={syncedEnvGroups}
            status={buttonStatus}
            updatePorterApp={updatePorterApp}
            clearStatus={() => { setButtonStatus(""); }}
            setSyncedEnvGroups={setSyncedEnvGroups}
            appData={appData}
            deletedEnvGroups={deletedEnvGroups}
            setDeletedEnvGroups={setDeleteEnvGroups}
          />
        );
      case "helm-values":
        return <HelmValuesTab
          currentChart={appData.chart}
          updatePorterApp={updatePorterApp}
          buttonStatus={buttonStatus}
        />;
      case "job-history":
        return <ExpandedJob
          appName={appData.app.name}
          jobName={queryParamOpts.service}
          goBack={() => { setExpandedJob(null); }}
        />;
      default:
        return <ActivityFeed
          chart={appData.chart}
          stackName={appData?.app?.name}
          appData={appData}
        />;
    }
  };

  return (
    <>
      {isLoading && <Loading />}
      {!isLoading && appData == null && (
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
      {!isLoading && appData?.app != null && (
        <StyledExpandedApp>
          <Back to="/apps" />
          <Container row>
            {renderIcon(appData.app?.buildpacks)}
            <Spacer inline x={1} />
            <Text size={21}>{appData.app.name}</Text>
            {appData.app.repo_name && (
              <>
                <Spacer inline x={1} />
                <Container row>
                  <A
                    target="_blank"
                    href={`https://github.com/${appData.app.repo_name}`}
                  >
                    <SmallIcon src={github} />
                    <Text size={13}>{appData.app.repo_name}</Text>
                  </A>
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
                  <a href={Service.prefixSubdomain(subdomain)} target="_blank" rel="noreferrer">
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
                isLoading ? (
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
                isLoading ? (
                  <Banner>
                    <Loading />
                  </Banner>
                ) : (
                  <Banner
                    suffix={
                      <>
                        <RefreshButton
                          onClick={() => { window.location.reload(); }}
                        >
                          <img src={refresh} />
                          Refresh
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
                )
              ) : (
                <>
                  <DarkMatter />
                  <PorterAppRevisionSection
                    showRevisions={showRevisions}
                    toggleShowRevisions={() => {
                      setShowRevisions(!showRevisions);
                    }}
                    chart={appData.chart}
                    setRevision={setRevision}
                    forceRefreshRevisions={forceRefreshRevisions}
                    refreshRevisionsOff={() => { setForceRefreshRevisions(false); }}
                    shouldUpdate={
                      appData.chart.latest_version &&
                      appData.chart.latest_version !==
                      appData.chart.chart.metadata.version
                    }
                    updatePorterApp={updatePorterApp}
                    latestVersion={appData.chart.latest_version}
                    appName={appData.app.name}
                  />
                  <DarkMatter antiHeight="-18px" />
                </>
              )}
              <Spacer y={1} />
              <AnimateHeight height={showUnsavedChangesBanner ? 67 : 0}>
                <Banner
                  type="warning"
                  suffix={
                    <>
                      <Button
                        onClick={async () => { await updatePorterApp({}); }}
                        status={buttonStatus}
                        loadingText={"Updating..."}
                        height={"10px"}
                      >
                        <Icon src={save} height={"13px"} />
                        <Spacer inline x={0.5} />
                        Save as latest version
                      </Button>
                    </>
                  }
                >
                  Changes you are currently previewing have not been saved.
                  <Spacer inline width="5px" />
                </Banner>
              </AnimateHeight>
              <TabSelector
                noBuffer
                options={[
                  { label: "Activity", value: "activity" },
                  { label: "Overview", value: "overview" },
                  hasBuiltImage && { label: "Logs", value: "logs" },
                  hasBuiltImage && { label: "Metrics", value: "metrics" },
                  hasBuiltImage && { label: "Debug", value: "debug" },
                  {
                    label: "Environment",
                    value: "environment",
                  },
                  appData.app.git_repo_id && {
                    label: "Build settings",
                    value: "build-settings",
                  },
                  hasBuiltImage && !appData.app.git_repo_id && {
                    label: "Image settings",
                    value: "image-settings",
                  },
                  { label: "Settings", value: "settings" },
                  (user.email.endsWith("porter.run") || currentProject.helm_values_enabled) && { label: "Helm values", value: "helm-values" },
                ].filter((x) => x)}
                currentTab={selectedTab}
                setCurrentTab={(tab: string) => {
                  if (buttonStatus !== "") {
                    setButtonStatus("");
                  }
                  props.history.push(`/apps/${appData.app.name}/${tab}`);
                }}
              />
              <Spacer y={1} />
              {renderTabContents()}
              <Spacer y={2} />
            </>
          )}
        </StyledExpandedApp>
      )}
    </>
  );
};

export default withRouter(ExpandedApp);

const A = styled.a`
  display: flex;
  align-items: center;
`;

const RefreshButton = styled.div`
  color: #ffffff;
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
