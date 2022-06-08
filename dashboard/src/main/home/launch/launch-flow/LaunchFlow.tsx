import React, { useContext, useState } from "react";
import styled from "styled-components";
import _ from "lodash";
import randomWords from "random-words";
import { RouteComponentProps, withRouter } from "react-router";

import api from "shared/api";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";

import { hardcodedNames } from "shared/hardcodedNameDict";
import SourcePage from "./SourcePage";
import SettingsPage from "./SettingsPage";
import TitleSection from "components/TitleSection";

import {
  ActionConfigType,
  ChartTypeWithExtendedConfig,
  FullActionConfigType,
  PorterTemplate,
} from "shared/types";

type PropsType = RouteComponentProps & {
  currentTab?: string;
  currentTemplate: PorterTemplate;
  hideLaunchFlow: () => void;
  form: any;
  isCloning: boolean;
  clonedChart: ChartTypeWithExtendedConfig;
};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  git_branch: "",
  git_repo_id: 0,
  kind: "github",
};

const LaunchFlow: React.FC<PropsType> = (props) => {
  const context = useContext(Context);

  const [currentPage, setCurrentPage] = useState(
    props.isCloning ? "settings" : "source"
  );
  const [templateName, setTemplateName] = useState("");
  const [saveValuesStatus, setSaveValuesStatus] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [selectedNamespace, setSelectedNamespace] = useState("default");
  const [valuesToOverride, setValuesToOverride] = useState({});

  const [imageUrl, setImageUrl] = useState("");
  const [imageTag, setImageTag] = useState("");

  const [actionConfig, setActionConfig] = useState<ActionConfigType>({
    ...defaultActionConfig,
  });
  const [procfileProcess, setProcfileProcess] = useState("");
  const [branch, setBranch] = useState("");
  const [repoType, setRepoType] = useState("");
  const [dockerfilePath, setDockerfilePath] = useState(null);
  const [procfilePath, setProcfilePath] = useState(null);
  const [folderPath, setFolderPath] = useState(null);
  const [selectedRegistry, setSelectedRegistry] = useState(null);
  const [shouldCreateWorkflow, setShouldCreateWorkflow] = useState(true);
  const [buildConfig, setBuildConfig] = useState();

  const generateRandomName = () => {
    const randomTemplateName = randomWords({ exactly: 3, join: "-" });
    return randomTemplateName;
  };

  const getFullActionConfig = (): FullActionConfigType => {
    let imageRepoUri = `${selectedRegistry?.url}/${templateName}-${selectedNamespace}`;

    // DockerHub registry integration is per repo
    if (selectedRegistry?.service === "dockerhub") {
      imageRepoUri = selectedRegistry?.url;
    }

    if (actionConfig.kind === "github") {
      return {
        kind: "github",
        git_repo: actionConfig.git_repo,
        git_branch: branch,
        registry_id: selectedRegistry?.id,
        dockerfile_path: dockerfilePath,
        folder_path: folderPath,
        image_repo_uri: imageRepoUri,
        git_repo_id: actionConfig.git_repo_id,
        should_create_workflow: shouldCreateWorkflow,
      };
    } else {
      return {
        kind: "gitlab",
        git_repo: actionConfig.git_repo,
        git_branch: branch,
        registry_id: selectedRegistry?.id,
        dockerfile_path: dockerfilePath,
        folder_path: folderPath,
        image_repo_uri: imageRepoUri,
        gitlab_integration_id: actionConfig.gitlab_integration_id,
        should_create_workflow: shouldCreateWorkflow,
      };
    }
  };

  const handleSubmitAddon = async (wildcard?: any) => {
    let { currentCluster, currentProject, setCurrentError } = context;
    setSaveValuesStatus("loading");

    const name = templateName || generateRandomName();

    let values: any = {};
    for (let key in wildcard) {
      _.set(values, key, wildcard[key]);
    }

    api
      .deployAddon(
        "<token>",
        {
          template_name: props.currentTemplate.name,
          template_version: props.currentTemplate?.currentVersion || "latest",
          values: values,
          name,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: selectedNamespace,
          repo_url:
            props.currentTemplate?.repo_url || process.env.ADDON_CHART_REPO_URL,
        }
      )
      .then((_) => {
        window.analytics?.track("Deployed Add-on", {
          name: props.currentTemplate.name,
          namespace: selectedNamespace,
          values: values,
        });
      })
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;

        err = parsedErr || err.message || JSON.stringify(err);

        setSaveValuesStatus(err);

        setCurrentError(err);
        window.analytics?.track("Failed to Deploy Add-on", {
          name: props.currentTemplate.name,
          namespace: selectedNamespace,
          values: values,
          error: err,
        });
        return;
      });

    const synced = values?.container?.env?.synced || [];

    const addApplicationToEnvGroupPromises = synced.map((envGroup: any) => {
      return api.addApplicationToEnvGroup(
        "<token>",
        {
          name: envGroup?.name,
          app_name: name,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: selectedNamespace,
        }
      );
    });

    try {
      await Promise.all(addApplicationToEnvGroupPromises);
    } catch (error) {
      setCurrentError(
        "We coudln't sync the env group to the application, please go to your recently deployed application and try again through the environment tab."
      );
    }

    // props.setCurrentView('cluster-dashboard');
    setSaveValuesStatus("successful");
    // redirect to dashboard
    let dst = props.currentTemplate.name === "job" ? "/jobs" : "/applications";
    setTimeout(() => {
      pushFiltered(props, dst, ["project_id"], {
        cluster: currentCluster.name,
      });
    }, 500);
  };

  const handleSubmit = async (rawValues: any) => {
    let { currentCluster, currentProject, setCurrentError } = context;
    setSaveValuesStatus("loading");

    // Convert dotted keys to nested objects
    let values: any = {};
    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    let url = imageUrl;
    let tag = imageTag;

    if (props.isCloning) {
      url = props.clonedChart.config.image.repository;
      tag = props.clonedChart.config.image.tag;
    }

    if (url?.includes(":")) {
      let splits = url.split(":");
      url = splits[0];
      tag = splits[1];
    } else if (!tag) {
      tag = "latest";
    }

    if (sourceType === "repo") {
      if (props.currentTemplate?.name == "job") {
        url = "public.ecr.aws/o1j4x7p4/hello-porter-job";
        tag = "latest";
      } else {
        url = "public.ecr.aws/o1j4x7p4/hello-porter";
        tag = "latest";
      }
    }

    let provider;
    switch (currentCluster.service) {
      case "eks":
        provider = "aws";
        break;
      case "gke":
        provider = "gcp";
        break;
      case "doks":
        provider = "digitalocean";
        break;
      case "aks":
        provider = "azure";
        break;
      case "vke":
        provider = "vultr";
        break;
      default:
        provider = "";
    }

    // Check the server URL to see if we can detect the cluster provider.
    // There's no standard URL format for GCP that's why it's not currently included
    if (provider === "") {
      const server = currentCluster.server;

      if (server.includes("eks")) provider = "eks";
      else if (server.includes("ondigitalocean")) provider = "digitalocean";
      else if (server.includes("azmk8s")) provider = "azure";
      else if (server.includes("vultr")) provider = "vultr";
    }

    // don't overwrite for templates that already have a source (i.e. non-Docker templates)
    if (url && tag) {
      _.set(values, "image.repository", url);
      _.set(values, "image.tag", tag);
    }

    _.set(values, "ingress.provider", provider);

    // pause jobs automatically
    if (props.currentTemplate?.name == "job") {
      _.set(values, "paused", true);
    }

    var external_domain: string;

    const release_name = templateName || generateRandomName();
    // check if template is docker and create external domain if necessary
    if (props.currentTemplate.name == "web") {
      if (values?.ingress?.enabled && !values?.ingress?.custom_domain) {
        external_domain = await new Promise((resolve, reject) => {
          api
            .createSubdomain(
              "<token>",
              {},
              {
                id: currentProject.id,
                cluster_id: currentCluster.id,
                release_name,
                namespace: selectedNamespace,
              }
            )
            .then((res) => {
              resolve(res?.data?.external_url);
            })
            .catch((err) => {
              let parsedErr = err?.response?.data?.error;
              err = parsedErr || err.message || JSON.stringify(err);
              setSaveValuesStatus(`Could not create subdomain: ${err}`);

              setCurrentError(err);
            });
        });

        values.ingress.porter_hosts = [external_domain];
      }
    }

    let githubActionConfig: FullActionConfigType = null;
    if (sourceType === "repo") {
      if (props.isCloning) {
        githubActionConfig = props.clonedChart?.git_action_config;
      } else {
        githubActionConfig = getFullActionConfig();
      }
    }

    const synced = values?.container?.env?.synced || [];

    try {
      await api.deployTemplate(
        "<token>",
        {
          image_url: url,
          values: values,
          template_name: props.currentTemplate.name.toLowerCase().trim(),
          template_version: props.currentTemplate?.currentVersion || "latest",
          name: release_name,
          git_action_config: githubActionConfig,
          build_config: buildConfig,
          synced_env_groups: synced.map((s: any) => s.name),
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: selectedNamespace,
          repo_url: process.env.APPLICATION_CHART_REPO_URL,
        }
      );
      // props.setCurrentView('cluster-dashboard');
    } catch (err) {
      let parsedErr = err?.response?.data?.error;
      err = parsedErr || err.message || JSON.stringify(err);
      setSaveValuesStatus(`Could not deploy template: ${err}`);
      setCurrentError(err);
      return;
    }

    setSaveValuesStatus("successful");
    // redirect to dashboard with namespace
    setTimeout(() => {
      let dst =
        props.currentTemplate.name === "job" ? "/jobs" : "/applications";
      pushFiltered(props, dst, ["project_id"], {
        cluster: currentCluster.name,
      });
    }, 1000);
  };

  const renderCurrentPage = () => {
    let { form, currentTab } = props;

    if (currentPage === "source" && currentTab === "porter") {
      return (
        <SourcePage
          sourceType={sourceType}
          setSourceType={setSourceType}
          templateName={templateName}
          setPage={setCurrentPage}
          setTemplateName={setTemplateName}
          setValuesToOverride={setValuesToOverride}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          imageTag={imageTag}
          setImageTag={setImageTag}
          actionConfig={actionConfig}
          setActionConfig={setActionConfig}
          branch={branch}
          setBranch={setBranch}
          procfileProcess={procfileProcess}
          setProcfileProcess={setProcfileProcess}
          repoType={repoType}
          setRepoType={setRepoType}
          dockerfilePath={dockerfilePath}
          setDockerfilePath={setDockerfilePath}
          folderPath={folderPath}
          setFolderPath={setFolderPath}
          procfilePath={procfilePath}
          setProcfilePath={setProcfilePath}
          selectedRegistry={selectedRegistry}
          setSelectedRegistry={setSelectedRegistry}
          setBuildConfig={setBuildConfig}
        />
      );
    }

    if (!templateName && !props.isCloning && currentTab === "porter") {
      const newTemplateName = generateRandomName();
      setTemplateName(newTemplateName);
    }

    const fullActionConfig = getFullActionConfig();
    // Display main (non-source) settings page
    return (
      <SettingsPage
        isCloning={props.isCloning}
        onSubmit={currentTab === "porter" ? handleSubmit : handleSubmitAddon}
        saveValuesStatus={saveValuesStatus}
        selectedNamespace={selectedNamespace}
        setSelectedNamespace={setSelectedNamespace}
        templateName={templateName}
        setTemplateName={setTemplateName}
        hasSource={currentTab === "porter"}
        sourceType={sourceType}
        setPage={setCurrentPage}
        form={form}
        valuesToOverride={valuesToOverride}
        clearValuesToOverride={() => setValuesToOverride(null)}
        fullActionConfig={fullActionConfig}
      />
    );
  };

  const renderIcon = () => {
    let icon = props.currentTemplate?.icon;
    if (icon) {
      return <Icon src={icon} />;
    }

    return (
      <Polymer>
        <i className="material-icons">layers</i>
      </Polymer>
    );
  };

  let { currentTab } = props;
  let currentTemplateName = props.currentTemplate.name;
  if (hardcodedNames[currentTemplateName]) {
    currentTemplateName = hardcodedNames[currentTemplateName];
  }

  return (
    <StyledLaunchFlow disableMarginTop={props.isCloning}>
      <TitleSection handleNavBack={props.hideLaunchFlow}>
        {renderIcon()}
        {!props.isCloning
          ? `New ${currentTemplateName} ${
              currentTab !== "porter" ? "Instance" : ""
            }`
          : `Cloning ${currentTemplateName} deployment: ${props.clonedChart.name}`}
      </TitleSection>
      {renderCurrentPage()}
      <Br />
    </StyledLaunchFlow>
  );
};

export default withRouter(LaunchFlow);

const Br = styled.div`
  width: 100%;
  height: 120px;
`;

const Icon = styled.img`
  width: 40px;
  margin-right: 14px;

  opacity: 0;
  animation: floatIn 0.5s 0.2s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const Polymer = styled.div`
  margin-bottom: -3px;

  > i {
    color: ${(props) => props.theme.containerIcon};
    font-size: 24px;
    margin-left: 12px;
    margin-right: 3px;
  }
`;

const StyledLaunchFlow = styled.div`
  width: calc(90% - 130px);
  min-width: 300px;
  margin-top: ${(props: { disableMarginTop: boolean }) =>
    props.disableMarginTop ? "inherit" : "calc(50vh - 380px)"};
`;
