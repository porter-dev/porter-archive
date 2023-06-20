import Input from "components/porter/Input";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import React from "react";
import styled from "styled-components";
import { PorterApp } from "../types/porterApp";
import DetectContentsList from "./DetectContentsList";
import RepositorySelector from "./RepositorySelector";
import BranchSelector from "./BranchSelector";
import AdvancedBuildSettings from "./AdvancedBuildSettings";

type Props = {
  setPorterYaml: (x: any) => void;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
  porterApp: PorterApp;
  detectBuildpacks: boolean;
};

const SharedBuildSettings: React.FC<Props> = ({
  setPorterYaml,
  updatePorterApp,
  porterApp,
  detectBuildpacks,
}) => {
  return (
    <>
      <Text size={16}>Build settings</Text>
      <Spacer y={0.5} />
      <Text color="helper">Specify your GitHub repository.</Text>
      <Spacer y={0.5} />
      {porterApp.repo_name === "" && (
        <>
          <ExpandedWrapper>
            <RepositorySelector
              readOnly={false}
              updatePorterApp={updatePorterApp}
              git_repo_name={porterApp.repo_name}
            />
          </ExpandedWrapper>
          <DarkMatter antiHeight="-4px" />
          <Spacer y={0.3} />
        </>
      )}
      {porterApp.repo_name !== "" && (
        <>
          <Input
            disabled={true}
            label="GitHub repository:"
            width="100%"
            value={porterApp.repo_name}
            setValue={() => { }}
            placeholder=""
          />
          <BackButton
            width="135px"
            onClick={() => {
              updatePorterApp({
                repo_name: "",
                git_branch: "",
                dockerfile: "",
                build_context: "./",
                porter_yaml_path: "./porter.yaml",
              })
            }}
          >
            <i className="material-icons">keyboard_backspace</i>
            Select repo
          </BackButton>
          <Spacer y={1} />
          <Text color="helper">Specify your GitHub branch.</Text>
          <Spacer y={0.5} />
          {porterApp.git_branch === "" && (
            <>
              <ExpandedWrapper>
                <BranchSelector
                  setBranch={(branch: string) => updatePorterApp({ git_branch: branch })}
                  repo_name={porterApp.repo_name}
                  git_repo_id={porterApp.git_repo_id}
                />
              </ExpandedWrapper>
            </>
          )}
          {porterApp.git_branch !== "" && (
            <>
              <Input
                disabled={true}
                label="GitHub branch:"
                type="text"
                width="100%"
                value={porterApp.git_branch}
                setValue={() => { }}
                placeholder=""
              />
              <BackButton
                width="145px"
                onClick={() => {
                  updatePorterApp({
                    git_branch: "",
                    dockerfile: "",
                    build_context: "./",
                    porter_yaml_path: "./porter.yaml",
                  })
                }}
              >
                <i className="material-icons">keyboard_backspace</i>
                Select branch
              </BackButton>
              <Spacer y={1} />
              <Text color="helper">Specify your application root path.</Text>
              <Spacer y={0.5} />
              <Input
                placeholder="ex: ./"
                value={porterApp.build_context}
                width="100%"
                setValue={(val: string) => updatePorterApp({ build_context: val })}
              />
              <Spacer y={1} />
              <DetectContentsList
                setPorterYaml={setPorterYaml}
                porterApp={porterApp}
                updatePorterApp={updatePorterApp}
              />
              <AdvancedBuildSettings
                porterApp={porterApp}
                updatePorterApp={updatePorterApp}
                detectBuildpacks={detectBuildpacks}
              />
            </>
          )}
        </>
      )}
    </>
  );
};

export default SharedBuildSettings;

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

