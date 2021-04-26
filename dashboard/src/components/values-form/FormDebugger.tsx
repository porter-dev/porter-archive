import React, { Component } from "react";
import styled from "styled-components";
import AceEditor from "react-ace";
import yaml from "js-yaml";

import "shared/ace-porter-theme"
import "ace-builds/src-noconflict/mode-text";

import Heading from "./Heading";
import Helper from "./Helper";

type PropsType = {
  goBack: () => void;
};

type StateType = {
  rawYaml: string;
};

export default class FormDebugger extends Component<PropsType, StateType> {
  state = {
    rawYaml: "",
  }

  renderForm = () => {
    let formData = yaml.load(this.state.rawYaml);
    return <h1>silver lining</h1>
  }

  aceEditorRef = React.createRef<AceEditor>();
  render() {
    return (
      <StyledFormDebugger>
        <Button onClick={this.props.goBack}>
          <i className="material-icons">keyboard_backspace</i>
          Back
        </Button>
        <Heading>✨ Form.yaml Editor</Heading>
        <Helper>Write and test form.yaml free of consequence.</Helper>

        <EditorWrapper>
          <AceEditor
            ref={this.aceEditorRef}
            mode="yaml"
            value={this.state.rawYaml}
            theme="porter"
            onChange={(e: string) => this.setState({ rawYaml: e })}
            name="codeEditor"
            editorProps={{ $blockScrolling: true }}
            height="300px"
            width="100%"
            style={{ 
              borderRadius: "5px", 
              border: "1px solid #ffffff22",
              marginTop: "27px"
            }}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
          />
        </EditorWrapper>

        <Heading>🎨 Rendered Form</Heading>
        {this.renderForm()}
      </StyledFormDebugger>
    );
  }
}

const EditorWrapper = styled.div`
  .ace_editor,
  .ace_editor * {
    font-family: "Monaco", "Menlo", "Ubuntu Mono", "Droid Sans Mono", "Consolas",
      monospace !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
  }
`;

const StyledFormDebugger = styled.div`
  position: relative;
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  margin-left: -2px;
  padding: 0px 8px;
  width: 85px;
  float: right;
  padding-bottom: 1px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  border: 2px solid #969fbbaa;
  :hover {
    background: #ffffff11;
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    color: #969fbbaa;
    font-weight: 600;
    font-size: 14px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;