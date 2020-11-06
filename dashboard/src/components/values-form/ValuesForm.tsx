import React, { Component } from 'react';
import styled from 'styled-components';

import { FormYAML, Section, FormElement } from '../../shared/types';

import SaveButton from '../SaveButton';
import CheckboxRow from './CheckboxRow';
import InputRow from './InputRow';
import SelectRow from './SelectRow';

type PropsType = {
  formData?: FormYAML
};

type StateType = any;

export default class ValuesForm extends Component<PropsType, StateType> {

  // Initialize corresponding state fields for form blocks
  componentDidMount() {
    let formState: any = {};
    this.props.formData.Sections.forEach((section: Section, i: number) => {
      section.Contents.forEach((item: FormElement, i: number) => {

        // If no name is assigned use values.yaml variable as identifier
        let key = item.Name || item.Variable;
        
        let def = item.Settings.Default;
        switch (item.Type) {
          case 'checkbox':
            formState[key] = def ? def : false;
            break;
          case 'string-input':
            formState[key] = def ? def : '';
            break;
          case 'number-input':
            formState[key] = def ? def : '';
            break;
          case 'select':
            formState[key] = def ? def : item.Settings.Options[0].Value;
          default:
        }
      });
    });
    this.setState(formState);
  }

  renderSection = (section: Section) => {
    return section.Contents.map((item: FormElement, i: number) => {

      // If no name is assigned use values.yaml variable as identifier
      let key = item.Name || item.Variable;
      switch (item.Type) {
        case 'heading':
          return <Heading key={i}>{item.Label}</Heading>
        case 'subtitle':
          return <Helper key={i}>{item.Label}</Helper>
        case 'checkbox':
          return (
            <CheckboxRow
              key={i}
              checked={this.state[key]}
              toggle={() => this.setState({ [key]: !this.state[key] })}
              label={item.Label}
            />
          );
        case 'string-input':
          return (
            <InputRow
              key={i}
              type={'text'}
              value={this.state[key]}
              setValue={(x: string) => this.setState({ [key]: x })}
              label={item.Label}
              unit={item.Settings ? item.Settings.Unit : null}
            />
          );
        case 'number-input':
          return (
            <InputRow
              key={i}
              type={'number'}
              value={this.state[key]}
              setValue={(x: string) => this.setState({ [key]: parseInt(x) })}
              label={item.Label}
              unit={item.Settings ? item.Settings.Unit : null}
            />
          );
        case 'select':
          return (
            <SelectRow
              key={i}
              value={this.state[key]}
              setActiveValue={(val) => this.setState({ [key]: val })}
              options={item.Settings.Options}
              dropdownLabel=''
              label={item.Label}
            />
          );
        default:
      }
    });
  }

  renderFormContents = () => {
    if (this.state) {
      return this.props.formData.Sections.map((section: Section, i: number) => {

        // Hide collapsible section if deciding field is false
        if (section.ShowIf) {
          if (!this.state[section.ShowIf]) {
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
          text='Deploy'
          onClick={() => console.log(this.state)}
          status={null}
        />
      </Wrapper>
    );
  }
}

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
  padding: 0px 35px 30px;
  position: relative;
  border-radius: 5px;
  font-size: 13px;
  overflow: auto;
`;