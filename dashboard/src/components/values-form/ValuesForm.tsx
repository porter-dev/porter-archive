import React, { Component } from "react";
import styled from "styled-components";

import { Section, FormElement } from "shared/types";
import { Context } from "shared/Context";

import CheckboxRow from "./CheckboxRow";
import InputRow from "./InputRow";
import Base64InputRow from "./Base64InputRow";
import SelectRow from "./SelectRow";
import Helper from "./Helper";
import Heading from "./Heading";
import ExpandableResource from "../ExpandableResource";
import VeleroForm from "../forms/VeleroForm";
import InputArray from "./InputArray";
import KeyValueArray from "./KeyValueArray";

type PropsType = {
  sections?: Section[];
  metaState?: any;
  setMetaState?: any;
  handleEnvChange?: (x: any) => void;
};

type StateType = any;

// Requires an internal representation unlike other values components because metaState value underdetermines input order
export default class ValuesForm extends Component<PropsType, StateType> {
  getInputValue = (item: FormElement) => {
    let key = item.name || item.variable;
    let value = this.props.metaState[key];

    if (item.settings && item.settings.unit && value && value.includes) {
      value = value.split(item.settings.unit)[0];
    }
    return value;
  };

  renderSection = (section: Section) => {
    return section.contents.map((item: FormElement, i: number) => {
      // If no name is assigned use values.yaml variable as identifier
      let key = item.name || item.variable;
      switch (item.type) {
        case "heading":
          return <Heading key={i}>{item.label}</Heading>;
        case "subtitle":
          return <Helper key={i}>{item.label}</Helper>;
        case "resource-list":
          if (Array.isArray(item.value)) {
            return (
              <ResourceList key={i}>
                {item.value.map((resource: any, i: number) => {
                  return (
                    <ExpandableResource
                      key={i}
                      resource={resource}
                      isLast={i === item.value.length - 1}
                      roundAllCorners={true}
                    />
                  );
                })}
              </ResourceList>
            );
          }
        case "checkbox":
          return (
            <CheckboxRow
              key={i}
              checked={this.props.metaState[key]}
              toggle={() =>
                this.props.setMetaState({ [key]: !this.props.metaState[key] })
              }
              label={item.label}
            />
          );
        case "key-value-array":
          return (
            <KeyValueArray
              key={i}
              values={this.props.metaState[key]}
              setValues={(x: any) => {
                this.props.setMetaState({ [key]: x });

                // Need to pull env vars out of form.yaml for createGHA build env vars
                if (
                  this.props.handleEnvChange &&
                  key === "container.env.normal"
                ) {
                  this.props.handleEnvChange(x);
                }
              }}
              label={item.label}
            />
          );
        case "array-input":
          return (
            <InputArray
              key={i}
              values={this.props.metaState[key]}
              setValues={(x: string[]) => {
                this.props.setMetaState({ [key]: x });
              }}
              label={item.label}
            />
          );
        case "string-input":
          return (
            <InputRow
              key={i}
              isRequired={item.required}
              type="text"
              value={this.getInputValue(item)}
              setValue={(x: string) => {
                if (item.settings && item.settings.unit && x !== "") {
                  x = x + item.settings.unit;
                }
                this.props.setMetaState({ [key]: x });
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
            />
          );
        case "string-input-password":
          return (
            <InputRow
              key={i}
              isRequired={item.required}
              type="password"
              value={this.getInputValue(item)}
              setValue={(x: string) => {
                console.log("string input", x);
                if (item.settings && item.settings.unit && x !== "") {
                  x = x + item.settings.unit;
                }
                this.props.setMetaState({ [key]: x });
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
            />
          );
        case "number-input":
          return (
            <InputRow
              key={i}
              isRequired={item.required}
              type="number"
              value={this.getInputValue(item)}
              setValue={(x: number) => {
                let val: string | number = x;
                if (Number.isNaN(x)) {
                  val = "";
                }

                // Convert to string if unit is set
                if (item.settings && item.settings.unit) {
                  val = x.toString();
                  val = val + item.settings.unit;
                }

                this.props.setMetaState({ [key]: val });
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
            />
          );
        case "select":
          return (
            <SelectRow
              key={i}
              value={this.props.metaState[key]}
              setActiveValue={(val) => this.props.setMetaState({ [key]: val })}
              options={item.settings.options}
              dropdownLabel=""
              label={item.label}
            />
          );
        case "provider-select":
          return (
            <SelectRow
              key={i}
              value={this.props.metaState[key]}
              setActiveValue={(val) => this.props.setMetaState({ [key]: val })}
              options={[
                { value: "aws", label: "Amazon Web Services (AWS)" },
                { value: "gcp", label: "Google Cloud Platform (GCP)" },
                { value: "do", label: "DigitalOcean" },
              ]}
              dropdownLabel=""
              label={item.label}
            />
          );
        case "velero-create-backup":
          return <VeleroForm />;
        case "base-64":
          return (
            <Base64InputRow
              key={i}
              isRequired={item.required}
              type="text"
              value={this.getInputValue(item)}
              setValue={(x: string) => {
                if (item.settings && item.settings.unit && x !== "") {
                  x = x + item.settings.unit;
                }
                this.props.setMetaState({ [key]: btoa(x) });
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
            />
          );
        case "base-64-password":
          return (
            <Base64InputRow
              key={i}
              isRequired={item.required}
              type="password"
              value={this.getInputValue(item)}
              setValue={(x: string) => {
                if (item.settings && item.settings.unit && x !== "") {
                  x = x + item.settings.unit;
                }
                this.props.setMetaState({ [key]: btoa(x) });
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
            />
          );
        default:
      }
    });
  };

  renderFormContents = () => {
    if (this.props.metaState) {
      return this.props.sections.map((section: Section, i: number) => {
        // Hide collapsible section if deciding field is false
        if (section.show_if) {
          if (!this.props.metaState[section.show_if]) {
            return null;
          }
        }

        return <div key={i}>{this.renderSection(section)}</div>;
      });
    }
  };

  render() {
    return (
      <StyledValuesForm>
        <DarkMatter />
        {this.renderFormContents()}
      </StyledValuesForm>
    );
  }
}

ValuesForm.contextType = Context;

const ResourceList = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
  border-radius: 5px;
  overflow: hidden;
`;

const DarkMatter = styled.div`
  margin-top: 0px;
`;

const StyledValuesForm = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
  color: #ffffff;
  padding: 0px 35px 25px;
  position: relative;
  border-radius: 5px;
  font-size: 13px;
  overflow: auto;
`;
