import React, { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type PorterAppFormData } from "lib/porter-apps";

import folder from "assets/folder_v2.svg";

import FileSelector from "../FileSelector";

type Props = {
  projectId: number;
  repoId: number;
  repoOwner: string;
  repoName: string;
  branch: string;
};
const DockerfileSettings: React.FC<Props> = ({
  projectId,
  repoId,
  repoOwner,
  repoName,
  branch,
}) => {
  const { control, watch } = useFormContext<PorterAppFormData>();
  const [showFileSelector, setShowFileSelector] = useState<boolean>(false);

  const path = watch("app.build.dockerfile", "");

  const fileSelectorRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event: { target: unknown }): void => {
      if (
        fileSelectorRef.current &&
        !fileSelectorRef.current?.contains(event.target)
      ) {
        setShowFileSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fileSelectorRef]);

  return (
    <Controller
      name="app.build.dockerfile"
      control={control}
      render={({ field: { onChange } }) => (
        <div>
          <Text>Dockerfile path</Text>
          <Spacer y={0.5} />
          <Container row>
            <Input
              width="300px"
              placeholder="ex: ./Dockerfile"
              value={path}
              setValue={(val: string) => {
                onChange(val);
              }}
            />
            <Spacer inline x={0.5} />
            <FileDirectoryToggleButton
              onClick={() => {
                setShowFileSelector(!showFileSelector);
              }}
              color="#b91133"
            >
              <img src={folder} />
            </FileDirectoryToggleButton>
          </Container>
          {showFileSelector && (
            <div ref={fileSelectorRef}>
              <FileSelector
                projectId={projectId}
                repoId={repoId}
                repoOwner={repoOwner}
                repoName={repoName}
                branch={branch}
                onFileSelect={(path: string) => {
                  onChange(`./${path}`);
                  setShowFileSelector(false);
                }}
                isFileSelectable={(path: string) =>
                  path.toLowerCase().includes("dockerfile")
                }
                headerText={"Select your Dockerfile:"}
                widthPercent={100}
              />
            </div>
          )}
        </div>
      )}
    />
  );
};

export default DockerfileSettings;

const FileDirectoryToggleButton = styled.div`
  height: 30px;
  min-width: 30px;
  width: 30px;
  border-radius: 5px;
  border: 1px solid #383a3f;
  cursor: pointer;
  margin-right: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  > img {
    height: 16px;
    width: 16px;
    opacity: 0.5;
  }

  :hover {
    border: 1px solid ${(props) => props.theme.text.primary};
    > img {
      opacity: 0.9;
    }
  }
`;
