import React, { Component } from "react";
import styled from "styled-components";

import { Section, FormElement } from "../../shared/types";
import { Context } from "../../shared/Context";

import SaveButton from "../SaveButton";

type PropsType = {
  formTabs: any;
  onSubmit: (formValues: any) => void;
  disabled?: boolean;
  saveValuesStatus?: string | null;
  isInModal?: boolean;
  currentTab?: string; // For resetting state when flipping b/w tabs in ExpandedChart
};

type StateType = any;

const providerMap: any = {
  gke: "gcp",
  eks: "aws",
  doks: "do",
};

// Manages the consolidated state of all form tabs ("metastate")
export default class ValuesWrapper extends Component<PropsType, StateType> {
  // No need to render, so OK to set as class variable outside of state
  requiredFields: string[] = [];

  updateFormState() {
    let metaState: any = {};
    this.props.formTabs.forEach((tab: any, i: number) => {
      // TODO: reconcile tab.name and tab.value
      if (tab.name || (tab.value && tab.value.includes("@"))) {
        tab.sections.forEach((section: Section, i: number) => {
          section.contents.forEach((item: FormElement, i: number) => {
            // If no name is assigned use values.yaml variable as identifier
            let key = item.name || item.variable;
            let def =
              item.settings && item.settings.unit
                ? `${item.settings.default}${item.settings.unit}`
                : item.settings.default;
            def = (item.value && item.value[0]) || def;

            // Handle add to list of required fields
            if (item.required) {
              key && this.requiredFields.push(key);
            }

            switch (item.type) {
              case "checkbox":
                metaState[key] = def ? def : false;
                break;
              case "string-input":
                metaState[key] = def ? def : "";
                break;
              case "string-input-password":
                metaState[key] = def ? def : item.settings.default;
              case "array-input":
                metaState[key] = def ? def : [];
                break;
              case "key-value-array":
                metaState[key] = def ? def : {};
                break;
              case "number-input":
                metaState[key] = def.toString() ? def : "";
                break;
              case "select":
                metaState[key] = def ? def : item.settings.options[0].value;
                break;
              case "provider-select":
                def = providerMap[this.context.currentCluster.service];
                metaState[key] = def ? def : "aws";
                break;
              case "base-64":
                metaState[key] = def ? def : "";
              case "base-64-password":
                metaState[key] = def ? def : "";
              default:
            }
          });
        });
      }
    });
    this.setState(metaState);
  }

  // Initialize corresponding state fields for form blocks
  componentDidMount() {
    this.updateFormState();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (
      this.props.formTabs !== prevProps.formTabs ||
      this.props.currentTab !== prevProps.currentTab
    ) {
      this.updateFormState();
    }
  }

  // Checks if all required fields are set
  isDisabled = (): boolean => {
    let valueIndicators: any[] = [];
    this.requiredFields.forEach((field: string, i: number) => {
      valueIndicators.push(this.state[field] && true);
    });
    return valueIndicators.includes(false) || valueIndicators.includes("");
  };

  renderButton = () => {
    let { formTabs, currentTab } = this.props;
    let tab = formTabs.find(
      (t: any) => t.name === currentTab || t.value === currentTab
    );
    if (tab && tab.context && tab.context.type === "helm/values") {
      return (
        <SaveButton
          disabled={this.isDisabled() || this.props.disabled}
          text="Deploy"
          onClick={() => this.props.onSubmit(this.state)}
          status={
            this.isDisabled()
              ? "Missing required fields"
              : this.props.saveValuesStatus
          }
          makeFlush={true}
        />
      );
    }
  };

  render() {
    let renderFunc: any = this.props.children;
    if (this.props.isInModal) {
      return (
        <StyledValuesWrapper>
          {renderFunc(this.state, (x: any) => this.setState(x))}
          {this.renderButton()}
        </StyledValuesWrapper>
      );
    }
    return (
      <PaddedWrapper>
        <StyledValuesWrapper>
          {renderFunc(this.state, (x: any) => this.setState(x))}
          {this.renderButton()}
        </StyledValuesWrapper>
      </PaddedWrapper>
    );
  }
}

ValuesWrapper.contextType = Context;

const StyledValuesWrapper = styled.div`
  width: 100%;
  padding: 0;
  height: calc(100% - 65px);
`;

const PaddedWrapper = styled.div`
  padding-bottom: 65px;
  position: relative;
`;
