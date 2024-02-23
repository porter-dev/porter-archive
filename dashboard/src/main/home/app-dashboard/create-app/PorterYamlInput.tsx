import React, { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";

import { type PorterAppFormData } from "lib/porter-apps";

import FileSelector from "../validate-apply/build-settings/FileSelector";

type Props = {
  projectId: number;
  repoId: number;
  repoOwner: string;
  repoName: string;
  branch: string;
};

const PorterYamlInput: React.FC<Props> = ({
  projectId,
  repoId,
  repoOwner,
  repoName,
  branch,
}) => {
  const [showFileSelector, setShowFileSelector] = useState<boolean>(false);
  const { control, watch } = useFormContext<PorterAppFormData>();
  const porterYamlPath = watch("source.porter_yaml_path");

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
    <div>
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!showFileSelector) {
            setShowFileSelector(true);
          }
        }}
      >
        <StyledInput value={porterYamlPath} placeholder={"ex ./porter.yaml"} />
      </div>
      {showFileSelector && (
        <div ref={fileSelectorRef}>
          <Controller
            name="source.porter_yaml_path"
            control={control}
            render={({ field: { onChange } }) => (
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
                isFileSelectable={(path: string) => path.endsWith(".yaml")}
                headerText={"Select your porter.yaml:"}
                widthPercent={100}
              />
            )}
          />
        </div>
      )}
    </div>
  );
};

export default PorterYamlInput;

const StyledInput = styled.input`
  height: 35px;
  padding: 5px 10px;
  width: 100%;
  color: #fefefe;
  font-size: 13px;
  outline: none;
  transition: all 0.2s;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
`;
