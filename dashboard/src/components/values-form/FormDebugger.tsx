import React, { Component } from "react";
import styled from "styled-components";
import AceEditor from "react-ace";
import FormWrapper from "components/values-form/FormWrapper";
import CheckboxRow from "components/values-form/CheckboxRow";
import yaml from "js-yaml";

import "shared/ace-porter-theme";
import "ace-builds/src-noconflict/mode-text";

import Heading from "./Heading";
import Helper from "./Helper";

type PropsType = {
  goBack: () => void;
};

type StateType = {
  rawYaml: string;
  showBonusTabs: boolean;
  showStateDebugger: boolean;
};

const tabOptions = [
  { value: "a", label: "Bonus Tab A" },
  { value: "b", label: "Bonus Tab B" },
];

export default class FormDebugger extends Component<PropsType, StateType> {
  state = {
    rawYaml: "",
    showBonusTabs: false,
    showStateDebugger: true,
  };

  renderTabContents = (currentTab: string) => {
    console.log("oofok");
    return (
      <TabWrapper>
        {this.state.rawYaml.toString().slice(0, 300) || "No raw YAML inputted."}
      </TabWrapper>
    );
  };

  aceEditorRef = React.createRef<AceEditor>();
  render() {
    let formData = {};
    try {
      formData = yaml.load(this.state.rawYaml);
    } catch (err: any) {
      console.log("YAML parsing error.");
    }
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
              marginTop: "27px",
              marginBottom: "27px",
            }}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
          />
        </EditorWrapper>

        <CheckboxRow
          label="Show form state debugger"
          checked={this.state.showStateDebugger}
          toggle={() =>
            this.setState({ showStateDebugger: !this.state.showStateDebugger })
          }
        />
        <CheckboxRow
          label="Include non-form dummy tabs"
          checked={this.state.showBonusTabs}
          toggle={() =>
            this.setState({ showBonusTabs: !this.state.showBonusTabs })
          }
        />

        <Heading>🎨 Rendered Form</Heading>
        <Br />
        <FormWrapper
          showStateDebugger={this.state.showStateDebugger}
          formData={formData}
          tabOptions={this.state.showBonusTabs ? tabOptions : []}
          renderTabContents={
            this.state.showBonusTabs ? this.renderTabContents : null
          }
          onSubmit={(values: any) => {
            alert("Check console output.");
            console.log("Raw submission values:");
            console.log(values);
          }}
        />
      </StyledFormDebugger>
    );
  }
}

const Br = styled.div`
  width: 100%;
  height: 12px;
`;

const TabWrapper = styled.div`
  background: #ffffff11;
  height: 200px;
  width: 100%;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  overflow: auto;
  padding: 50px;
`;

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
