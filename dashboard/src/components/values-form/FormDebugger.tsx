import React, { Component } from "react";
import styled from "styled-components";
import AceEditor from "react-ace";
import PorterForm from "../form-refactor/PorterForm";
import CheckboxRow from "components/values-form/CheckboxRow";
import InputRow from "components/values-form/InputRow";
import yaml from "js-yaml";

import "shared/ace-porter-theme";
import "ace-builds/src-noconflict/mode-text";

import Heading from "./Heading";
import Helper from "./Helper";
import { PorterFormData } from "../form-refactor/types";
import { PorterFormContextProvider } from "../form-refactor/PorterFormContextProvider";

type PropsType = {
  goBack: () => void;
};

type StateType = {
  rawYaml: string;
  showBonusTabs: boolean;
  showStateDebugger: boolean;
  valuesToOverride: any;
  checkbox_a: boolean;
  input_a: string;
  isReadOnly: boolean;
};

const tabOptions = [
  { value: "a", label: "Bonus Tab A" },
  { value: "b", label: "Bonus Tab B" },
];

export default class FormDebugger extends Component<PropsType, StateType> {
  state = {
    rawYaml: initYaml,
    showBonusTabs: false,
    showStateDebugger: true,
    valuesToOverride: {
      checkbox_a: {
        value: true,
      },
    } as any,
    checkbox_a: true,
    input_a: "",
    isReadOnly: false,
  };

  renderTabContents = (currentTab: string) => {
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
            height="450px"
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
          label="Read-only"
          checked={this.state.isReadOnly}
          toggle={() =>
            this.setState({
              isReadOnly: !this.state.isReadOnly,
            })
          }
        />
        <CheckboxRow
          label="Include non-form dummy tabs"
          checked={this.state.showBonusTabs}
          toggle={() =>
            this.setState({ showBonusTabs: !this.state.showBonusTabs })
          }
        />
        <CheckboxRow
          label="checkbox_a"
          checked={this.state.checkbox_a}
          toggle={() =>
            this.setState({
              checkbox_a: !this.state.checkbox_a,

              // Override the form value for checkbox_a
              valuesToOverride: {
                ...this.state.valuesToOverride,
                checkbox_a: {
                  value: !this.state.checkbox_a,
                },
              },
            })
          }
        />
        <InputRow
          type="string"
          value={this.state.input_a}
          setValue={(x: string) =>
            this.setState({
              input_a: x,

              // Override the form value for input_a
              valuesToOverride: {
                ...this.state.valuesToOverride,
                input_a: {
                  value: x,
                },
              },
            })
          }
          label={"input_a"}
          placeholder="ex: override text"
        />

        <Heading>🎨 Rendered Form</Heading>
        <Br />
        <PorterFormContextProvider
          rawFormData={formData as PorterFormData}
          overrideVariables={{
            input_a: this.state.valuesToOverride?.input_a?.value,
          }}
          isReadOnly={this.state.isReadOnly}
        >
          <PorterForm
            rightTabOptions={this.state.showBonusTabs ? tabOptions : []}
            renderTabContents={this.renderTabContents}
          />
        </PorterFormContextProvider>
        {/*<FormWrapper*/}
        {/*  valuesToOverride={this.state.valuesToOverride}*/}
        {/*  clearValuesToOverride={() =>*/}
        {/*    this.setState({ valuesToOverride: null })*/}
        {/*  }*/}
        {/*  showStateDebugger={this.state.showStateDebugger}*/}
        {/*  formData={formData}*/}
        {/*  isReadOnly={this.state.isReadOnly}*/}
        {/*  tabOptions={this.state.showBonusTabs ? tabOptions : []}*/}
        {/*  renderTabContents={*/}
        {/*    this.state.showBonusTabs ? this.renderTabContents : null*/}
        {/*  }*/}
        {/*  onSubmit={(values: any) => {*/}
        {/*    alert("Check console output.");*/}
        {/*    console.log("Raw submission values:");*/}
        {/*    console.log(values);*/}
        {/*  }}*/}
        {/*/>*/}
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

const initYaml = `name: Porter Example
hasSource: true
tabs:
- name: main
  label: Main
  sections:
  - name: header
    contents: 
    - type: heading
      label: 🍺 Porter Demo Form
    - type: subtitle
      name: command_description
      label: Basic form demonstrating some of the features of form.yaml
    - type: string-input
      placeholder: "ex: pilsner"
      label: Required String Input A
      required: true
      variable: field_a
      info: This is some info
      settings:
        type: text
    - type: string-input
      placeholder: "ex: pilsner"
      label: Required String Input A with unit
      required: true
      variable: field_a_unit
      settings:
        type: text
        unit: m
    - type: string-input
      placeholder: "ex: pilsner"
      label: Required Password Input B
      required: true
      variable: field_b
      info: This is some info
      settings:
        type: password
    - type: string-input
      placeholder: "ex: pilsner"
      label: Non Required Number Input C
      required: false
      variable: field_c
      settings:
        type: number
    - type: string-input
      placeholder: "ex: pilsner"
      label: Non Required Number Input C with unit
      required: false
      variable: field_c_unit
      settings:
        type: number
        unit: km
    - type: checkbox
      required: true
      label: Checkbox A alternative
      variable: checkbox_a
    - type: subtitle
      label: "Note: Hidden required fields aren't supported yet (global only)"
  - name: controlled-by-external
    show_if:
      or:
        - checkbox_a
        - not_a_variable
    contents:
    - type: heading
      label: Conditional Display (A)
    - type: subtitle
      label: This section can be externally controlled by the value of checkbox_a
    - type: string-input
      variable: input_a
      placeholder: "Override w/ input_a"
  - name: domain_name
    show_if: ingress.custom_domain
    contents:
    - type: array-input
      variable: ingress.hosts
      label: Domain Name
- name: env
  label: Environment
  sections:
  - name: env_vars
    contents:
    - type: heading
      label: Environment Variables
    - type: subtitle
      label: Set environment variables for your secrets and environment-specific configuration.
    - type: env-key-value-array
      label: 
      variable: container.env.normal
- name: advanced
  label: Advanced
  sections:
  - name: advanced
    contents:
    - type: heading
      label: Some Header
    - type: subtitle
      label: Some helper text
`;
