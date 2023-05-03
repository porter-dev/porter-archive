import React, { Component } from "react";
import styled from "styled-components";
import close from "assets/close.png";
import AceEditor from "react-ace";

import "shared/ace-porter-theme";
import "ace-builds/src-noconflict/mode-text";

import { Context } from "shared/Context";

import SaveButton from "components/SaveButton";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Button from "components/porter/Button";

type PropsType = {
  closeModal: () => void;
  setEnvVariables: (values: any) => void;
};

type StateType = {
  error: boolean;
  buttonStatus: string;
  envFile: string;
};

export default class EnvEditorModal extends Component<PropsType, StateType> {
  state = {
    error: false,
    buttonStatus: "",
    envFile: "",
  };

  aceEditorRef = React.createRef<AceEditor>();

  onSubmit = () => {
    this.props.setEnvVariables(this.state.envFile);
    this.props.closeModal();
  };

  onChange = (e: string) => {
    this.setState({ envFile: e });
  };

  render() {
    return (
      <StyledLoadEnvGroupModal>
        <Text size={16}>Load from Environment Group</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Copy paste your environment file in .env format:
        </Text>

        <Editor
          onSubmit={(e: any) => {
            e.preventDefault();
          }}
          border={true}
        >
          <AceEditor
            ref={this.aceEditorRef}
            mode="text"
            value={this.state.envFile}
            theme="porter"
            onChange={(e: string) => this.onChange(e)}
            name="codeEditor"
            editorProps={{ $blockScrolling: true }}
            height="100%"
            width="100%"
            style={{ borderRadius: "5px" }}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
            fontSize={14}
          />
        </Editor>
        <Button
          disabled={this.state.envFile == ""}
          status={
            this.state.envFile == ""
              ? "No env file detected"
              : "Existing env variables will be overidden"
          }
          onClick={this.onSubmit}
        >
          Submit
        </Button>
      </StyledLoadEnvGroupModal>
    );
  }
}

EnvEditorModal.contextType = Context;

const Editor = styled.form`
  margin-top: 20px;
  margin-bottom: 20px;
  border-radius: ${(props: { border: boolean }) => (props.border ? "5px" : "")};
  border: ${(props: { border: boolean }) =>
    props.border ? "1px solid #ffffff22" : ""};
  height: calc(100% - 135px);
  font-family: monospace !important;
  .ace_scrollbar {
    display: none;
  }
  .ace_editor,
  .ace_editor * {
    font-family: "Monaco", "Menlo", "Ubuntu Mono", "Droid Sans Mono", "Consolas",
      monospace !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledLoadEnvGroupModal = styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 30px;
  overflow: hidden;
  border-radius: 10px;
`;
