import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import _ from "lodash";
import yaml from "js-yaml";

import { hardcodedNames, hardcodedIcons } from "shared/hardcodedNameDict";
import { Context } from "shared/Context";
import api from "shared/api";
import { pushFiltered } from "shared/routing";
import web from "assets/web.png";

import Back from "components/porter/Back";
import DashboardHeader from "../../cluster-dashboard/DashboardHeader";
import Link from "components/porter/Link";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import VerticalSteps from "components/porter/VerticalSteps";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import Placeholder from "components/Placeholder";
import Button from "components/porter/Button";
import { generateSlug } from "random-word-slugs";
import { RouteComponentProps, withRouter } from "react-router";
import SourceSelector, { SourceType } from "./SourceSelector";
import SourceSettings from "./SourceSettings";
import Services from "./Services";
import EnvGroupArray, {
  KeyValueType,
} from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import Select from "components/porter/Select";
import GithubActionModal from "./GithubActionModal";
import {
  ActionConfigType,
  FullActionConfigType,
  FullGithubActionConfigType,
  GithubActionConfigType,
} from "shared/types";
import { z } from "zod";
import { AppsSchema, EnvSchema, PorterYamlSchema } from "./schema";
import { Service } from "./serviceTypes";
import { overrideObjectValues } from "./utils";

type Props = RouteComponentProps & {};

const defaultActionConfig: GithubActionConfigType = {
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
}

