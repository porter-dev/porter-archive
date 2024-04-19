import React, { useEffect, useRef, useState } from "react";
import AceEditor from "react-ace";
import styled from "styled-components";

import Button from "components/porter/Button";
import Clickable from "components/porter/Clickable";
import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Input from "components/porter/Input";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import fileIcon from "assets/file.svg";

type File = {
  name: string;
  content: string;
};

type PropsType = {
  files: File[];
  setFiles: (x: File[]) => void;
  disabled?: boolean;
};

const EnvFileArray = ({
  files,
  setFiles,
  disabled,
}: PropsType): React.ReactElement => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedFile, setExpandedFile] = useState<File | null>();
  const [expandedFileName, setExpandedFileName] = useState<string>("");
  const [expandedFileContent, setExpandedFileContent] = useState<string>("");

  useEffect(() => {
    if (expandedFile) {
      setExpandedFileName(expandedFile.name);
      setExpandedFileContent(expandedFile.content);
    }
  }, [expandedFile]);

  const fileInputRef = useRef(null);

  // Function to simulate click on file input
  const handleButtonClick = (): void => {
    fileInputRef?.current?.click();
    setShowDropdown(false);
  };

  // Function to handle file selection
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event?.target?.files?.[0];
    event.target.value = "";
    if (file) {
      // Handle the file, e.g., store in state, display details, upload, etc.
      const reader = new FileReader();

      // Read the file as text
      reader.readAsText(file);

      reader.onload = () => {
        // reader.result contains the contents of the file as a text string
        const fileContent = reader.result;
        const _files = [...files];
        _files.push({ name: file.name, content: fileContent as string });
        setFiles(_files);
      };

      reader.onerror = () => {
        console.error("Error reading file:", reader.error);
      };
    }
  };

  return (
    <Relative>
      {!!files?.length &&
        files.map((file: File, i: number) => {
          return (
            <>
              <Container row>
                <Clickable
                  style={{ padding: "10px 15px" }}
                  key={i}
                  onClick={() => {
                    setExpandedFile(file);
                  }}
                >
                  <Image src={fileIcon} size={16} />
                  <Spacer x={0.5} inline />
                  {file.name}
                </Clickable>
                {!disabled && (
                  <DeleteButton
                    onClick={() => {
                      const _files = [...files];
                      _files.splice(i, 1);
                      setFiles(_files);
                    }}
                  >
                    <i className="material-icons">cancel</i>
                  </DeleteButton>
                )}
              </Container>
              {i === files.length - 1 ? (
                <Spacer y={1} />
              ) : (
                <Spacer height="10px" />
              )}
            </>
          );
        })}
      {!disabled && (
        <Button
          alt
          onClick={() => {
            setShowDropdown(true);
          }}
        >
          <I className="material-icons">add</I> Add file{" "}
          <Arrow className="material-icons">arrow_drop_down</Arrow>
        </Button>
      )}
      <input
        type="file"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {showDropdown && (
        <>
          <CloseOverlay
            onClick={() => {
              setShowDropdown(false);
            }}
          />
          <Dropdown>
            <DropdownButton
              onClick={() => {
                setExpandedFile({
                  name: "",
                  content: "",
                });
                setShowDropdown(false);
              }}
            >
              <I className="material-icons">add</I>Create new file
            </DropdownButton>
            <DropdownButton onClick={handleButtonClick}>
              <I className="material-icons">upload</I>Upload file
            </DropdownButton>
          </Dropdown>
        </>
      )}
      {expandedFile && (
        <Modal
          closeModal={() => {
            setExpandedFile(null);
          }}
        >
          <Input
            placeholder="Name your file . . ."
            autoFocus
            value={expandedFileName}
            setValue={setExpandedFileName}
          />
          <Spacer height="15px" />
          <Text color="helper">
            View and edit the contents of the file below.
          </Text>
          <Spacer y={1} />
          <Holder>
            <AceEditor
              value={expandedFileContent}
              theme="porter"
              onChange={setExpandedFileContent}
              name="codeEditor"
              readOnly={disabled}
              height="calc(100vh - 400px)"
              width="100%"
              style={{ borderRadius: "10px" }}
              showPrintMargin={false}
              showGutter={true}
              highlightActiveLine={true}
              fontSize={14}
            />
          </Holder>
          <Spacer y={1} />
          <Button
            onClick={() => {
              const _files = [...files];
              let found = false;
              _files.forEach((f) => {
                if (f.name === expandedFile.name) {
                  f.name = expandedFileName;
                  f.content = expandedFileContent;
                  found = true;
                }
              });

              if (!found) {
                _files.push({
                  name: expandedFileName,
                  content: expandedFileContent,
                });
              }
              setFiles(_files);
              setExpandedFile(null);
            }}
          >
            Save changes
          </Button>
        </Modal>
      )}
    </Relative>
  );
};

export default EnvFileArray;

const Holder = styled.div`
  .ace_scrollbar {
    display: none;
  }
  .ace_editor,
  .ace_editor * {
    color: #aaaabb;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", "Droid Sans Mono", "Consolas",
      monospace !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
  }
`;

const DeleteButton = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  margin-left: 8px;
  margin-top: 0px;
  justify-content: center;

  > i {
    font-size: 17px;
    color: #ffffff44;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    :hover {
      color: #ffffff88;
    }
  }
`;

const CloseOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 998;
  width: 100vw;
  height: 100vh;
`;

const Relative = styled.div`
  position: relative;
`;

const Arrow = styled.i`
  font-size: 18px;
  margin-right: -5px;
  margin-left: 7px;
`;

const I = styled.i`
  font-size: 16px;
  margin-right: 7px;
`;

const DropdownButton = styled.div`
  cursor: pointer;
  padding: 13px;
  padding-right: 15px;
  position: relative;
  height: 40px;
  font-size: 13px;
  color: #ffffff88;
  display: flex;
  align-items: center;
  user-select: none;
  :hover {
    color: #fff;
    > i {
      color: #fff;
    }
    > img {
      opacity: 100%;
    }
  }
  > i {
    color: #ffffff88;
  }
`;

const Dropdown = styled.div<{
  width?: string;
  maxHeight?: string;
}>`
  position: absolute;
  left: 0;
  top: calc(100% + 5px);
  background: #121212;
  width: ${(props) => props.width || ""};
  max-height: ${(props) => props.maxHeight || "300px"};
  border-radius: 5px;
  z-index: 999;
  border: 1px solid #494b4f;
  overflow-y: auto;
  margin-bottom: 20px;
`;
