import Input from "components/porter/Input";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import React from "react";
import styled from "styled-components";
import { PorterApp } from "../types/porterApp";
import ActionConfEditorStack from "./ActionConfEditorStack";
import ActionConfBranchSelector from "./ActionConfBranchSelector";
import DetectContentsList from "./DetectContentsList";

type Props = {
  setPorterYaml: (x: any) => void;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
  porterApp: PorterApp;
};

const SharedBuildSettings: React.FC<Props> = ({
  setPorterYaml,
  updatePorterApp,
  porterApp,
}) => {
  return (
    <>
      <Text size={16}>Build settings</Text>
      <Spacer y={0.5} />
      <Text color="helper">Specify your GitHub repository.</Text>
      <Spacer y={0.5} />
      <ActionConfEditorStack
        git_repo_name={porterApp.repo_name}
        updatePorterApp={updatePorterApp}
      />
      <DarkMatter antiHeight="-4px" />
      <Spacer y={0.3} />
      {porterApp.repo_name !== "" && (
        <>
          <Spacer y={0.5} />
          <Text color="helper">Specify your GitHub branch.</Text>
          <Spacer y={0.5} />
          <ActionConfBranchSelector
            git_repo_name={porterApp.repo_name}
            git_repo_id={porterApp.git_repo_id}
            updatePorterApp={updatePorterApp}
            branch={porterApp.git_branch}
          />
        </>
      )}
      <Spacer y={0.3} />
      {porterApp.repo_name !== "" && porterApp.git_branch !== "" && (
        <>
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

