import React, { Component } from "react";
import styled from "styled-components";
import AceEditor from "react-ace";

import "shared/ace-porter-theme";
import "ace-builds/src-noconflict/mode-yaml";

type PropsType = {
  value: string;
  onChange?: (e: any) => void; // Might be read-only
  height?: string;
  border?: boolean;
  readOnly?: boolean;
};

type StateType = {};

class YamlEditor extends Component<PropsType, StateType> {
  // Uses the yaml-lint library to determine if a given string is valid yaml.
  // If the code is invalid, it returns an error message detailing what went wrong.
  checkYaml = () => {
    /*
    yamlLint.lint(y).then(() => {
      alert('Valid YAML file.');
    }).catch((error) => {
      alert(error.message);
    });
    */
  };

  // Calls checkYaml and passes in the value from the textarea
  handleChange = (e: any) => {
    this.setState({ yaml: e });
  };

  handleSubmit = (e: any) => {
    this.checkYaml();
    e.preventDefault();
  };

  render() {
    return (
      <Holder>
        <Editor onSubmit={this.handleSubmit} border={this.props.border}>
          <AceEditor
            mode="yaml"
            value={this.props.value}
            theme="porter"
            onChange={this.props.onChange}
            name="codeEditor"
            readOnly={this.props.readOnly}
            editorProps={{ $blockScrolling: true }}
            height={this.props.height}
            width="100%"
            style={{ borderRadius: "10px" }}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
            fontSize={14}
          />
        </Editor>
      </Holder>
    );
  }
}

export default YamlEditor;

const Editor = styled.form`
  border-radius: ${(props: { border: boolean }) => (props.border ? "10px" : "")};
  border: ${(props: { border: boolean }) =>
    props.border ? "1px solid #ffffff33" : ""};
`;

const Holder = styled.div`
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
