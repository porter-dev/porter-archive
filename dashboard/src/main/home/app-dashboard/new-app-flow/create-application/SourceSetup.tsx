import AnimateHeight from "react-animate-height";
import React, { useContext } from "react";
import Spacer from "components/porter/Spacer";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";

import { Controller, useFormContext } from "react-hook-form";
import { PorterAppFormData, SourceOptions } from "./CreateApplication";
import Text from "components/porter/Text";
import RepositorySelector from "../../build-settings/RepositorySelector";
import BranchSelector from "../../build-settings/BranchSelector";
import Input from "components/porter/Input";
import { ControlledInput } from "components/porter/ControlledInput";
import api from "shared/api";
import { Context } from "shared/Context";
import { useQuery } from "@tanstack/react-query";

type Props = RouteComponentProps & {
  source: SourceOptions;
};

const SourceSettings: React.FC<Props> = ({ source, location, history }) => {
  const { currentProject } = useContext(Context);
  const { watch, control, register } = useFormContext<PorterAppFormData>();
  const { data, status } = useQuery(
    source.type === "github"
      ? [
          "getPorterYamlContents",
          currentProject?.id,
          source.git_branch,
          source.git_repo_name,
        ]
      : [],
    async () => {
      if (!currentProject) {
        return;
      }
      if (source.type !== "github") {
        return;
      }
      const res = await api.getPorterYamlContents(
        "<token>",
        {
          path: source.porter_yaml_path,
        },
        {
          project_id: currentProject.id,
          git_repo_id: source.git_repo_id,
          kind: "github",
          owner: source.git_repo_name.split("/")[0],
          name: source.git_repo_name.split("/")[1],
          branch: source.git_branch,
        }
      );

      return res;
    },
    {
      enabled:
        source.type === "github" &&
        Boolean(source.git_repo_name) &&
        Boolean(source.git_branch),
    }
  );

  const renderSettings = ({
    source,
    onChange,
  }: {
    source: SourceOptions;
    onChange: (fn: (prev: SourceOptions) => SourceOptions) => void;
  }) => {
    if (source.type === "github") {
      return (
        <>
          <Text size={16}>Build settings</Text>
          <Spacer y={0.5} />
          <Text color="helper">Specify your GitHub repository.</Text>
          <Spacer y={0.5} />

          {source.git_repo_name !== "" ? (
            <>
              <Text size={16}>Build settings</Text>
              <Spacer y={0.5} />
              <Text color="helper">Specify your GitHub branch.</Text>
              <Spacer y={0.5} />
              {source.git_branch === "" ? (
                <BranchSelector
                  setBranch={(branch: string) => {
                    onChange((prev: SourceOptions) => ({
                      ...prev,
                      git_branch: branch,
                    }));
                  }}
                  repo_name={source.git_repo_name}
                  git_repo_id={source.git_repo_id}
                />
              ) : (
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
                  <BackButton width="">
                    <i className="material-icons">keyboard_backspace</i>
                    Select branch
                  </BackButton>
                  <Spacer y={1} />
                  <Text color="helper">
                    Specify your application root path.
                  </Text>
                  <Spacer y={0.5} />
                  <ControlledInput
                    id={"build_context"}
                    placeholder="ex: ./"
                    autoComplete="off"
                    type="text"
                    {...register("build.build_context")}
                  />
                  <Spacer y={0.5} />
                  <Spacer y={1} />
                </>
              )}
            </>
          ) : null}
        </>
      );
    }

    return <div></div>;
  };

  return (
    <SourceSettingsContainer>
      <AnimateHeight height={source ? "auto" : 0}>
        <Spacer y={1} />
        <Controller
          name="source"
          control={control}
          render={({ field: { value: source, onChange } }) =>
            renderSettings({
              source,
              onChange,
            })
          }
        />
      </AnimateHeight>
    </SourceSettingsContainer>
  );
};

export default withRouter(SourceSettings);

const SourceSettingsContainer = styled.div``;

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

const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 14px 35px 20px;
  position: relative;
  font-size: 13px;
  margin-top: 6px;
  margin-bottom: 25px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
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
