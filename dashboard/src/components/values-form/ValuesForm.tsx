import React, { Component } from 'react';
import styled from 'styled-components';

import { Section, FormElement } from '../../shared/types';
import { Context } from '../../shared/Context';
import api from '../../shared/api';

import SaveButton from '../SaveButton';
import CheckboxRow from './CheckboxRow';
import InputRow from './InputRow';
import SelectRow from './SelectRow';

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
        
        let def = item.settings && item.settings.default;
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

  renderSection = (section: Section) => {
    return section.contents.map((item: FormElement, i: number) => {

      // If no name is assigned use values.yaml variable as identifier
      let key = item.name || item.variable;
      switch (item.type) {
        case 'heading':
          return <Heading key={i}>{item.label}</Heading>
        case 'subtitle':
          return <Helper key={i}>{item.label}</Helper>
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
              value={this.state[key]}
              setValue={(x: string) => this.setState({ [key]: x })}
              label={item.label}
              unit={item.settings ? item.settings.unit : null}
            />
          );
        case 'number-input':
          return (
            <InputRow
              key={i}
              type='number'
              value={this.state[key]}
              setValue={(x: number) => this.setState({ [key]: x })}
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
          onClick={() => this.props.onSubmit(this.state)}
          status={this.props.saveValuesStatus}
          makeFlush={true}
        />
      </Wrapper>
    );
  }
}

ValuesForm.contextType = Context;

const DarkMatter = styled.div`
  margin-top: 0px;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const Helper = styled.div`
  color: #aaaabb;
  line-height: 1.6em;
  font-size: 13px;
  margin-bottom: 15px;
  margin-top: 20px;
`;

const Heading = styled.div`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-top: 30px;
  margin-bottom: 5px;
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