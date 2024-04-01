import React, { useState, useContext, useEffect } from "react";
import styled from "styled-components";
import { type RouteComponentProps, withRouter } from "react-router";
import _ from "lodash";
import yaml from "js-yaml";

import { Context } from "shared/Context";
import api from "shared/api";
import web from "assets/web.png";
import sliders from "assets/sliders.svg";

import Back from "components/porter/Back";
import DashboardHeader from "../../cluster-dashboard/DashboardHeader";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import VerticalSteps from "components/porter/VerticalSteps";
import Button from "components/porter/Button";
import SourceSelector, { type SourceType } from "./SourceSelector";
import Container from "components/porter/Container";

import SourceSettings from "./SourceSettings";
import Services from "./Services";
import { type KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import GithubActionModal from "./GithubActionModal";
import Error from "components/porter/Error";
import { type PorterJson, PorterYamlSchema, createFinalPorterYaml } from "./schema";
import { ImageInfo, Service } from "./serviceTypes";
import GithubConnectModal from "./GithubConnectModal";
import Link from "components/porter/Link";
import { type BuildMethod, PorterApp } from "../types/porterApp";
import { type NewPopulatedEnvGroup, PartialEnvGroup, type PopulatedEnvGroup } from "components/porter-form/types";
import EnvGroupArrayStacks from "main/home/cluster-dashboard/env-groups/EnvGroupArrayStacks";
import EnvGroupModal from "../expanded-app/env-vars/EnvGroupModal";
import ExpandableEnvGroup from "../expanded-app/env-vars/ExpandableEnvGroup";

type Props = RouteComponentProps & {};

type FormState = {
  applicationName: string;
  selectedSourceType: SourceType | undefined;
  serviceList: Service[];
  envVariables: KeyValueType[];
}

const INITIAL_STATE: FormState = {
  applicationName: "",
  selectedSourceType: undefined,
  serviceList: [],
  envVariables: [],
};

const Validators: {
  [key in keyof FormState]: (value: FormState[key]) => boolean;
} = {
  applicationName: (value: string) => value.trim().length > 0,
  selectedSourceType: (value: SourceType | undefined) => value !== undefined,
  serviceList: (value: Service[]) => value.length > 0,
  envVariables: (value: KeyValueType[]) => true,
};

type Detected = {
  detected: boolean;
  message: string;
};
type GithubAppAccessData = {
  username?: string;
  accounts?: string[];
}

type PorterJsonWithPath = {
  porterYamlPath: string;
  porterJson: PorterJson;
}

const NewAppFlow: React.FC<Props> = ({ ...props }) => {
  const [porterApp, setPorterApp] = useState<PorterApp>(PorterApp.empty());
  const [hovered, setHovered] = useState(false);

  const [imageTag, setImageTag] = useState("");
  const { currentCluster, currentProject } = useContext(Context);
  const [deploying, setDeploying] = useState<boolean>(false);
  const [deploymentError, setDeploymentError] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [existingStep, setExistingStep] = useState<number>(0);
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [porterYaml, setPorterYaml] = useState("");
  const [showGHAModal, setShowGHAModal] = useState<boolean>(false);
  const [showGithubConnectModal, setShowGithubConnectModal] = useState<boolean>(
    false
  );

  const [showConnectModal, setConnectModal] = useState<boolean>(true);
  const [hasClickedDoNotConnect, setHasClickedDoNotConnect] = useState(() =>
    JSON.parse(localStorage.getItem("hasClickedDoNotConnect") || "false")
  );
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(false);
  const [accessData, setAccessData] = useState<GithubAppAccessData>({});
  const [hasProviders, setHasProviders] = useState(true);

  const [porterJsonWithPath, setPorterJsonWithPath] = useState<PorterJsonWithPath | undefined>(undefined);
  const [detected, setDetected] = useState<Detected | undefined>(undefined);
  const [buildView, setBuildView] = useState<BuildMethod>("buildpacks");

  const [existingApps, setExistingApps] = useState<string[]>([]);
  const [appNameInputError, setAppNameInputError] = useState<string | undefined>(undefined);

  const [syncedEnvGroups, setSyncedEnvGroups] = useState<NewPopulatedEnvGroup[]>([]);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [deletedEnvGroups, setDeleteEnvGroups] = useState<NewPopulatedEnvGroup[]>([])

  // this advances the step in the case that a user chooses a repo that doesn't have a porter.yaml
  useEffect(() => {
    if (porterApp.git_branch !== "") {
      setCurrentStep(Math.max(currentStep, 2));
    }
  }, [porterApp.git_branch]);

  useEffect(() => {
    let isSubscribed = true;

    if (currentProject == null) {
      return;
    }

    api
      .getGitProviders("<token>", {}, { project_id: currentProject?.id })
      .then((res) => {
        const data = res.data;
        if (!isSubscribed) {
          return;
        }

        if (!Array.isArray(data)) {
          setHasProviders(false);
          
        }
      })
      .catch((err) => {
        setHasProviders(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject]);

  useEffect(() => {
    const getApps = async () => {
      try {
        const res = await api.getPorterApps(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        );
        if (res?.data != null) {
          setExistingApps(res.data.map((app: PorterApp) => app.name));
        }
      } catch (err) {
      }
    };
    getApps();
  }, [])

  useEffect(() => {
    setFormState({ ...formState, serviceList: [] });
    setDetected(undefined);
  }, [porterApp.git_branch]);

  const handleSetAccessData = (data: GithubAppAccessData) => {
    setAccessData(data);
    setShowGithubConnectModal(
      !hasClickedDoNotConnect &&
      (accessError || !data.accounts || data.accounts?.length === 0)
    );
  };

  const handleSetAccessError = (error: boolean) => {
    setAccessError(error);
    setShowGithubConnectModal(
      !hasClickedDoNotConnect &&
      (error || !accessData.accounts || accessData.accounts?.length === 0)
    );
  };

  const updateStackStep = async (step: string, errorMessage: string = "") => {
    try {
      if (currentCluster?.id == null || currentProject?.id == null) {
        throw "Unable to capture analytics, project or cluster not found";
      }
      await api.updateStackStep(
        "<token>",
        {
          step,
          stack_name: porterApp.name,
          error_message: errorMessage,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      );
    } catch (err) {
      // TODO: handle analytics error
    }
  };

  const validateAndSetPorterYaml = (yamlString: string, filename: string) => {
    let parsedYaml;
    try {
      parsedYaml = yaml.load(yamlString);
      const parsedData = PorterYamlSchema.parse(parsedYaml);
      const porterYamlToJson = parsedData ;
      setPorterJsonWithPath({ porterJson: porterYamlToJson, porterYamlPath: filename });
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
      if (porterYamlToJson.release != null && !existingServices.includes("pre-deploy")) {
        newServices.push(Service.default("pre-deploy", "release", porterYamlToJson));
      }
      const newServiceList = [...formState.serviceList, ...newServices];
      if (Validators.serviceList(newServiceList)) {
        setCurrentStep(Math.max(currentStep, 5));
      }
      setFormState({
        ...formState,
        serviceList: newServiceList,
      });
      if (
        porterYamlToJson &&
        porterYamlToJson.apps &&
        Object.keys(porterYamlToJson.apps).length > 0
      ) {
        setDetected({
          detected: true,
          message: `Detected ${Object.keys(porterYamlToJson.apps).length
            } service${Object.keys(porterYamlToJson.apps).length === 1 ? "" : "s"} from porter.yaml`,
        });
      } else {
        setDetected({
          detected: false,
          message:
            "Could not detect any services from porter.yaml. Make sure it exists in the root of your repo.",
        });
      }
    } catch (error) {
      console.log("Error converting porter yaml file to input: " + error);
    }
  };

  const handleAppNameChange = (name: string) => {
    setPorterApp(PorterApp.setAttribute(porterApp, "name", name));
    const appNameInputError = getAppNameInputError(name);
    if (appNameInputError == null) {
      setCurrentStep(Math.max(Math.max(currentStep, 1), existingStep));
    } else {
      setExistingStep(Math.max(currentStep, existingStep));
      setCurrentStep(0);
    }
    setAppNameInputError(appNameInputError);
  };

  const handleDoNotConnect = () => {
    setHasClickedDoNotConnect(true);
    localStorage.setItem("hasClickedDoNotConnect", "true");
  };

  const getAppNameInputError = (name: string) => {
    const regex = /^[a-z0-9-]{1,61}$/;
    if (name === "") {
      return undefined;
    } else if (!regex.test(name)) {
      return 'Lowercase letters, numbers, and "-" only.';
    } else if (name.length > 30) {
      return "Maximum 30 characters allowed.";
    } else if (existingApps.includes(name)) {
      return "An app with this name already exists.";
    }
    return undefined;
  };

  const deleteEnvGroup = (envGroup: PopulatedEnvGroup) => {
    setDeleteEnvGroups([...deletedEnvGroups, envGroup]);
    setSyncedEnvGroups(syncedEnvGroups?.filter(
      (env) => env.name !== envGroup.name
    ))
  }

  const deployPorterApp = async () => {
    try {
      setDeploying(true);
      setDeploymentError(undefined);

      // log analytics event that we started form submission
      updateStackStep("stack-launch-complete");

      if (currentProject?.id == null || currentCluster?.id == null) {
        throw "Project or cluster not found";
      }

      // validate form data
      const finalPorterYaml = createFinalPorterYaml(
        formState.serviceList,
        formState.envVariables,
        porterJsonWithPath?.porterJson,
        // if we are using a heroku buildpack, inject a PORT env variable
        porterApp.builder.includes("heroku")
      );

      const yamlString = yaml.dump(finalPorterYaml);
      const base64Encoded = btoa(yamlString);
      const imageInfo: ImageInfo = ImageInfo.BASE_IMAGE;

      const porterAppRequest = {
        porter_yaml: base64Encoded,
        override_release: true,
        ...PorterApp.empty(),
        image_info: imageInfo,
        buildpacks: "",
        // for some reason I couldn't get the path to update the porterApp object correctly here so I just grouped it with the porter json :/
        porter_yaml_path: porterJsonWithPath?.porterYamlPath,
        repo_name: porterApp.repo_name,
        git_branch: porterApp.git_branch,
        git_repo_id: porterApp.git_repo_id,
        build_context: porterApp.build_context,
        image_repo_uri: porterApp.image_repo_uri,
        environment_groups: syncedEnvGroups?.map((env: NewPopulatedEnvGroup) => env.name),
        user_update: true,
      }
      if (porterApp.image_repo_uri && imageTag) {
        porterAppRequest.image_info = {
          repository: porterApp.image_repo_uri,
          tag: imageTag,
        };
        porterAppRequest.repo_name = "";
        porterAppRequest.git_branch = "";
        porterAppRequest.git_repo_id = 0;
      } else if (buildView === "docker") {
        if (porterApp.dockerfile === "") {
          porterAppRequest.dockerfile = "./Dockerfile";
        } else {
          if (!porterApp.dockerfile.startsWith("./") && !porterApp.dockerfile.startsWith("/")) {
            porterAppRequest.dockerfile = `./${porterApp.dockerfile}`;
          } else {
            porterAppRequest.dockerfile = porterApp.dockerfile;
          }
        }
      } else {
        porterAppRequest.builder = porterApp.builder;
        porterAppRequest.buildpacks = porterApp.buildpacks.join(",");
      }

      await api.createPorterApp(
        "<token>",
        porterAppRequest,
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          stack_name: porterApp.name,
        }
      );

      if (porterAppRequest.repo_name === "") {
        props.history.push(`/apps/${porterApp.name}`);
      }

      // log analytics event that we successfully deployed
      updateStackStep("stack-launch-success");

      return true;
    } catch (err: any) {
      // TODO: better error handling
      const errMessage =
        err?.response?.data?.error ??
        err?.toString() ??
        "An error occurred while deploying your app. Please try again.";
      setDeploymentError(errMessage);
      updateStackStep("stack-launch-failure", errMessage);
      return false;
    } finally {
      setDeploying(false);
    }
  };
  const maxEnvGroupsReached = syncedEnvGroups.length >= 4;


  return (
    <CenterWrapper>
      <Div>
        {showConnectModal && !hasProviders && (
          <GithubConnectModal
            closeModal={() => { setConnectModal(false); }}
            hasClickedDoNotConnect={hasClickedDoNotConnect}
            handleDoNotConnect={handleDoNotConnect}
            accessData={accessData}
            setAccessLoading={setAccessLoading}
            accessError={accessError}
            setAccessData={handleSetAccessData}
            setAccessError={handleSetAccessError}
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
                  value={porterApp.name}
                  width="300px"
                  error={appNameInputError}
                  setValue={handleAppNameChange}
                />
              </>,
              <>
                <Text size={16}>Deployment method</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Deploy from a Git repository or a Docker registry.
                  <Spacer inline width="5px" />
                  <Link
                    hasunderline
                    to="https://docs.porter.run/standard/deploying-applications/overview"
                    target="_blank"
                  >
                    Learn more
                  </Link>
                </Text>
                <Spacer y={0.5} />
                <SourceSelector
                  selectedSourceType={formState.selectedSourceType}
                  setSourceType={(type) => {
                    setPorterYaml("");
                    setFormState({ ...formState, selectedSourceType: type });
                  }}
                />
                <SourceSettings
                  source={formState.selectedSourceType}
                  setPorterYaml={(newYaml: string, filename: string) => {
                    validateAndSetPorterYaml(newYaml, filename);
                  }}
                  porterApp={porterApp}
                  setPorterApp={setPorterApp}
                  imageUrl={porterApp.image_repo_uri}
                  setImageUrl={(url: string) => {
                    setPorterApp(PorterApp.setAttribute(porterApp, "image_repo_uri", url));
                    setCurrentStep(Math.max(currentStep, 2));
                  }}
                  imageTag={imageTag}
                  setImageTag={setImageTag}
                  buildView={buildView}
                  setBuildView={setBuildView}
                  projectId={currentProject?.id ?? 0}
                  resetImageInfo={() => {
                    setPorterApp(PorterApp.setAttribute(porterApp, "image_repo_uri", ""));
                    setImageTag("");
                  }}
                />
              </>,
              <>
                <Container row>
                  <Text size={16}>
                    Application services{" "}
                  </Text>
                  {detected && formState.serviceList.length > 0 && (
                    <AppearingDiv color={detected.detected ? "#8590ff" : "#fcba03"}>
                      {detected.detected ? (
                        <I className="material-icons">check</I>
                      ) : (
                        <I className="material-icons">error</I>
                      )}
                      <Text color={detected.detected ? "#8590ff" : "#fcba03"}>
                        {detected.message}
                      </Text>
                    </AppearingDiv>
                  )}
                </Container>
                <Spacer y={0.5} />
                <Services
                  setServices={(services: Service[]) => {
                    const release = formState.serviceList.filter(Service.isRelease)
                    setFormState({ ...formState, serviceList: [...services, ...release] });
                    if (Validators.serviceList(services)) {
                      setCurrentStep(Math.max(currentStep, 5));
                    }
                  }}
                  services={formState.serviceList.filter(Service.isNonRelease)}
                  defaultExpanded={true}
                  addNewText={"Add a new service"}
                  appName={porterApp.name}
                />
              </>,
              <>
                <Text size={16}>Environment variables (optional)</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Specify environment variables shared among all services.
                </Text>
                <EnvGroupArrayStacks
                  key={formState.envVariables.length}
                  values={formState.envVariables}
                  setValues={(x: any) => {
                    setFormState({ ...formState, envVariables: x });
                  }}
                  fileUpload={true}
                  syncedEnvGroups={syncedEnvGroups}
                />

                <>
                  <TooltipWrapper
                    onMouseOver={() => { setHovered(true); }}
                    onMouseOut={() => { setHovered(false); }}>
                    <LoadButton
                      disabled={maxEnvGroupsReached}
                      onClick={() => { !maxEnvGroupsReached && setShowEnvModal(true); }}
                    >
                      <img src={sliders} /> Load from Env Group
                    </LoadButton>
                    <TooltipText visible={maxEnvGroupsReached && hovered}>Max 4 Env Groups allowed</TooltipText>
                  </TooltipWrapper>

                  {showEnvModal && <EnvGroupModal
                    setValues={(x: any) => {
                      setFormState({ ...formState, envVariables: x });
                    }}
                    values={formState.envVariables}
                    closeModal={() => { setShowEnvModal(false); }}
                    syncedEnvGroups={syncedEnvGroups}
                    setSyncedEnvGroups={setSyncedEnvGroups}
                    namespace={"porter-stack-" + porterApp.name}
                    newApp={true}
                  />}
                  {!!syncedEnvGroups?.length && (
                    <>
                      <Spacer y={0.5} />
                      <Text size={16}>Synced environment groups</Text >
                      {syncedEnvGroups?.map((envGroup: any) => {
                        return (
                          <ExpandableEnvGroup
                            key={envGroup?.name}
                            envGroup={envGroup}
                            onDelete={() => {
                              deleteEnvGroup(envGroup);
                            }}
                          />
                        );
                      })}
                    </>
                  )}
                </>

              </>,
              formState.selectedSourceType == "github" &&
              <>
                <Text size={16}>Pre-deploy job (optional)</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  After your application is built each time, your pre-deploy command will run before your services
                  are deployed. Use this for operations like a database migration.
                </Text>
                <Spacer y={0.5} />
                <Services
                  setServices={(release: Service[]) => {
                    const nonRelease = formState.serviceList.filter(Service.isNonRelease)
                    setFormState({ ...formState, serviceList: [...nonRelease, ...release] });
                  }}
                  services={formState.serviceList.filter(Service.isRelease)}
                  limitOne={true}
                  addNewText={"Add a new pre-deploy job"}
                  prePopulateService={Service.default("pre-deploy", "release", porterJsonWithPath?.porterJson)}
                  appName={porterApp.name}
                />
              </>,
              <Button
                onClick={() => {
                  if (porterApp.image_repo_uri) {
                    deployPorterApp();
                  } else {
                    setDeploymentError(undefined);
                    setShowGHAModal(true);
                  }
                }}
                disabled={formState.serviceList.length === 0 || deploying}
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
            ].filter((x) => x)}
          />
          <Spacer y={3} />
        </StyledConfigureTemplate>
      </Div>
      {showGHAModal && currentCluster != null && currentProject != null && (
        <GithubActionModal
          closeModal={() => { setShowGHAModal(false); }}
          githubAppInstallationID={porterApp.git_repo_id}
          githubRepoOwner={porterApp.repo_name.split("/")[0]}
          githubRepoName={porterApp.repo_name.split("/")[1]}
          branch={porterApp.git_branch}
          stackName={porterApp.name}
          projectId={currentProject.id}
          clusterId={currentCluster.id}
          deployPorterApp={deployPorterApp}
          deploymentError={deploymentError}
          porterYamlPath={porterJsonWithPath?.porterYamlPath}
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

const AppearingDiv = styled.div<{ color?: string }>`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  align-items: center;
  color: ${(props) => props.color || "#ffffff44"};
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


const AddRowButton = styled.div`
  display: flex;
  align-items: center;
  width: 270px;
  font-size: 13px;
  color: #aaaabb;
  height: 32px;
  border-radius: 3px;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
  }

  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;
const LoadButton = styled(AddRowButton) <{ disabled?: boolean }>`
  background: ${(props) => (props.disabled ? "#aaaaaa55" : "none")};
  border: 1px solid ${(props) => (props.disabled ? "#aaaaaa55" : "#ffffff55")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};

  > i {
    color: ${(props) => (props.disabled ? "#aaaaaa44" : "#ffffff44")};
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  > img {
    width: 14px;
    margin-left: 10px;
    margin-right: 12px;
    opacity: ${(props) => (props.disabled ? "0.5" : "1")};
  }
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const TooltipText = styled.span`
  visibility: ${(props) => (props.visible ? 'visible' : 'hidden')};
  width: 240px;
  color: #fff;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
  position: absolute;
  z-index: 1;
  bottom: 100%;
  left: 50%;
  margin-left: -120px;
  opacity: ${(props) => (props.visible ? '1' : '0')};
  transition: opacity 0.3s;
  font-size: 12px;
`;

