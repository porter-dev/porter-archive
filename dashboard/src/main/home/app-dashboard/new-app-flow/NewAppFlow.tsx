import React, { useState, useContext, useEffect } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";
import _ from "lodash";
import yaml from "js-yaml";
import github from "assets/github-white.png";

import { Context } from "shared/Context";
import api from "shared/api";
import web from "assets/web.png";

import Back from "components/porter/Back";
import DashboardHeader from "../../cluster-dashboard/DashboardHeader";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import VerticalSteps from "components/porter/VerticalSteps";
import Button from "components/porter/Button";
import SourceSelector, { SourceType } from "./SourceSelector";
import DynamicLink from "components/DynamicLink";

import SourceSettings from "./SourceSettings";
import Services from "./Services";
import EnvGroupArray, {
  KeyValueType,
} from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import GithubActionModal from "./GithubActionModal";
import {
  ActionConfigType,
  GithubActionConfigType,
  RepoType,
} from "shared/types";
import Error from "components/porter/Error";
import { z } from "zod";
import { PorterJson, PorterYamlSchema, createFinalPorterYaml } from "./schema";
import { Service } from "./serviceTypes";
import { Helper } from "components/form-components/Helper";
import GithubConnectModal from "./GithubConnectModal";

type Props = RouteComponentProps & {};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  git_branch: "",
  git_repo_id: 0,
  kind: "github",
};

interface FormState {
  applicationName: string;
  selectedSourceType: SourceType | undefined;
  serviceList: Service[];
  envVariables: KeyValueType[];
  releaseCommand: string;
}

const INITIAL_STATE: FormState = {
  applicationName: "",
  selectedSourceType: undefined,
  serviceList: [],
  envVariables: [],
  releaseCommand: "",
};

const Validators: {
  [key in keyof FormState]: (value: FormState[key]) => boolean;
} = {
  applicationName: (value: string) => value.trim().length > 0,
  selectedSourceType: (value: SourceType | undefined) => value !== undefined,
  serviceList: (value: Service[]) => value.length > 0,
  envVariables: (value: KeyValueType[]) => true,
  releaseCommand: (value: string) => true,
};

type Detected = {
  detected: boolean;
  message: string;
};

