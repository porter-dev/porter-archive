import React, { Component, createRef } from "react";
import styled from "styled-components";
import close from "assets/close.png";
import AceEditor from "react-ace";

import "shared/ace-porter-theme";
import "ace-builds/src-noconflict/mode-text";

import { Context } from "shared/Context";

import SaveButton from "components/SaveButton";

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

  componentDidMount() {}

  render() {
    return (
      <StyledLoadEnvGroupModal>
        <CloseButton onClick={this.props.closeModal}>
          <CloseButtonImg src={close} />
        </CloseButton>

        <ModalTitle>Load from Environment Group</ModalTitle>
        <Subtitle>Copy paste your environment file in .env format:</Subtitle>

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

        <SaveButton
          disabled={this.state.envFile == ""}
          text="Submit"
          status={
            this.state.envFile == ""
              ? "No env file detected"
              : "Existing env variables will be overidden"
          }
          onClick={this.onSubmit}
        />
      </StyledLoadEnvGroupModal>
    );
  }
}

EnvEditorModal.contextType = Context;

const Editor = styled.form`
  margin-top: 20px;
  border-radius: ${(props: { border: boolean }) => (props.border ? "5px" : "")};
  border: ${(props: { border: boolean }) =>
    props.border ? "1px solid #ffffff22" : ""};
  height: 80%;
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

const Subtitle = styled.div`
  margin-top: 15px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: Work Sans, sans-serif;
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
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
  border-radius: 6px;
  background: #202227;
`;
