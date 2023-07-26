import React, { useCallback, useEffect } from "react";
import { useState } from "react";
import styled from "styled-components";
import AnimateHeight from "react-animate-height";
import { match } from "ts-pattern";
import yaml from "js-yaml";

import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { FormData } from "../ConfigureEnvironment";
import Spacer from "components/porter/Spacer";
import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import Button from "components/porter/Button";
import SourceSelector, {
  SourceType,
} from "main/home/app-dashboard/new-app-flow/SourceSelector";
import RepositorySelector from "main/home/app-dashboard/build-settings/RepositorySelector";
import {
  PorterApp,
  porterAppValidator,
} from "main/home/app-dashboard/types/porterApp";
import { ImportApp } from "./ImportApp";
import Input from "components/porter/Input";
import ImageSelector from "components/image-selector/ImageSelector";
import api from "shared/api";
import { UmbrellaChart, umbrellaChartValidator } from "lib/charts";
import {
  PorterJson,
  PorterYamlSchema,
} from "main/home/app-dashboard/new-app-flow/schema";
import { Service } from "main/home/app-dashboard/new-app-flow/serviceTypes";
import { AppBlock } from "./AppBlock";

type EnvironmentAppsProps = {
  projectId: number;
  clusterId: number;
};

const EnvironmentApps: React.FC<EnvironmentAppsProps> = ({
  projectId,
  clusterId,
}) => {
  const { control, setValue, register } = useFormContext<FormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "applications",
    rules: { minLength: 1 },
  });

  const [showAddAppModal, setShowAddAppModal] = useState<boolean>(false);
  const [source, setSource] = useState<SourceType | undefined>(undefined);
  const [imageTag, setImageTag] = useState("latest");
  const [tempPorterApp, setTempPorterApp] = useState<Partial<PorterApp>>(
    PorterApp.empty()
  );

  const getPorterYamlContents = useCallback(async (app: PorterApp) => {
    try {
      const res = await api.getPorterYamlContents(
        "<token>",
        {
          path: app.porter_yaml_path,
        },
        {
          project_id: projectId,
          git_repo_id: app.git_repo_id,
          branch: app.git_branch,
          owner: app.repo_name?.split("/")[0],
          name: app.repo_name?.split("/")[1],
          kind: "github",
        }
      );

      if (res.data == null || res.data == "") {
        return undefined;
      }

      const parsedYaml = yaml.load(atob(res.data));
      const parsedData = await PorterYamlSchema.parseAsync(parsedYaml);
      return parsedData;
    } catch (err) {
      // porter.yaml used as optional value so just returning undefined for now
      return undefined;
    }
  }, []);

  const retrievePreDeploy = useCallback(async (name: string) => {
    try {
      const preDeployChartData = await api.getChart(
        "<token>",
        {},
        {
          id: projectId,
          namespace: `porter-stack-${name}`,
          cluster_id: clusterId,
          name: `${name}-r`,
          // this is always latest because we do not tie the pre-deploy chart to the umbrella chart
          revision: 0,
        }
      );
      const preDeployChart = await umbrellaChartValidator.parseAsync(
        preDeployChartData.data
      );
      return preDeployChart;
    } catch (err) {
      // that's ok if there's an error, just means there is no pre-deploy chart
      return undefined;
    }
  }, []);

  const retrieveServicesAndEnv = useCallback(
    ({
      chart,
      releaseChart,
      porterJson,
    }: {
      chart: UmbrellaChart;
      releaseChart?: UmbrellaChart;
      porterJson?: PorterJson;
    }) => {
      const helmValues = chart.config;
      const defaultValues = chart.chart.values;

      // todo(ianedwards): get env values

      const services = Service.deserialize(
        helmValues,
        defaultValues,
        porterJson
      );

      if (releaseChart) {
        const release = Service.deserializeRelease(
          releaseChart.config,
          porterJson
        );
        services.push(release);
      }

      return [services];
    },
    []
  );

  const retrieveAndConstructApp = useCallback(async (name: string) => {
    try {
      const resPorterApp = await api.getPorterApp(
        "<token>",
        {},
        {
          project_id: projectId,
          cluster_id: clusterId,
          name,
        }
      );
      const resChartData = await api.getChart(
        "<token>",
        {},
        {
          id: projectId,
          namespace: `porter-stack-${name}`,
          cluster_id: clusterId,
          revision: 0,
          name,
        }
      );

      const chart = await umbrellaChartValidator.parseAsync(resChartData.data);
      const appData = await porterAppValidator.parseAsync(resPorterApp.data);

      const porterJson = await getPorterYamlContents({
        ...appData,
        porter_yaml_path: appData.porter_yaml_path ?? "porter.yaml",
      });
      const releaseChart = await retrievePreDeploy(name);

      const [services] = retrieveServicesAndEnv({
        chart,
        porterJson,
        releaseChart,
      });

      append({
        ...appData,
        baseYaml: porterJson,
        services,
        envVariables: [],
      });
    } catch (err) {
      // err
    } finally {
      setTempPorterApp(PorterApp.empty());
      setShowAddAppModal(false);
    }
  }, []);

  const constructNewApp = useCallback(() => {
    const appData = porterAppValidator.safeParse(tempPorterApp);
    if (!appData.success) {
      return;
    }

    append({
      ...appData.data,
      services: [],
      envVariables: [],
    });
    setTempPorterApp(PorterApp.empty());
    setShowAddAppModal(false);
  }, [tempPorterApp]);

  useEffect(() => {
    setTempPorterApp(PorterApp.empty());
  }, [source]);

  return (
    <div>
      <AppList>
        {fields.map((app, idx) => (
          <AppBlock
            app={app}
            remove={remove}
            idx={idx}
            key={`${app.name}-${idx}`}
          />
        ))}
      </AppList>
      {fields.length > 0 && <Spacer y={0.5} />}
      {showAddAppModal && (
        <Modal closeModal={() => setShowAddAppModal(false)} width="900px">
          <Text size={16}>Add app to environment</Text>
          <Spacer y={1} />
          <Text color="helper">Select a source:</Text>
          <Spacer y={0.5} />
          <SourceSelector
            selectedSourceType={source}
            setSourceType={setSource}
            allowExisting
          />
          <AnimateHeight height={source ? "auto" : 0}>
            <Spacer y={1} />
            {source
              ? match(source)
                  .with("github", () =>
                    tempPorterApp.repo_name !== undefined ? (
                      <>
                        {tempPorterApp.repo_name.length === 0 ? (
                          <RepositorySelector
                            readOnly={false}
                            updatePorterApp={(attrs) => setTempPorterApp(attrs)}
                            git_repo_name={tempPorterApp.repo_name}
                          />
                        ) : (
                          <>
                            <Input
                              disabled={true}
                              label="GitHub repository:"
                              width="100%"
                              value={tempPorterApp.repo_name}
                              setValue={() => {}}
                              placeholder=""
                            />{" "}
                            <BackButton
                              width="135px"
                              onClick={() => {
                                setTempPorterApp((prev) => ({
                                  repo_name: "",
                                  ...prev,
                                }));
                              }}
                            >
                              <i className="material-icons">
                                keyboard_backspace
                              </i>
                              Select repo
                            </BackButton>
                            <Spacer y={0.5} />
                          </>
                        )}
                      </>
                    ) : null
                  )
                  .with("docker-registry", () => (
                    <>
                      <Subtitle>
                        Specify the container image you would like to connect to
                        this template.
                      </Subtitle>
                      <ImageSelector
                        selectedTag={imageTag}
                        selectedImageUrl={tempPorterApp.image_repo_uri ?? ""}
                        setSelectedImageUrl={(url) => {
                          setTempPorterApp((prev) => ({
                            ...prev,
                            image_repo_uri: url,
                          }));
                        }}
                        setSelectedTag={setImageTag}
                        forceExpanded={true}
                        listHeight="221px"
                      />
                    </>
                  ))
                  .with("existing", () => (
                    <ImportApp
                      projectId={projectId}
                      clusterId={clusterId}
                      tempApp={tempPorterApp}
                      setTempApp={setTempPorterApp}
                    />
                  ))
                  .exhaustive()
              : null}
          </AnimateHeight>
          {source !== "existing" &&
            Boolean(
              tempPorterApp.repo_name?.length ||
                tempPorterApp.image_repo_uri?.length
            ) && (
              <>
                <Spacer y={1} />
                <Text color="helper">Name this app:</Text>
                <Spacer y={0.5} />
                <Input
                  disabled={
                    !tempPorterApp.name?.length &&
                    !Boolean(
                      tempPorterApp.repo_name?.length ||
                        tempPorterApp.image_repo_uri?.length
                    )
                  }
                  placeholder="ex: my-service"
                  width="100%"
                  value={tempPorterApp.name ?? ""}
                  setValue={(value: string) => {
                    setTempPorterApp((prev) => ({
                      ...prev,
                      name: value,
                    }));
                  }}
                />
              </>
            )}
          <Spacer y={1} />
          <Button
            disabled={
              !tempPorterApp.name?.length ||
              (source === "github" && !tempPorterApp.repo_name?.length)
            }
            onClick={() => {
              if (tempPorterApp.name?.length) {
                if (source === "existing") {
                  retrieveAndConstructApp(tempPorterApp.name);
                } else {
                  constructNewApp();
                }
              }
            }}
          >
            Add app
          </Button>
        </Modal>
      )}

      <AddAppButton
        onClick={() => {
          setShowAddAppModal(true);
        }}
      >
        <i className="material-icons add-icon">add_icon</i>
        Add Application
      </AddAppButton>
    </div>
  );
};

export default EnvironmentApps;

const AppList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  row-gap: 5px;
`;

const AddAppButton = styled.div`
  color: #aaaabb;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color: white;
  }
  display: flex;
  align-items: center;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  .add-icon {
    width: 30px;
    font-size: 20px;
  }
`;

export const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22px;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  margin-bottom: -7px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
  }
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
`;

const Subtitle = styled.div`
  padding: 11px 0px 16px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  line-height: 1.6em;
`;
