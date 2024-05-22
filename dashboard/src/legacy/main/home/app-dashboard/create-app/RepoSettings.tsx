import React, { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Input from "legacy/components/porter/Input";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import {
  type PorterAppFormData,
  type SourceOptions,
} from "legacy/lib/porter-apps";
import { type BuildOptions } from "legacy/lib/porter-apps/build";
import api from "legacy/shared/api";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";
import { z } from "zod";

import BranchSelector from "../build-settings/BranchSelector";
import RepositorySelector from "../build-settings/RepositorySelector";
import { BuildSettings } from "./BuildSettings";

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
  const { control, setValue } = useFormContext<PorterAppFormData>();

  const repoIsSet = useMemo(
    () => source.git_repo_name !== "",
    [source.git_repo_name]
  );
  const branchIsSet = useMemo(
    () => source.git_branch !== "",
    [source.git_branch]
  );

  const { data: branchContents, isLoading } = useQuery<BranchContents>(
    [
      "getBranchContents",
      projectId,
      source.git_branch,
      source.git_repo_name,
      appExists,
    ],
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

    const item = branchContents.find(
      (item) => item.path.includes("Dockerfile") && item.type === "file"
    );
    if (item) {
      setValue(
        "app.build.dockerfile",
        item.path.startsWith("./") || item.path.startsWith("/")
          ? item.path
          : `./${item.path}`
      );
      setValue("app.build.method", "docker");
    } else {
      setValue("app.build.buildpacks", []);
      setValue("app.build.method", "pack");
    }
  }, [branchContents]);

  return (
    <div>
      {!appExists && (
        <>
          <Text color="helper">Specify your GitHub repository.</Text>
          <Spacer y={0.5} />
        </>
      )}
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
              <Spacer y={0.5} />
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
            setValue={() => {}}
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
                    porter_yaml_path: "",
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
          {!appExists && (
            <>
              <Text color="helper">Specify your GitHub branch.</Text>
              <Spacer y={0.5} />
            </>
          )}
          {!source.git_branch && (
            <Controller
              name="source.git_branch"
              control={control}
              render={({ field: { onChange } }) => (
                <ExpandedWrapper>
                  <BranchSelector
                    setBranch={(branch: string) => {
                      onChange(branch);
                    }}
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
                setValue={() => {}}
                placeholder=""
              />
              {!appExists && (
                <>
                  <BackButton
                    width="145px"
                    onClick={() => {
                      setValue("source", {
                        ...source,
                        git_branch: "",
                        porter_yaml_path: "",
                      });

                      setValue("app.build.context", "./");
                    }}
                  >
                    <i className="material-icons">keyboard_backspace</i>
                    Select branch
                  </BackButton>
                  <Spacer y={0.5} />
                </>
              )}
              <Spacer y={0.5} />
              <BuildSettings
                projectId={projectId}
                source={source}
                build={build}
                appExists={appExists}
                loadingBranchContents={isLoading}
              />
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
