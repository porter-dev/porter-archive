import React from "react";
import styled from "styled-components";

interface GitRepoSelectorProps {

}

const GitRepoSelector: React.FC<GitRepoSelectorProps> = ({
}) => {
    return (
        <StyledSourceBox>
            <CloseButton
                onClick={() => {
                    setSourceType("");
                    setDockerfilePath("");
                    setFolderPath("");
                    setProcfilePath("");
                    setProcfileProcess("");
                }}
            >
                <i className="material-icons">close</i>
            </CloseButton>
            <Subtitle>
                Provide a repo folder to use as source.
                <Highlight
                    onClick={() => setCurrentModal("AccountSettingsModal", {})}
                >
                    Manage Git repos
                </Highlight>
                <Required>*</Required>
            </Subtitle>
            <DarkMatter antiHeight="-4px" />
            <ActionConfEditor
                actionConfig={actionConfig}
                branch={branch}
                setActionConfig={(actionConfig: ActionConfigType) => {
                    setActionConfig((currentActionConfig: ActionConfigType) => ({
                        ...currentActionConfig,
                        ...actionConfig,
                    }));
                    setImageUrl(actionConfig.image_repo_uri);
                    /*
                    setParentState({ actionConfig }, () =>
                      setParentState({ imageUrl: actionConfig.image_repo_uri })
                    )
                    */
                }}
                procfileProcess={procfileProcess}
                setProcfileProcess={(procfileProcess: string) => {
                    setProcfileProcess(procfileProcess);
                    setValuesToOverride((v: any) => ({
                        ...v,
                        "container.command": procfileProcess || "",
                        showStartCommand: !procfileProcess,
                    }));
                }}
                setBranch={setBranch}
                setDockerfilePath={setDockerfilePath}
                setProcfilePath={setProcfilePath}
                procfilePath={procfilePath}
                dockerfilePath={dockerfilePath}
                folderPath={folderPath}
                setFolderPath={setFolderPath}
                reset={() => {
                    setActionConfig({ ...defaultActionConfig });
                    setBranch("");
                    setDockerfilePath(null);
                    setFolderPath(null);
                }}
                setSelectedRegistry={setSelectedRegistry}
                selectedRegistry={selectedRegistry}
                setBuildConfig={setBuildConfig}
            />
            <br />
        </StyledSourceBox>
    )
}

export default GitRepoSelector;

const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 14px 35px 20px;
  position: relative;
  font-size: 13px;
  margin-top: 6px;
  margin-bottom: 25px;
  border-radius: 5px;
  background: ${props => props.theme.fg};
  border: 1px solid #494b4f;
`;