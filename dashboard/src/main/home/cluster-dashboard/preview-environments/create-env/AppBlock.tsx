import React, { useMemo, useState } from "react";
import styled from "styled-components";
import web from "assets/web.png";

import Icon from "components/porter/Icon";
import { FormData } from "../ConfigureEnvironment";
import AnimateHeight from "react-animate-height";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import { Controller, useFormContext } from "react-hook-form";
import BranchSelector from "main/home/app-dashboard/build-settings/BranchSelector";
import Input from "components/porter/Input";
import { BackButton } from "./EnvironmentApps";
import { ControlledInput } from "components/porter/ControlledInput";
import Services from "main/home/app-dashboard/new-app-flow/Services";
import { Service } from "main/home/app-dashboard/new-app-flow/serviceTypes";

import DetectDockerfileAndPorterYaml from "main/home/app-dashboard/build-settings/DetectDockerfileAndPorterYaml";
import AdvancedBuildSettings from "main/home/app-dashboard/build-settings/AdvancedBuildSettings";
import { PorterApp } from "main/home/app-dashboard/types/porterApp";

type AppBlockProps = {
  app: FormData["applications"][0];
  remove: (idx: number) => void;
  idx: number;
};

export const AppBlock: React.FC<AppBlockProps> = ({ app, remove, idx }) => {
  const { register, control } = useFormContext<FormData>();
  const [showExpanded, setShowExpanded] = useState<boolean>(true);
  const [buildView, setBuildView] = useState<"docker" | "buildpacks">(
    "buildpacks"
  );

  console.log("app.baseYaml", app.baseYaml);

  return (
    <div>
      <AppHeader
        showExpanded={showExpanded}
        onClick={() => {
          setShowExpanded((prev) => !prev);
        }}
        bordersRounded={!showExpanded}
      >
        <AppTitle>
          <ActionButton>
            <span className="material-icons dropdown">arrow_drop_down</span>
          </ActionButton>
          <Icon src={web} />
          <p>{app.name}</p>
        </AppTitle>
        <ActionButton onClick={() => remove(idx)}>
          <span className="material-icons">delete</span>
        </ActionButton>
      </AppHeader>
      <AnimateHeight height={showExpanded ? "auto" : 0}>
        <StyledSourceBox>
          <Controller
            control={control}
            name={`applications.${idx}`}
            render={({ field: { value, onChange } }) => (
              <>
                {value.repo_name !== "" ? (
                  <>
                    <Text size={16}>Build settings</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">Specify your GitHub branch.</Text>
                    <Spacer y={0.5} />
                    {value.git_branch === "" ? (
                      <BranchSelector
                        setBranch={(branch: string) => {
                          onChange((prev: Partial<PorterApp>) => ({
                            ...prev,
                            git_branch: branch,
                          }));
                        }}
                        repo_name={value.repo_name}
                        git_repo_id={value.git_repo_id}
                      />
                    ) : (
                      <>
                        <Input
                          disabled={true}
                          label="GitHub branch:"
                          type="text"
                          width="100%"
                          value={value.git_branch}
                          setValue={() => {}}
                          placeholder=""
                        />
                        <BackButton
                          width="145px"
                          onClick={() => {
                            onChange((prev: Partial<PorterApp>) => ({
                              ...prev,
                              git_branch: "",
                            }));
                          }}
                        >
                          <i className="material-icons">keyboard_backspace</i>
                          Select branch
                        </BackButton>
                        <Spacer y={1} />
                        <Text color="helper">
                          Specify your application root path.
                        </Text>
                        <Spacer y={0.5} />
                        <ControlledInput
                          id={`applications.${idx}.build_context`}
                          placeholder="ex: ./"
                          autoComplete="off"
                          type="text"
                          {...register(`applications.${idx}.build_context`)}
                        />
                        <Spacer y={0.5} />
                        <Controller
                          control={control}
                          name={`applications.${idx}`}
                          render={({ field }) => (
                            <>
                              <DetectDockerfileAndPorterYaml
                                setPorterYaml={() => {}}
                                porterApp={field.value}
                                updatePorterApp={(app) => {
                                  field.onChange(
                                    (prev: Partial<PorterApp>) => ({
                                      ...prev,
                                      ...app,
                                    })
                                  );
                                }}
                                updateDockerfileFound={() =>
                                  setBuildView("docker")
                                }
                              />
                              <AdvancedBuildSettings
                                porterApp={field.value}
                                updatePorterApp={(app) => {
                                  field.onChange(
                                    (prev: Partial<PorterApp>) => ({
                                      ...prev,
                                      ...app,
                                    })
                                  );
                                }}
                                autoDetectBuildpacks={true}
                                buildView={buildView}
                                setBuildView={setBuildView}
                              />
                            </>
                          )}
                        />
                        <Spacer y={1} />
                      </>
                    )}
                  </>
                ) : null}
              </>
            )}
          />
          <Text size={16}>Application services</Text>
          <Spacer y={0.5} />
          <Controller
            control={control}
            name={`applications.${idx}.services`}
            render={({ field: { value: services, onChange } }) => (
              <Services
                setServices={(svcs: Service[]) => {
                  const release = svcs.filter(Service.isRelease);
                  const newServices = [...release, ...svcs];
                  onChange(newServices);
                }}
                services={services}
                addNewText={"Add a new service"}
                setExpandedJob={(x: string) => {}}
              />
            )}
          />
          {!app.image_repo_uri && (
            <Controller
              control={control}
              name={`applications.${idx}.services`}
              render={({ field: { value: services, onChange } }) => (
                <>
                  <Spacer y={1} />
                  <Text size={16}>Pre-deploy job</Text>
                  <Spacer y={0.5} />
                  <Services
                    setServices={(release: Service[]) => {
                      const nonRelease = services.filter(Service.isNonRelease);
                      const newServices = [...nonRelease, ...release];
                      onChange(newServices);
                    }}
                    services={services.filter(Service.isRelease)}
                    limitOne={true}
                    addNewText={"Add a new pre-deploy job"}
                    defaultExpanded={false}
                    prePopulateService={Service.default(
                      "pre-deploy",
                      "release",
                      app.baseYaml
                    )}
                  />
                  <Spacer y={0.5} />
                </>
              )}
            />
          )}
        </StyledSourceBox>
      </AnimateHeight>
    </div>
  );
};

const AppHeader = styled.div<{
  showExpanded: boolean;
  bordersRounded?: boolean;
}>`
  flex-direction: row;
  display: flex;
  height: 60px;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${(props) => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

  border-bottom-left-radius: ${(props) => (props.bordersRounded ? "" : "0")};
  border-bottom-right-radius: ${(props) => (props.bordersRounded ? "" : "0")};

  .dropdown {
    font-size: 30px;
    cursor: pointer;
    border-radius: 20px;
    margin-left: -10px;
    transform: ${(props: { showExpanded: boolean }) =>
      props.showExpanded ? "" : "rotate(-90deg)"};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const AppTitle = styled.div`
  display: flex;
  align-items: center;
  column-gap: 10px;
`;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  :hover {
    color: white;
  }

  > span {
    font-size: 20px;
  }
  margin-right: 5px;
`;

const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 14px 25px 30px;
  position: relative;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  border-top: 0;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
`;
