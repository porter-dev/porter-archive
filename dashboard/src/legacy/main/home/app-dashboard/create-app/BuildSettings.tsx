import React, { useState } from "react";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import LoadingBar from "legacy/components/porter/LoadingBar";
import Select from "legacy/components/porter/Select";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import {
  type PorterAppFormData,
  type SourceOptions,
} from "legacy/lib/porter-apps";
import { type BuildOptions } from "legacy/lib/porter-apps/build";
import AnimateHeight from "react-animate-height";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";
import { match } from "ts-pattern";

import BuildpackSettings, {
  DEFAULT_BUILDERS,
} from "../validate-apply/build-settings/buildpacks/BuildpackSettings";
import DockerfileSettings from "../validate-apply/build-settings/docker/DockerfileSettings";
import PorterYamlInput from "./PorterYamlInput";

type BuildSettingsProps = {
  projectId: number;
  source: SourceOptions & { type: "github" | "local" };
  build: BuildOptions;
  appExists?: boolean;
  loadingBranchContents?: boolean;
};

export const BuildSettings: React.FC<BuildSettingsProps> = ({
  projectId,
  source,
  build,
  appExists,
  loadingBranchContents,
}) => {
  const { control, register, setValue } = useFormContext<PorterAppFormData>();
  const [showSettings, setShowSettings] = useState<boolean>(false);

  return (
    <>
      {!appExists && (
        <>
          <Text color="helper">Specify your application root path.</Text>
          <Spacer y={0.5} />
        </>
      )}
      <ControlledInput
        placeholder="ex: ./"
        width="100%"
        type="text"
        {...register("app.build.context")}
        label={"Application root path:"}
      />
      <Spacer y={1} />
      {!appExists && source.type === "github" && (
        <>
          <Text color="helper">
            (Optional) Specify your porter.yaml path.{" "}
            <a
              href="https://docs.porter.run/deploy/configuration-as-code/overview"
              target="_blank"
              rel="noreferrer"
            >
              &nbsp;(?)
            </a>
          </Text>
          <Spacer y={0.5} />
          <PorterYamlInput
            projectId={projectId}
            repoId={source.git_repo_id}
            repoOwner={source.git_repo_name.split("/")[0]}
            repoName={source.git_repo_name.split("/")[1]}
            branch={source.git_branch}
          />
          <Spacer y={1} />
        </>
      )}
      {loadingBranchContents && !appExists ? (
        <AdvancedBuildTitle>
          <LoadingBar />
        </AdvancedBuildTitle>
      ) : (
        <StyledAdvancedBuildSettings
          showSettings={showSettings}
          onClick={() => {
            setShowSettings(!showSettings);
          }}
        >
          {build.method === "docker" ? (
            <AdvancedBuildTitle>
              <i className="material-icons dropdown">arrow_drop_down</i>
              Configure Dockerfile settings
            </AdvancedBuildTitle>
          ) : (
            <AdvancedBuildTitle>
              <i className="material-icons dropdown">arrow_drop_down</i>
              Configure buildpack settings
            </AdvancedBuildTitle>
          )}
        </StyledAdvancedBuildSettings>
      )}
      <AnimateHeight duration={500} height={showSettings ? "auto" : 0}>
        <StyledSourceBox>
          <Controller
            name="app.build.method"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Select
                value={value}
                width="300px"
                options={[
                  { value: "docker", label: "Docker" },
                  { value: "pack", label: "Buildpacks" },
                ]}
                setValue={(option: string) => {
                  if (option === "docker") {
                    onChange("docker");
                  } else if (option === "pack") {
                    // if toggling from docker to pack, initialize buildpacks to empty array and builder to default
                    onChange("pack");
                    setValue("app.build.buildpacks", []);
                    setValue("app.build.builder", DEFAULT_BUILDERS[0]);
                  }
                }}
                label="Build method"
                labelColor="#DFDFE1"
              />
            )}
          />
          {match(build)
            .with({ method: "docker" }, () => (
              <>
                <Spacer y={0.5} />
                <DockerfileSettings projectId={projectId} source={source} />
              </>
            ))
            .with({ method: "pack" }, (b) => (
              <>
                <Spacer y={0.5} />
                <BuildpackSettings
                  projectId={projectId}
                  build={b}
                  source={source}
                  populateBuildValuesOnceAfterDetection={!appExists}
                />
              </>
            ))
            .exhaustive()}
        </StyledSourceBox>
      </AnimateHeight>
    </>
  );
};

const StyledAdvancedBuildSettings = styled.div`
  color: ${({ showSettings }) => (showSettings ? "#DFDFE1" : "#aaaabb")};
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color: white;
  }
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  border-bottom-left-radius: ${({ showSettings }) => showSettings && "0px"};
  border-bottom-right-radius: ${({ showSettings }) => showSettings && "0px"};
  .dropdown {
    margin-right: 8px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: ${(props: { showSettings: boolean }) =>
      props.showSettings ? "" : "rotate(-90deg)"};
  }
`;

const AdvancedBuildTitle = styled.div`
  display: flex;
  align-items: center;
`;

const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 25px 35px 25px;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  border-top: 0px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
`;
