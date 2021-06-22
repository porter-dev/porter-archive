import React, { Component } from "react";
import styled from "styled-components";

import {
  Section,
  FormElement,
  ShowIf,
  ShowIfOr,
  ShowIfAnd,
  ShowIfNot,
} from "shared/types";
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
  setMetaState?: (key: string, value: any) => void;
  handleEnvChange?: (x: any) => void;
  disabled?: boolean;
  externalValues?: any;
};

type StateType = any;

// Requires an internal representation unlike other values components because metaState value underdetermines input order
export default class ValuesForm extends Component<PropsType, StateType> {
  getInputValue = (item: FormElement) => {
    if (item) {
      let key = item.name || item.variable;
      let value = this.props.metaState[key]?.value;

      if (
        item.settings &&
        item.settings.unit &&
        value &&
        value.includes &&
        !item.settings.omitUnitFromValue
      ) {
        value = value.split(item.settings.unit)[0];
      }
      return value;
    }
  };

  renderSection = (section: Section) => {
    return section.contents?.map((item: FormElement, i: number) => {
      if (!item) {
        return;
      }

      // If no name is assigned use values.yaml variable as identifier
      let key = item.name || item.variable;
      let isDisabled =
        item.settings?.disableAfterLaunch &&
        !this.props.externalValues?.isLaunch;
      isDisabled = isDisabled || this.props.disabled;

      switch (item.type) {
        case "heading":
          return <Heading key={i}>{item.label}</Heading>;
        case "subtitle":
          return <Helper key={i}>{item.label}</Helper>;
        case "resource-list":
          if (Array.isArray(item.value)) {
            return (
              <ResourceList key={key}>
                {item.value?.map((resource: any, i: number) => {
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
              key={key}
              disabled={isDisabled}
              isRequired={item.required}
              checked={this.props.metaState[key]?.value}
              toggle={() =>
                this.props.setMetaState(key, !this.props.metaState[key]?.value)
              }
              label={item.label}
            />
          );
        case "env-key-value-array":
          return (
            <KeyValueArray
              key={key}
              width="100%"
              envLoader={true}
              externalValues={this.props.externalValues}
              values={this.props.metaState[key]?.value}
              setValues={(x: any) => {
                this.props.setMetaState(key, x);

                // Need to pull env vars out of form.yaml for createGHA build env vars
                if (
                  this.props.handleEnvChange &&
                  key === "container.env.normal"
                ) {
                  // this.props.handleEnvChange(x);
                }
              }}
              label={item.label}
              disabled={isDisabled}
              secretOption={true}
            />
          );
        case "key-value-array":
          return (
            <KeyValueArray
              key={key}
              width="100%"
              externalValues={this.props.externalValues}
              values={this.props.metaState[key]?.value}
              setValues={(x: any) => this.props.setMetaState(key, x)}
              label={item.label}
              disabled={isDisabled}
            />
          );
        case "array-input":
          return (
            <InputArray
              key={key}
              width="100%"
              values={this.props.metaState[key]?.value}
              setValues={(x: string[]) => {
                this.props.setMetaState(key, x);
              }}
              label={item.label}
              disabled={isDisabled}
            />
          );
        case "string-input":
          return (
            <InputRow
              key={key}
              width="100%"
              placeholder={item.placeholder}
              isRequired={item.required}
              type="text"
              value={this.getInputValue(item)}
              setValue={(x: string) => {
                if (
                  item.settings &&
                  item.settings.unit &&
                  x !== "" &&
                  !item.settings.omitUnitFromValue
                ) {
                  x = x + item.settings.unit;
                }
                this.props.setMetaState(key, x);
              }}
              label={item.label}
              info={item.info}
              unit={item.settings ? item.settings.unit : null}
              disabled={isDisabled}
            />
          );
        case "string-input-password":
          return (
            <InputRow
              key={key}
              width="100%"
              isRequired={item.required}
              type="password"
              value={this.getInputValue(item)}
              setValue={(x: string) => {
                if (
                  item.settings &&
                  item.settings.unit &&
                  x !== "" &&
                  !item.settings.omitUnitFromValue
                ) {
                  x = x + item.settings.unit;
                }
                this.props.setMetaState(key, x);
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
              disabled={isDisabled}
            />
          );
        case "number-input":
          return (
            <InputRow
              key={key}
              width="100%"
              isRequired={item.required}
              placeholder={item.placeholder}
              type="number"
              value={this.getInputValue(item)}
              setValue={(x: number) => {
                let val: string | number = x;
                if (Number.isNaN(x)) {
                  val = "";
                }

                // Convert to string if unit is set
                if (
                  item.settings &&
                  item.settings.unit &&
                  !item.settings.omitUnitFromValue
                ) {
                  val = x.toString();
                  val = val + item.settings.unit;
                }

                this.props.setMetaState(key, val);
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
              disabled={isDisabled}
            />
          );
        case "select":
          return (
            <SelectRow
              key={key}
              value={this.props.metaState[key]?.value}
              setActiveValue={(val) => this.props.setMetaState(key, val)}
              options={item.settings.options}
              dropdownLabel=""
              label={item.label}
            />
          );
        case "provider-select":
          return (
            <SelectRow
              key={key}
              value={this.props.metaState[key]?.value}
              setActiveValue={(val) => this.props.setMetaState(key, val)}
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
              key={key}
              width="100%"
              isRequired={item.required}
              type="text"
              value={this.getInputValue(item)}
              setValue={(x: string) => {
                if (
                  item.settings &&
                  item.settings.unit &&
                  x !== "" &&
                  !item.settings.omitUnitFromValue
                ) {
                  x = x + item.settings.unit;
                }
                this.props.setMetaState(key, btoa(x));
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
              disabled={isDisabled}
            />
          );
        case "base-64-password":
          return (
            <Base64InputRow
              key={key}
              isRequired={item.required}
              type="password"
              value={this.getInputValue(item)}
              setValue={(x: string) => {
                if (
                  item.settings &&
                  item.settings.unit &&
                  x !== "" &&
                  !item.settings.omitUnitFromValue
                ) {
                  x = x + item.settings.unit;
                }
                this.props.setMetaState(key, btoa(x));
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
              disabled={isDisabled}
            />
          );
        default:
      }
    });
  };

  evalShowIf = (vals: ShowIf): boolean => {
    if (!vals) {
      return false;
    }
    if (typeof vals == "string") {
      return !!this.props.metaState[vals]?.value;
    }
    if ((vals as ShowIfOr).or) {
      vals = vals as ShowIfOr;
      for (let i = 0; i < vals.or.length; i++) {
        if (this.evalShowIf(vals.or[i])) {
          return true;
        }
      }
      return false;
    }
    if ((vals as ShowIfAnd).and) {
      vals = vals as ShowIfAnd;
      for (let i = 0; i < vals.and.length; i++) {
        if (!this.evalShowIf(vals.and[i])) {
          return false;
        }
      }
      return true;
    }
    if ((vals as ShowIfNot).not) {
      vals = vals as ShowIfNot;
      return !this.evalShowIf(vals.not);
    }

    return false;
  };

  renderFormContents = () => {
    if (this.props.metaState) {
      return this.props.sections?.map((section: Section, i: number) => {
        // Hide collapsible section if deciding field is false
        if (section.show_if && !this.evalShowIf(section.show_if)) {
          return null;
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
