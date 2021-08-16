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

import { ActionConfigType, PorterTemplate, StorageType } from "shared/types";

type PropsType = RouteComponentProps & {
  currentTab?: string;
  currentTemplate: PorterTemplate;
  hideLaunchFlow: () => void;
  form: any;
};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  branch: "",
  git_repo_id: 0,
};

const LaunchFlow: React.FC<PropsType> = (props) => {
  const context = useContext(Context);

  const [currentPage, setCurrentPage] = useState("source");
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

  const getGHActionConfig = (chartName: string) => {
    let imageRepoUri = `${selectedRegistry.url}/${chartName}-${selectedNamespace}`;

    // DockerHub registry integration is per repo
    if (selectedRegistry.service === "dockerhub") {
      imageRepoUri = selectedRegistry.url;
    }

    return {
      git_repo: actionConfig.git_repo,
      git_branch: branch,
      registry_id: selectedRegistry.id,
      dockerfile_path: dockerfilePath,
      folder_path: folderPath,
      image_repo_uri: imageRepoUri,
      git_repo_id: actionConfig.git_repo_id,
    };
  };

  const handleSubmitAddon = (wildcard?: any) => {
    let { currentCluster, currentProject, setCurrentError } = context;
    let name = templateName || randomWords({ exactly: 3, join: "-" });
    setSaveValuesStatus("loading");

    let values = {};
    for (let key in wildcard) {
      _.set(values, key, wildcard[key]);
    }

    api
      .deployAddon(
        "<token>",
        {
          templateName: props.currentTemplate.name,
          storage: StorageType.Secret,
          formValues: values,
          namespace: selectedNamespace,
          name,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          name: props.currentTemplate.name.toLowerCase().trim(),
          version: props.currentTemplate?.currentVersion || "latest",
          repo_url: process.env.ADDON_CHART_REPO_URL,
        }
      )
      .then((_) => {
        // props.setCurrentView('cluster-dashboard');
        setSaveValuesStatus("successful");
        // redirect to dashboard
        let dst =
          props.currentTemplate.name === "job" ? "/jobs" : "/applications";
        setTimeout(() => {
          pushFiltered(props, dst, ["project_id"], {
            cluster: currentCluster.name,
          });
        }, 500);
        window.analytics.track("Deployed Add-on", {
          name: props.currentTemplate.name,
          namespace: selectedNamespace,
          values: values,
        });
      })
      .catch((err) => {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];

        err = parsedErr || err.message || JSON.stringify(err);

        setSaveValuesStatus(err);

        setCurrentError(err);
        window.analytics.track("Failed to Deploy Add-on", {
          name: props.currentTemplate.name,
          namespace: selectedNamespace,
          values: values,
          error: err,
        });
      });
  };

  const handleSubmit = async (rawValues: any) => {
    let { currentCluster, currentProject, setCurrentError } = context;
    let name = templateName || randomWords({ exactly: 3, join: "-" });
    setSaveValuesStatus("loading");

    // Convert dotted keys to nested objects
    let values: any = {};
    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    let url = imageUrl,
      tag = imageTag;
    if (url.includes(":")) {
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
      default:
        provider = "";
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
    // check if template is docker and create external domain if necessary
    if (props.currentTemplate.name == "web") {
      if (values?.ingress?.enabled && !values?.ingress?.custom_domain) {
        external_domain = await new Promise((resolve, reject) => {
          api
            .createSubdomain(
              "<token>",
              {
                release_name: name,
              },
              {
                id: currentProject.id,
                cluster_id: currentCluster.id,
              }
            )
            .then((res) => {
              resolve(res?.data?.external_url);
            })
            .catch((err) => {
              let parsedErr =
                err?.response?.data?.errors && err.response.data.errors[0];
              err = parsedErr || err.message || JSON.stringify(err);
              setSaveValuesStatus(`Could not create subdomain: ${err}`);

              setCurrentError(err);
            });
        });

        values.ingress.porter_hosts = [external_domain];
      }
    }

    let githubActionConfig = null;
    if (sourceType == "repo") {
      githubActionConfig = getGHActionConfig(name);
    }

    api
      .deployTemplate(
        "<token>",
        {
          templateName: props.currentTemplate.name,
          imageURL: url,
          storage: StorageType.Secret,
          formValues: values,
          namespace: selectedNamespace,
          name,
          githubActionConfig,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          name: props.currentTemplate.name.toLowerCase().trim(),
          version: props.currentTemplate?.currentVersion || "latest",
          repo_url: process.env.APPLICATION_CHART_REPO_URL,
        }
      )
      .then((res: any) => {
        // props.setCurrentView('cluster-dashboard');
        setSaveValuesStatus("successful");
        // redirect to dashboard with namespace
        setTimeout(() => {
          let dst =
            props.currentTemplate.name === "job" ? "/jobs" : "/applications";
          pushFiltered(props, dst, ["project_id"], {
            cluster: currentCluster.name,
          });
        }, 1000);
      })
      .catch((err: any) => {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];
        err = parsedErr || err.message || JSON.stringify(err);
        setSaveValuesStatus(`Could not deploy template: ${err}`);
        setCurrentError(err);
      });
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
        />
      );
    }

    // Display main (non-source) settings page
    return (
      <SettingsPage
        onSubmit={currentTab === "porter" ? handleSubmit : handleSubmitAddon}
        saveValuesStatus={saveValuesStatus}
        selectedNamespace={selectedNamespace}
        setSelectedNamespace={setSelectedNamespace}
        templateName={templateName}
        setTemplateName={setTemplateName}
        hasSource={currentTab === "porter"}
        setPage={setCurrentPage}
        form={form}
        valuesToOverride={valuesToOverride}
        clearValuesToOverride={() => setValuesToOverride(null)}
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
  let { name } = props.currentTemplate;
  if (hardcodedNames[name]) {
    name = hardcodedNames[name];
  }

  return (
    <StyledLaunchFlow>
      <TitleSection handleNavBack={props.hideLaunchFlow}>
        {renderIcon()}
        New {name} {currentTab === "porter" ? null : "Instance"}
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
  margin-top: calc(50vh - 380px);
`;
