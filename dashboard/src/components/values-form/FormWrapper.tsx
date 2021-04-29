import React, { Component } from "react";
import styled from "styled-components";

import { Section, FormElement } from "shared/types";
import { Context } from "shared/Context";
import TabRegion from "components/TabRegion";
import ValuesForm from "components/values-form/ValuesForm";
import _ from "lodash";

import SaveButton from "../SaveButton";

type PropsType = {
  showStateDebugger?: boolean;
  formData: any;
  onSubmit?: (formValues: any) => void;
  saveValuesStatus?: string | null;
  isInModal?: boolean;
  renderTabContents?: (currentTab: string) => any;
  tabOptions?: any[];

  // TabRegion props to pass through
  color?: string;
  addendum?: any;
  // overrideValues?: any;
};

type StateType = {
  currentTab: string;
  tabOptions: { value: string; label: string }[];
  metaState: any;
  requiredFields: string[];
};

export default class FormWrapper extends Component<PropsType, StateType> {
  state = {
    currentTab: "",
    tabOptions: [] as { value: string; label: string }[],
    metaState: {} as any,
    requiredFields: [] as string[],
  };

  updateTabs = (resetState?: boolean) => {
    if (resetState) {
      let tabOptions = [] as { value: string; label: string }[];
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
      if (this.props.tabOptions?.length > 0) {
        tabOptions = tabOptions.concat(this.props.tabOptions);
      }
      if (tabOptions.length > 0) {
        this.setState({
          tabOptions: tabOptions,
          currentTab: tabOptions[0].value,
          metaState,
          requiredFields: requiredFields,
        });
      } else {
        this.setState({ tabOptions });
      }
    } else {
      // TODO: refactor by consolidating w/ above
      // Handle change only to external tabs (e.g. DevOps mode toggle)
      let tabOptions = [] as { value: string; label: string }[];
      let tabs = this.props.formData?.tabs;
      if (tabs) {
        tabs.forEach((tab: any, i: number) => {
          if (tab.name && tab.label) {
            tabOptions.push({ value: tab.name, label: tab.label });
          }
        });
      }
      if (this.props.tabOptions?.length > 0) {
        tabOptions = tabOptions.concat(this.props.tabOptions);
      }
      this.setState({ tabOptions });
    }
  };

  componentDidMount() {
    this.updateTabs(true);
  }

  componentDidUpdate(prevProps: any) {
    if (
      !_.isEqual(prevProps.tabOptions, this.props.tabOptions) ||
      !_.isEqual(prevProps.formData, this.props.formData)
    ) {
      let formHasChanged = !_.isEqual(prevProps.formData, this.props.formData);
      this.updateTabs(formHasChanged);
    }
  }

  isSet = (value: any) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === false
    ) {
      return false;
    }
    return true;
  };

  isDisabled = () => {
    let requiredMissing = false;
    this.state.requiredFields.forEach((requiredKey: string, i: number) => {
      if (!this.isSet(this.state.metaState[requiredKey]?.value)) {
        requiredMissing = true;
      }
    });
    return requiredMissing;
  };

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
    }
    return <div>No matched tabs found.</div>;
  };

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
      );
    }
  };

  handleSubmit = () => {
    // Extract metaState values
    let submissionValues: any = {};
    Object.keys(this.state.metaState).forEach((key: string, i: number) => {
      submissionValues[key] = this.state.metaState[key]?.value;
    });

    this.props.onSubmit && this.props.onSubmit(submissionValues);
  };

  showSaveButton = (): boolean => {
    // Check if current tab is among non-form tab options{
    let nonFormTabValues = this.props.tabOptions?.map((tab: any, i: number) => {
      return tab.value;
    });
    if (nonFormTabValues && nonFormTabValues.includes(this.state.currentTab)) {
      return false;
    }
    return true;
  };

  renderContents = (showSave: boolean) => {
    return (
      <>
        <TabRegion
          options={this.state.tabOptions}
          currentTab={this.state.currentTab}
          setCurrentTab={(x: string) => this.setState({ currentTab: x })}
          addendum={this.props.addendum}
          color={this.props.color}
        >
          {this.renderTabContents()}
        </TabRegion>
        {showSave && (
          <SaveButton
            disabled={this.isDisabled()}
            text="Deploy"
            onClick={this.handleSubmit}
            status={
              this.isDisabled()
                ? "Missing required fields"
                : this.props.saveValuesStatus
            }
            makeFlush={!this.props.isInModal}
          />
        )}
        {this.renderStateDebugger()}
      </>
    );
  };

  render() {
    let showSave = this.showSaveButton();
    return (
      <>
        {this.props.isInModal ? (
          <StyledValuesWrapper showSave={showSave}>
            {this.renderContents(showSave)}
          </StyledValuesWrapper>
        ) : (
          <PaddedWrapper>
            <StyledValuesWrapper showSave={showSave}>
              {this.renderContents(showSave)}
            </StyledValuesWrapper>
          </PaddedWrapper>
        )}
      </>
    );
  }
}

FormWrapper.contextType = Context;

const Spacer = styled.div`
  width: 100%;
  height: 200px;
  background: red;
  position: relative;
`;

const TabWrapper = styled.div`
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ScrollWrapper = styled.div`
  padding: 20px;
  overflow-y: auto;
  max-height: 300px;
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

const StyledValuesWrapper = styled.div<{ showSave: boolean }>`
  width: 100%;
  padding: 0;
  height: ${(props) => (props.showSave ? "calc(100% - 55px)" : "100%")};
`;

const PaddedWrapper = styled.div`
  padding-bottom: 65px;
  position: relative;
`;
