import React, { Component } from "react";
import styled from "styled-components";

import { Section, FormElement } from "shared/types";
import { Context } from "shared/Context";
import TabRegion from "components/TabRegion";
import ValuesForm from "components/values-form/ValuesForm";

import SaveButton from "../SaveButton";

type PropsType = {
  showStateDebugger?: boolean;
  formData: any;
  onSubmit?: (formValues: any) => void;
  saveValuesStatus?: string | null;
  isInModal?: boolean;
  renderTabContents?: (currentTab: string) => any;
  tabOptions: any[];
  // overrideValues?: any;
};

type StateType = {
  currentTab: string;
  tabOptions: { value: string, label: string }[];
  metaState: any;
};

export default class FormWrapper extends Component<PropsType, StateType> {
  state = {
    currentTab: "",
    tabOptions: null as { value: string, label: string }[],
    metaState: {},
  }

  updateTabs = () => {
    let tabOptions = [] as { value: string, label: string }[];
    let tabs = this.props.formData?.tabs;
    let requiredFields = [] as string[];
    let metaState: any = {};
    if (tabs) {
      tabs.forEach((tab: any, i: number) => {
        if (tab.name && tab.label) {

          // If a tab is valid, first extract state
          tab.sections.forEach((section: Section, i: number) => {
            section.contents.forEach((item: FormElement, i: number) => {

              // If no name is assigned use values.yaml variable as identifier
              let key = item.name || item.variable;

              let def =
                item.settings && item.settings.unit
                  ? `${item.settings.default}${item.settings.unit}`
                  : item.settings?.default;
              def = (item.value && item.value[0]) || def;

              if (item.type === "checkbox") {
                def = item.value && item.value[0];
              }

              // Handle add to list of required fields
              if (item.required && key) {
                requiredFields.push(key);
              }

              let value: any = def;
              switch (item.type) {
                case "checkbox":
                  value = def || false;
                  break;
                case "string-input":
                  value = def || "";
                  break;
                case "string-input-password":
                  value = def || item.settings.default;
                case "array-input":
                  value = def || [];
                  break;
                case "env-key-value-array":
                  value = def || {};
                  break;
                case "key-value-array":
                  value = def || {};
                  break;
                case "number-input":
                  value = def.toString() ? def : "";
                  break;
                case "select":
                  value = def || item.settings.options[0].value;
                  break;
                case "provider-select":
                  let providerMap: any = {
                    gke: "gcp",
                    eks: "aws",
                    doks: "do",
                  };
                  def = providerMap[this.context.currentCluster.service];
                  value = def || "aws";
                  break;
                case "base-64":
                  value = def || "";
                case "base-64-password":
                  value = def || "";
                default:
              }
              if (value !== null && value !== undefined) {
                metaState[key] = { value };
              }
            });
          });
          tabOptions.push({ value: tab.name, label: tab.label });
        }
      });
    }
    if (this.props.tabOptions.length > 0) {
      tabOptions = tabOptions.concat(this.props.tabOptions);
    }
    if (tabOptions.length > 0) {
      this.setState({ 
        tabOptions: tabOptions,
        currentTab: tabOptions[0].value,
        metaState,
      });
    }
  }

  componentDidMount() {
    this.updateTabs();
  }

  componentDidUpdate(prevProps: any) {
    if (
      prevProps.tabOptions !== this.props.tabOptions || 
      prevProps.formData !== this.props.formData
    ) {
      this.updateTabs();
    }
  }

  isDisabled = () => {
    return false;
  }

  renderTabContents = () => {
    let tabs = this.props.formData?.tabs;
    if (tabs) {
      let matchedTab = null as any;
      tabs.forEach((tab: any, i: number) => {
        if (tab.name === this.state.currentTab) {
          matchedTab = tab;
        }
      });
      if (matchedTab) {
        return (
          <ValuesForm
            metaState={this.state.metaState}
            setMetaState={(key: string, value: any) => {
              let metaState: any = this.state.metaState;
              metaState[key] = { value };
              this.setState({ metaState });
            }}
            sections={matchedTab.sections}
          />
        );
      }
    }

    // If no form tabs match, check against external tabs
    if (this.props.renderTabContents) {
      return this.props.renderTabContents(this.state.currentTab);
    } else {
      return <h1>nothin</h1>
    }
  }

  renderStateDebugger = () => {
    if (this.props.showStateDebugger) {
      return (
        <>
          <StateDisplay>
            <Header>FormWrapper State</Header>
            <ScrollWrapper>
              {JSON.stringify(this.state.metaState, undefined, 2)}
            </ScrollWrapper>
          </StateDisplay>
        </>
      )
    }
  }

  renderContents = () => {
    return (
      <>
        <TabWrapper>
          <TabRegion
            options={this.state.tabOptions}
            currentTab={this.state.currentTab}
            setCurrentTab={(x: string) => this.setState({ currentTab: x })}
          >
            {this.renderTabContents()}
          </TabRegion>
        </TabWrapper>
        <SaveButton
          disabled={this.isDisabled()}
          text="Deploy"
          onClick={() => this.props.onSubmit(this.state)}
          status={
            this.isDisabled()
              ? "Missing required fields"
              : this.props.saveValuesStatus
          }
          makeFlush={true}
        />
        {this.renderStateDebugger()}
      </>
    );
  }

  render() {
    return (
      <>
        { 
          this.props.isInModal ? (
            <StyledValuesWrapper>
              {this.renderContents()}
            </StyledValuesWrapper>
          ) : (
            <PaddedWrapper>
              <StyledValuesWrapper>
                {this.renderContents()}
              </StyledValuesWrapper>
            </PaddedWrapper>
          )
        }
      </>
    );
  }
}

FormWrapper.contextType = Context;

const TabWrapper = styled.div`
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ScrollWrapper = styled.div`
  padding: 20px;
  overflow-y: auto;
  max-height: 400px;
  padding-top: 15px;
`;

const Header = styled.div`
  width: 100%;
  height: 40px;
  color: #ffffff;
  font-weight: 500;
  padding-left: 17px;
  background: #00000022;
  display: flex;
  align-items: center;
`;

const StateDisplay = styled.pre`
  width: 100%;
  font-size: 13px;
  display:
  overflow: hidden;
  border-radius: 5px;
  position: relative;
  line-height: 1.5em;
  color: #aaaabb;
  background: #ffffff11;
`;

const StyledValuesWrapper = styled.div`
  width: 100%;
  padding: 0;
  height: calc(100% - 65px);
`;

const PaddedWrapper = styled.div`
  padding-bottom: 65px;
  position: relative;
`;
