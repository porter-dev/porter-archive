import React, { useEffect, useRef, useState } from "react";
import folder from "legacy/assets/folder_v2.svg";
import Container from "legacy/components/porter/Container";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import Input from "legacy/components/porter/Input";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import {
  type PorterAppFormData,
  type SourceOptions,
} from "legacy/lib/porter-apps";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";
import { match } from "ts-pattern";

import FileSelector from "../FileSelector";

type Props = {
  projectId: number;
  source: SourceOptions & { type: "github" | "local" };
};
const DockerfileSettings: React.FC<Props> = ({ projectId, source }) => {
  const { control, watch, register } = useFormContext<PorterAppFormData>();
  const [showFileSelector, setShowFileSelector] = useState<boolean>(false);

  const path = watch("app.build.dockerfile", "");

  const fileSelectorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: { target: unknown }): void => {
      if (
        fileSelectorRef.current &&
        !fileSelectorRef.current?.contains(event.target as Node)
      ) {
        setShowFileSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fileSelectorRef]);

  return match(source)
    .with({ type: "github" }, (s) => (
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
                  repoId={s.git_repo_id}
                  repoOwner={s.git_repo_name.split("/")[0]}
                  repoName={s.git_repo_name.split("/")[1]}
                  branch={s.git_branch}
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
    ))
    .with({ type: "local" }, () => (
      <>
        <Text color="helper">Dockerfile path (absolute path)</Text>
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
    .exhaustive();
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
