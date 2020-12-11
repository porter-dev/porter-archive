import React, { Component } from 'react';
import styled from 'styled-components';
import _ from 'lodash';

import { Section, FormElement } from '../../shared/types';
import { Context } from '../../shared/Context';
import api from '../../shared/api';

import SaveButton from '../SaveButton';
import CheckboxRow from './CheckboxRow';
import InputRow from './InputRow';
import SelectRow from './SelectRow';
import Helper from './Helper';
import Heading from './Heading';
import ResourceTab from '../ResourceTab';

type PropsType = {
  onSubmit: (formValues: any) => void,
  sections?: Section[],
  disabled?: boolean,
  saveValuesStatus?: string | null,
};

type StateType = any;

export default class ValuesForm extends Component<PropsType, StateType> {

  updateFormState() {
    let formState: any = {};
    this.props.sections.forEach((section: Section, i: number) => {
      section.contents.forEach((item: FormElement, i: number) => {

        // If no name is assigned use values.yaml variable as identifier
        let key = item.name || item.variable;
        
        let def = (item.value && item.value[0]) || (item.settings && item.settings.default);

        switch (item.type) {
          case 'checkbox':
            formState[key] = def ? def : false;
            break;
          case 'string-input':
            formState[key] = def ? def : '';
            break;
          case 'number-input':
            formState[key] = def.toString() ? def : '';
            break;
          case 'select':
            formState[key] = def ? def : item.settings.options[0].value;
            break;
          default:
        }
      });
    });
    this.setState(formState);
  }

  // Initialize corresponding state fields for form blocks
  componentDidMount() {
    this.updateFormState();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (this.props.sections !== prevProps.sections) {
      this.updateFormState();
    }
  }

  getInputValue = (item: FormElement) => {
    let key = item.name || item.variable;
    let value = this.state[key];
    if (item.settings && item.settings.unit) {
      value = value.split(item.settings.unit)[0]
    }
    return value;
  }

  renderSection = (section: Section) => {
    return section.contents.map((item: FormElement, i: number) => {

      // If no name is assigned use values.yaml variable as identifier
      let key = item.name || item.variable;
      switch (item.type) {
        case 'heading':
          return <Heading key={i}>{item.label}</Heading>;
        case 'subtitle':
          return <Helper key={i}>{item.label}</Helper>;
        case 'resource-list':
          return (
            <ResourceList>
              {
                item.value.map((resource: any, i: number) => {
                  return (
                    <ResourceTab
                      label={resource.label}
                      name={resource.name}
                      status={{ label: resource.status }}
                    />
                  );
                })
              }
            </ResourceList>
          );
        case 'checkbox':
          return (
            <CheckboxRow
              key={i}
              checked={this.state[key]}
              toggle={() => this.setState({ [key]: !this.state[key] })}
              label={item.label}
            />
          );
        case 'string-input':
          return (
            <InputRow
              key={i}
              type='text'
              value={this.getInputValue(item)}
              setValue={(x: string) => {
                if (item.settings && item.settings.unit) {
                  x = x + item.settings.unit;
                }
                this.setState({ [key]: x });
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
            />
          );
        case 'number-input':
          return (
            <InputRow
              key={i}
              type='number'
              value={this.getInputValue(item)}
              setValue={(x: number) => {
                let val = x.toString();
                if (item.settings && item.settings.unit) {
                  val = val + item.settings.unit;
                }
                this.setState({ [key]: val });
              }}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
            />
          );
        case 'select':
          return (
            <SelectRow
              key={i}
              value={this.state[key]}
              setActiveValue={(val) => this.setState({ [key]: val })}
              options={item.settings.options}
              dropdownLabel=''
              label={item.label}
            />
          );
        default:
      }
    });
  }

  renderFormContents = () => {
    if (this.state) {
      return this.props.sections.map((section: Section, i: number) => {
        // Hide collapsible section if deciding field is false
        if (section.show_if) {
          if (!this.state[section.show_if]) {
            return null;
          }
        }

        return (
          <div key={i}>
            {this.renderSection(section)}
          </div>
        );
      });
    }
  }

  render() {
    return (
      <Wrapper>
        <StyledValuesForm>
          <DarkMatter />
          {this.renderFormContents()}
        </StyledValuesForm>
        <SaveButton
          disabled={this.props.disabled}
          text='Deploy'
          onClick={() => console.log(this.state)}
          status={this.props.saveValuesStatus}
          makeFlush={true}
        />
      </Wrapper>
    );
  }
}

ValuesForm.contextType = Context;

const ResourceList = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
`;

const DarkMatter = styled.div`
  margin-top: 0px;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
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