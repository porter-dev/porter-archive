import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "shared/api";
import { Controller, useFormContext } from "react-hook-form";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import styled from "styled-components";
import Input from "components/porter/Input";
import { ControlledInput } from "components/porter/ControlledInput";
import Select from "components/porter/Select";
import AnimateHeight from "react-animate-height";
import { z } from "zod";
import { PorterAppFormData, SourceOptions } from "lib/porter-apps";
import RepositorySelector from "../build-settings/RepositorySelector";
import BranchSelector from "../build-settings/BranchSelector";
import BuildpackSettings, { DEFAULT_BUILDERS } from "../validate-apply/build-settings/buildpacks/BuildpackSettings";
import { match } from "ts-pattern";
import { BuildOptions } from "lib/porter-apps/build";
import Loading from "components/Loading";

type Props = {
  projectId: number;
  source: SourceOptions & { type: "github" };
  build: BuildOptions;
  appExists?: boolean;
};

const branchContentsSchema = z
  .object({
    path: z.string(),
    type: z.enum(["file", "dir"]),
  })
  .array();

type BranchContents = z.infer<typeof branchContentsSchema>;

const RepoSettings: React.FC<Props> = ({
  projectId,
  source,
  build,
  appExists,
}) => {
  const { control, register, setValue } = useFormContext<PorterAppFormData>();
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const repoIsSet = useMemo(() => source.git_repo_name !== "", [
    source.git_repo_name,
  ]);
  const branchIsSet = useMemo(() => source.git_branch !== "", [
    source.git_branch,
  ]);

  const { data: branchContents, isLoading } = useQuery<BranchContents>(
    ["getBranchContents", projectId, source.git_branch, source.git_repo_name, appExists],
    async () => {
      const res = await api.getBranchContents(
        "<token>",
        { dir: build.context || "./" },
        {
          project_id: projectId,
          git_repo_id: source.git_repo_id,
          kind: "github",
          owner: source.git_repo_name.split("/")[0],
          name: source.git_repo_name.split("/")[1],
          branch: source.git_branch,
        }
      );

      return branchContentsSchema.parse(res.data);
    },
    {
      enabled: repoIsSet && branchIsSet && !appExists,
    }
  );

  useEffect(() => {
    if (!branchContents) {
      return;
    }

    const item = branchContents.find((item) =>
      item.path.includes("Dockerfile") && item.type === "file"
    );
    if (item) {
      setValue("app.build.dockerfile", item.path.startsWith("./") || item.path.startsWith("/") ? item.path : `./${item.path}`);
      setValue("app.build.method", "docker");
    } else {
      setValue("app.build.buildpacks", []);
      setValue("app.build.method", "pack");
    }
  }, [branchContents]);

  return (
    <div>
      <Text size={16}>Build settings</Text>
      <Spacer y={0.5} />
      <Text color="helper">Specify your GitHub repository.</Text>
      <Spacer y={0.5} />

      {!source.git_repo_name && (
        <Controller
          name="source.git_repo_name"
          control={control}
          render={({ field: { onChange } }) => (
            <>
              <ExpandedWrapper>
                <RepositorySelector
                  readOnly={false}
                  updatePorterApp={(pa) => {
                    onChange(pa.repo_name);
                    setValue(
                      "source.git_repo_id",
                      pa.git_repo_id ? pa.git_repo_id : 0
                    );
                  }}
                  git_repo_name={source.git_repo_name}
                />
              </ExpandedWrapper>
              <DarkMatter antiHeight="-4px" />
              <Spacer y={0.3} />
            </>
          )}
        />
      )}

      {!!source.git_repo_name && (
        <>
          <Input
            disabled={true}
            label="GitHub repository:"
            width="100%"
            value={source.git_repo_name}
            setValue={() => { }}
            placeholder=""
          />
          {!appExists && (
            <>
              <BackButton
                width="135px"
                onClick={() => {
                  setValue("source", {
                    type: "github",
                    git_repo_name: "",
                    git_branch: "",
                    git_repo_id: 0,
                    porter_yaml_path: "./porter.yaml",
                  });

                  setValue("app.build.context", "./");
                }}
              >
                <i className="material-icons">keyboard_backspace</i>
                Select repo
              </BackButton>
              <Spacer y={0.5} />
            </>
          )}
          <Spacer y={0.5} />
          <Text color="helper">Specify your GitHub branch.</Text>
          <Spacer y={0.5} />
          {!source.git_branch && (
            <Controller
              name="source.git_branch"
              control={control}
              render={({ field: { onChange } }) => (
                <ExpandedWrapper>
                  <BranchSelector
                    setBranch={(branch: string) => onChange(branch)}
                    repo_name={source.git_repo_name}
                    git_repo_id={source.git_repo_id}
                  />
                </ExpandedWrapper>
              )}
            />
          )}
          {!!source.git_branch && (
            <>
              <Input
                disabled={true}
                label="GitHub branch:"
                type="text"
                width="100%"
                value={source.git_branch}
                setValue={() => { }}
                placeholder=""
              />
              {!appExists &&
                <>
                  <BackButton
                    width="145px"
                    onClick={() => {
                      setValue("source", {
                        ...source,
                        git_branch: "",
                        porter_yaml_path: "./porter.yaml",
                      });

                      setValue("app.build.context", "./");
                    }}
                  >
                    <i className="material-icons">keyboard_backspace</i>
                    Select branch
                  </BackButton>
                  <Spacer y={0.5} />
                </>
              }
              <Spacer y={0.5} />
              <Text color="helper">Specify your application root path.</Text>
              <Spacer y={0.5} />
              <ControlledInput
                placeholder="ex: ./"
                width="100%"
                type="text"
                {...register("app.build.context")}
              />
              <Spacer y={1} />
              {isLoading && !appExists ?
                <AdvancedBuildTitle>
                  <Loading />
                </AdvancedBuildTitle>
                :
                <StyledAdvancedBuildSettings
                  showSettings={showSettings}
                  onClick={() => {
                    setShowSettings(!showSettings);
                  }}
                >
                  {build.method == "docker" ? (
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
              }

              <AnimateHeight height={showSettings ? "auto" : 0} duration={1000}>
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
                          if (option == "docker") {
                            onChange("docker");
                          } else if (option == "pack") {
                            // if toggling from docker to pack, initialize buildpacks to empty array and builder to default
                            onChange("pack");
                            setValue("app.build.buildpacks", []);
                            setValue("app.build.builder", DEFAULT_BUILDERS[0])
                          }
                        }}
                        label="Build method"
                      />
                    )}
                  />
                  {match(build)
                    .with({ method: "docker" }, () => (
                      <>
                        <Spacer y={0.5} />
                        <Text color="helper">
                          Dockerfile path (absolute path)
                        </Text>
                        <Spacer y={0.5} />
                        <ControlledInput
                          width="300px"
                          placeholder="ex: ./Dockerfile"
                          type="text"
                          {...register("app.build.dockerfile")}
                        />
                        <Spacer y={0.5} />
                      </>
                    ))
                    .with({ method: "pack" }, (b) => (
                      <BuildpackSettings
                        projectId={projectId}
                        build={b}
                        source={source}
                        populateBuildValuesOnceAfterDetection={!appExists}
                      />
                    ))
                    .exhaustive()}
                </StyledSourceBox>
              </AnimateHeight>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RepoSettings;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  max-height: 275px;
`;

const BackButton = styled.div`
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

const StyledAdvancedBuildSettings = styled.div`
  color: ${({ showSettings }) => (showSettings ? "white" : "#aaaabb")};
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