const NewAppFlow: React.FC<Props> = ({ ...props }) => {
  const [templateName, setTemplateName] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [imageTag, setImageTag] = useState("latest");
  const { currentCluster, currentProject } = useContext(Context);
  const [deploying, setDeploying] = useState<boolean>(false);
  const [deploymentError, setDeploymentError] = useState<string | undefined>(
    undefined
  );
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [existingStep, setExistingStep] = useState<number>(0);
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [actionConfig, setActionConfig] = useState<ActionConfigType>({
    ...defaultActionConfig,
  });
  const [branch, setBranch] = useState("");
  const [dockerfilePath, setDockerfilePath] = useState(null);
  const [procfilePath, setProcfilePath] = useState(null);
  const [folderPath, setFolderPath] = useState(null);
  const [buildConfig, setBuildConfig] = useState({});
  const [porterYaml, setPorterYaml] = useState("");
  const [showGHAModal, setShowGHAModal] = useState<boolean>(false);
  const [showConnectModal, setConnectModal] = useState<boolean>(false);
  const [hasClickedDoNotConnect, setHasClickedDoNotConnect] = useState(() =>
    JSON.parse(localStorage.getItem("hasClickedDoNotConnect") || "false")
  );

  const [porterJson, setPorterJson] = useState<PorterJson | undefined>(
    undefined
  );
  const [detected, setDetected] = useState<Detected | undefined>(undefined);

  const validatePorterYaml = (yamlString: string) => {
    let parsedYaml;
    try {
      parsedYaml = yaml.load(yamlString);
      const parsedData = PorterYamlSchema.parse(parsedYaml);
      const porterYamlToJson = parsedData as PorterJson;
      setPorterJson(porterYamlToJson);
      const newServices = [];
      const existingServices = formState.serviceList.map((s) => s.name);
      for (const [name, app] of Object.entries(porterYamlToJson.apps)) {
        if (!existingServices.includes(name)) {
          if (app.type) {
            newServices.push(Service.default(name, app.type, porterYamlToJson));
          } else if (name.includes("web")) {
            newServices.push(Service.default(name, "web", porterYamlToJson));
          } else {
            newServices.push(Service.default(name, "worker", porterYamlToJson));
          }
        }
      }
      const newServiceList = [...formState.serviceList, ...newServices];
      setFormState({ ...formState, serviceList: newServiceList });
      if (Validators.serviceList(newServiceList)) {
        setCurrentStep(Math.max(currentStep, 4));
      }
      if (
        porterYamlToJson &&
        porterYamlToJson.apps &&
        Object.keys(porterYamlToJson.apps).length > 0
      ) {
        setDetected({
          detected: true,
          message: `Detected ${Object.keys(porterYamlToJson.apps).length
            } apps from porter.yaml`,
        });
      } else {
        setDetected({
          detected: false,
          message:
            "Could not detect any apps from porter.yaml. Make sure it exists in the root of your repo.",
        });
      }
    } catch (error) {
      console.log("Error converting porter yaml file to input: " + error);
    }
  };

  // const renderGithubConnect = () => {
  //   const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  //   const encoded_redirect_uri = encodeURIComponent(url);

  //   if (accessError) {
  //     return (
  //       <ListWrapper>
  //         <Helper>
  //           No connected repositories found.
  //           <A href={"/api/integrations/github-app/oauth"}>
  //             Authorize Porter to view your repositories.
  //           </A>
  //         </Helper>
  //       </ListWrapper>
  //     );
  //   } else if (!accessData.accounts || accessData.accounts?.length == 0) {
  //     return (
  //       <>
  //         <Text size={16}>No connected repositories were found.</Text>
  //         <ConnectToGithubButton
  //           href={`/api/integrations/github-app/install?redirect_uri=${encoded_redirect_uri}`}
  //         >
  //           <GitHubIcon src={github} /> Connect to GitHub
  //         </ConnectToGithubButton>
  //       </>
  //     );
  //   }
  // };
  // Deploys a Helm chart and writes build settings to the DB
  const isAppNameValid = (name: string) => {
    const regex = /^[a-z0-9-]{1,61}$/;
    return regex.test(name);
  };
  const handleAppNameChange = (name: string) => {
    setCurrentStep(currentStep);
    setFormState({ ...formState, applicationName: name });
    if (isAppNameValid(name) && Validators.applicationName(name)) {
      setCurrentStep(Math.max(Math.max(currentStep, 1), existingStep));
    } else {
      setExistingStep(Math.max(currentStep, existingStep));
      setCurrentStep(0);
    }
  };

  const shouldHighlightAppNameInput = () => {
    return (
      formState.applicationName !== "" &&
      (!isAppNameValid(formState.applicationName) ||
        formState.applicationName.length > 61)
    );
  };
  const handleDoNotConnect = () => {
    setHasClickedDoNotConnect(true);
    localStorage.setItem("hasClickedDoNotConnect", "true");
  };

  const deployPorterApp = async () => {
    try {
      setDeploying(true);
      setDeploymentError(undefined);
      if (
        currentProject == null ||
        currentCluster == null ||
        currentProject.id == null ||
        currentCluster.id == null
      ) {
        throw "Project or cluster not found";
      }

      // validate form data
      const finalPorterYaml = createFinalPorterYaml(
        formState.serviceList,
        formState.envVariables,
        porterJson,
      );

      const yamlString = yaml.dump(finalPorterYaml);
      const base64Encoded = btoa(yamlString);
      const imageInfo = imageUrl
        ? {
          image_info: {
            repository: imageUrl,
            tag: imageTag,
          },
        }
        : {};

      await api.createPorterApp(
        "<token>",
        {
          name: formState.applicationName,
          repo_name: actionConfig.git_repo,
          git_branch: branch,
          git_repo_id: actionConfig?.git_repo_id,
          build_context: folderPath,
          builder: (buildConfig as any)?.builder,
          buildpacks: (buildConfig as any)?.buildpacks?.join(",") ?? "",
          dockerfile: dockerfilePath,
          image_repo_uri: imageUrl,
          porter_yaml: base64Encoded,
          ...imageInfo,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      );

      if (!actionConfig?.git_repo) {
        props.history.push(`/apps/${formState.applicationName}`);
      }
      return true;
    } catch (err) {
      // TODO: better error handling
      console.log(err);
      const errMessage =
        err?.response?.data?.error ??
        err?.toString() ??
        "An error occurred while deploying your app. Please try again.";
      setDeploymentError(errMessage);

      return false;
    } finally {
      setDeploying(false);
    }
  };

  // useEffect(() => {
  //   const fetchGithubAccounts = async () => {
  //     try {
  //       const { data } = await api.getGithubAccounts("<token>", {}, {});
  //       setAccessData(data);
  //       if (data) {
  //         setHasProviders(false);
  //       }
  //     } catch (error) {
  //       setAccessError(true);
  //     } finally {
  //       setAccessLoading(false);
  //     }

  //     setConnectModal(
  //       !hasClickedDoNotConnect && (!hasProviders || accessError)
  //     );
  //   };

  //   fetchGithubAccounts();
  // }, [hasClickedDoNotConnect, accessData.accounts, accessError]);

  return (
    <CenterWrapper>
      <Div>
        {showConnectModal && (
          <GithubConnectModal
            closeModal={() => setConnectModal(false)}
            hasClickedDoNotConnect={hasClickedDoNotConnect}
            handleDoNotConnect={handleDoNotConnect}
          />
        )}
        <StyledConfigureTemplate>
          <Back to="/apps" />
          <DashboardHeader
            prefix={<Icon src={web} />}
            title="Deploy a new application"
            capitalize={false}
            disableLineBreak
          />
          <DarkMatter />
          <VerticalSteps
            currentStep={currentStep}
            steps={[
              <>
                <Text size={16}>Application name</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Lowercase letters, numbers, and "-" only.
                </Text>
                <Spacer y={0.5} />
                <Input
                  placeholder="ex: academic-sophon"
                  value={formState.applicationName}
                  width="300px"
                  error={
                    shouldHighlightAppNameInput() &&
                    (formState.applicationName.length > 61
                      ? "Maximum 61 characters allowed."
                      : 'Lowercase letters, numbers, and "-" only.')
                  }
                  setValue={(e) => {
                    handleAppNameChange(e);
                  }}
                />
                {shouldHighlightAppNameInput()}
              </>,
              <>
                <Text size={16}>Deployment method</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Deploy from a Git repository or a Docker registry.
                  <a
                    href="https://docs.porter.run/deploying-applications/overview"
                    target="_blank"
                  >
                    &nbsp;Learn more.
                  </a>
                </Text>
                <Spacer y={0.5} />
                <SourceSelector
                  selectedSourceType={formState.selectedSourceType}
                  setSourceType={(type) => {
                    setFormState({ ...formState, selectedSourceType: type });
                  }}
                />
                <SourceSettings
                  source={formState.selectedSourceType}
                  imageUrl={imageUrl}
                  setImageUrl={(x) => {
                    setImageUrl(x);
                    setCurrentStep(Math.max(currentStep, 2));
                  }}
                  imageTag={imageTag}
                  setImageTag={setImageTag}
                  actionConfig={actionConfig}
                  setActionConfig={setActionConfig}
                  branch={branch}
                  setBranch={setBranch}
                  dockerfilePath={dockerfilePath}
                  setDockerfilePath={setDockerfilePath}
                  folderPath={folderPath}
                  setFolderPath={setFolderPath}
                  procfilePath={procfilePath}
                  setProcfilePath={setProcfilePath}
                  setBuildConfig={setBuildConfig}
                  porterYaml={porterYaml}
                  setPorterYaml={(newYaml: string) => {
                    validatePorterYaml(newYaml);
                  }}
                />
              </>,
              <>
                <Text size={16}>
                  Application services{" "}
                  {detected && (
                    <AppearingDiv>
                      <Text
                        color={detected.detected ? "#4797ff" : "#fcba03"}
                      >
                        {detected.detected ? (
                          <I className="material-icons">check</I>
                        ) : (
                          <I className="material-icons">error</I>
                        )}
                        {detected.message}
                      </Text>
                    </AppearingDiv>
                  )}
                </Text>
                <Spacer y={0.5} />
                <Services
                  setServices={(services: Service[]) => {
                    setFormState({ ...formState, serviceList: services });
                    if (Validators.serviceList(services)) {
                      setCurrentStep(Math.max(currentStep, 4));
                    }
                  }}
                  services={formState.serviceList}
                />
              </>,
              <>
                <Text size={16}>Environment variables (optional)</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Specify environment variables shared among all services.
                </Text>
                <EnvGroupArray
                  values={formState.envVariables}
                  setValues={(x: any) => {
                    setFormState({ ...formState, envVariables: x });
                  }}
                  fileUpload={true}
                />
              </>,
              /*
              <>
                <Text size={16}>Release command (optional)</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  If specified, this command will be run before every
                  deployment.
                </Text>
                <Spacer y={0.5} />
                <Input
                  placeholder="yarn ./scripts/run-migrations.js"
                  value={formState.releaseCommand}
                  width="300px"
                  setValue={(e) => {
                    setFormState({ ...formState, releaseCommand: e });
                    if (Validators.releaseCommand(e)) {
                      setCurrentStep(Math.max(currentStep, 6));
                    }
                  }}
                />
              </>,
              */
              <Button
                onClick={() => {
                  if (imageUrl) {
                    deployPorterApp();
                  } else {
                    setDeploymentError(undefined);
                    setShowGHAModal(true);
                  }
                }}
                status={
                  deploying ? (
                    "loading"
                  ) : deploymentError ? (
                    <Error message={deploymentError} />
                  ) : undefined
                }
                loadingText={"Deploying..."}
                width={"120px"}
              >
                Deploy app
              </Button>,
            ]}
          />
          <Spacer y={3} />
        </StyledConfigureTemplate>
      </Div>
      {showGHAModal && (
        <GithubActionModal
          closeModal={() => setShowGHAModal(false)}
          githubAppInstallationID={actionConfig.git_repo_id}
          githubRepoOwner={actionConfig.git_repo.split("/")[0]}
          githubRepoName={actionConfig.git_repo.split("/")[1]}
          branch={branch}
          stackName={formState.applicationName}
          projectId={currentProject.id}
          clusterId={currentCluster.id}
          deployPorterApp={deployPorterApp}
          deploymentError={deploymentError}
        />
      )}
    </CenterWrapper>
  );
};

export default withRouter(NewAppFlow);

const I = styled.i`
  font-size: 18px;
  margin-right: 5px;
`;

const Div = styled.div`
  width: 100%;
  max-width: 900px;
`;

const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

const Icon = styled.img`
  margin-right: 15px;
  height: 28px;
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const AppearingDiv = styled.div`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  align-items: center;
  margin-left: 10px;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const StyledConfigureTemplate = styled.div`
  height: 100%;
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
`;
const ListWrapper = styled.div`
  width: 100%;
  height: 240px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  margin-top: 20px;
  padding: 40px;
`;
const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
`;

const ConnectToGithubButton = styled.a`
  width: 180px;
  justify-content: center;
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  color: white;
  font-weight: 500;
  padding: 10px;
  overflow: hidden;
  white-space: nowrap;
  margin-top: 25px;
  border: 1px solid #494b4f;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#2E3338"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "" : "#353a3e"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const GitHubIcon = styled.img`
  width: 20px;
  filter: brightness(150%);
  margin-right: 10px;
`;