const NewAppFlow: React.FC<Props> = ({ ...props }) => {
  const [templateName, setTemplateName] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [imageTag, setImageTag] = useState("latest");
  const { currentCluster, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [existingStep, setExistingStep] = useState<number>(0);
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [actionConfig, setActionConfig] = useState<GithubActionConfigType>({
    ...defaultActionConfig,
  });
  const [branch, setBranch] = useState("");
  const [repoType, setRepoType] = useState("");
  const [dockerfilePath, setDockerfilePath] = useState(null);
  const [procfilePath, setProcfilePath] = useState(null);
  const [folderPath, setFolderPath] = useState(null);
  const [buildConfig, setBuildConfig] = useState();
  const [porterYaml, setPorterYaml] = useState("");
  const [showGHAModal, setShowGHAModal] = useState<boolean>(false);
  const [porterJson, setPorterJson] = useState<
    z.infer<typeof PorterYamlSchema> | undefined
  >(undefined);
  const [detected, setDetected] = useState<Detected | undefined>(undefined);

  const validatePorterYaml = (yamlString: string) => {
    let parsedYaml;
    try {
      parsedYaml = yaml.load(yamlString);
      const parsedData = PorterYamlSchema.parse(parsedYaml);
      const porterYamlToJson = parsedData as z.infer<typeof PorterYamlSchema>;
      setPorterJson(porterYamlToJson);
      // go through key value pairs and create services from them, if they don't already exist
      const newServices = [];
      const existingServices = formState.serviceList.map((s) => s.name);
      for (const [name, app] of Object.entries(porterYamlToJson.apps)) {
        if (!existingServices.includes(name)) {
          if (app.type) {
            newServices.push(
              Service.default(name, app.type, {
                readOnly: true,
                value: app.run,
              })
            );
          } else if (name.includes("web")) {
            newServices.push(
              Service.default(name, "web", { readOnly: true, value: app.run })
            );
          } else {
            newServices.push(
              Service.default(name, "worker", {
                readOnly: true,
                value: app.run,
              })
            );
          }
        }
      }
      const newServiceList = [...formState.serviceList, ...newServices];
      setFormState({ ...formState, serviceList: newServiceList });
      if (Validators.serviceList(newServiceList)) {
        setCurrentStep(Math.max(currentStep, 4));
      }
      if (porterYamlToJson &&
        porterYamlToJson.apps &&
        Object.keys(porterYamlToJson.apps).length > 0) {
        setDetected({ detected: true, message: `Detected ${Object.keys(porterYamlToJson.apps).length} apps from porter.yaml` });
      } else {
        setDetected({ detected: false, message: "Could not detect any apps from porter.yaml. Make sure it exists in the root of your repo." });
      }
    } catch (error) {
      console.log("Error converting porter yaml file to input: " + error);
    }
  };

  // Deploys a Helm chart and writes build settings to the DB
  const isAppNameValid = (name: string) => {
    const regex = /^[a-z0-9-]+$/;
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
      !isAppNameValid(formState.applicationName)
    );
  };
  const deployPorterApp = async () => {
    try {
      if (currentProject == null || currentCluster == null || currentProject.id == null || currentCluster.id == null) {
        throw new Error("Project or cluster not found");
      }

      // validate form data
      const finalPorterYaml = createFinalPorterYaml();
      const yamlString = yaml.dump(finalPorterYaml);
      const base64Encoded = btoa(yamlString);
      const imageInfo = imageUrl ? {
        image_info: {
          repository: imageUrl,
          tag: imageTag,
        }
      } : {}

      // write to the db + deploy
      await Promise.all([
        api.createPorterApp(
          "<token>",
          {
            name: formState.applicationName,
            repo_name: actionConfig.git_repo,
            git_branch: branch,
            build_context: folderPath,
            builder: (buildConfig as any)?.builder,
            buildpacks: (buildConfig as any)?.buildpacks.join(",") ?? "",
            dockerfile: dockerfilePath,
            image_repo_uri: imageUrl,
          },
          {
            cluster_id: currentCluster.id,
            project_id: currentProject.id,
          }
        ),
        api.updatePorterStack(
          "<token>",
          {
            stack_name: formState.applicationName,
            porter_yaml: base64Encoded,
            ...imageInfo,
          },
          {
            cluster_id: currentCluster.id,
            project_id: currentProject.id,
          }
        ),
      ])
    } catch (err) {
      // TODO: better error handling
      console.log(err);
    }
  };

  const combineEnv = (
    dashboardSetVariables: KeyValueType[],
    porterYamlSetVariables: Record<string, string> | undefined
  ): z.infer<typeof EnvSchema> => {
    const env: z.infer<typeof EnvSchema> = {};
    for (const { key, value } of dashboardSetVariables) {
      env[key] = value;
    }
    if (porterYamlSetVariables != null) {
      for (const [key, value] of Object.entries(porterYamlSetVariables)) {
        env[key] = value;
      }
    }
    return env;
  };

  const createApps = (serviceList: Service[]): z.infer<typeof AppsSchema> => {
    const apps: z.infer<typeof AppsSchema> = {};
    for (const service of serviceList) {
      let config = Service.serialize(service);
      // TODO: get rid of this block when we handle ingress on the backend
      if (Service.isWeb(service)) {
        const ingress = Service.handleWebIngress(service, formState.applicationName, currentCluster?.id, currentProject?.id);
        config = {
          ...config,
          ...ingress,
        };
      }
      if (
        porterJson != null &&
        porterJson.apps[service.name] != null &&
        porterJson.apps[service.name].config != null
      ) {
        config = overrideObjectValues(
          config,
          porterJson.apps[service.name].config
        );
      }
      apps[service.name] = {
        type: service.type,
        run: service.startCommand.value,
        config,
      };
    }

    return apps;
  };

  const createFinalPorterYaml = (): z.infer<typeof PorterYamlSchema> => {
    return {
      version: "v1stack",
      env: combineEnv(formState.envVariables, porterJson?.env),
      apps: createApps(formState.serviceList),
    };
  };

  return (
    <CenterWrapper>
      <Div>
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
                <Spacer y={0.5}></Spacer>
                <Input
                  placeholder="ex: academic-sophon"
                  value={formState.applicationName}
                  width="300px"
                  error={
                    shouldHighlightAppNameInput() &&
                    'Lowercase letters, numbers, and "-" only.'
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
                <Text size={16}>Application services {detected && (
                  <AppearingDiv>
                    <Text size={16} color={detected.detected ? "green" : "red"}>
                      {detected.detected ? <i className="material-icons">check</i> : <i className="material-icons">error</i>} {detected.message}
                    </Text>
                  </AppearingDiv>
                )}</Text>
                <Spacer y={0.5} />

                <Services
                  setServices={(services: any[]) => {
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
                    setShowGHAModal(true);
                  }
                }}
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
        />
      )}
    </CenterWrapper>
  );
};

export default withRouter(NewAppFlow);

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
