import React, { Component } from 'react';
import styled from 'styled-components';

import SaveButton from '../../../../../components/SaveButton';
import CheckboxRow from './CheckboxRow';
import InputRow from './InputRow';
import SelectRow from './SelectRow';

type PropsType = {
};

type StateType = any;

const naiveFormArray = [
  { type: 'heading', data: '🍦 Dessert' },
  { type: 'helper', data: 'Select your favorite dessert' },
  {
    field: 'dessert', type: 'select', data: {
      label: 'Base flavor',
      options: [
        { label: 'vanilla', value: 'A' },
        { label: 'chocolate', value: 'B' },
        { label: 'wasabi', value: 'C' }
      ]
    }
  },
  {
    field: 'topping', type: 'select', data: {
      label: 'Topping',
      options: [
        { label: 'sprinkles', value: 'A' },
        { label: 'gummy-worms', value: 'B' },
        { label: 'salt', value: 'C' }
      ]
    }
  },
  { type: 'heading', data: '⚡ Resources' },
  { type: 'helper', data: 'Update computing resources and memory for certain resources.' },
  { field: 'arguable', type: 'checkbox', data: { label: 'Use a persistent volume' } },
  { field: 'horizon', type: 'checkbox', data: { label: 'Use a refurbished Telecaster' } },
  { type: 'helper', data: 'Update computing resources and memory for certain resources.' },
  { field: 'name', type: 'input', data: { type: 'string', label: 'Resource name' } },
  { field: 'oof', type: 'checkbox', data: { label: 'Use a perspective vortex' } },
  { field: 'memory', type: 'input', data: { type: 'number', label: 'Memory', unit: 'Mi' } },
  { type: 'helper', data: 'Update computing resources and memory for certain resources.' },
  {
    field: 'ocean', type: 'select', data: {
      label: 'Some stuff',
      options: [
        { label: 'volcano', value: 'A' },
        { label: 'typhon', value: 'B' },
        { label: 'intergalactic', value: 'C' }
      ]
    }
  },
];

export default class ValuesForm extends Component<PropsType, StateType> {

  // Initialize corresponding state fields for form blocks
  componentDidMount() {
    let formState: any = {};
    naiveFormArray.forEach((item: any, i: number) => {
      switch (item.type) {
        case 'checkbox':
          formState[item.field] = false;
          break;
        case 'input':
          formState[item.field] = '';
          break;
        case 'select':
          formState[item.field] = item.data.options[0].value;
        default:
      }
    });

    this.setState(formState);
  }

  renderFormContents = () => {
    if (this.state) {
      return naiveFormArray.map((item: any, i: number) => {
        switch (item.type) {
          case 'heading':
            return <Heading key={i}>{item.data}</Heading>
          case 'helper':
            return <Helper key={i}>{item.data}</Helper>
          case 'checkbox':
            return (
              <CheckboxRow
                key={i}
                checked={this.state[item.field]}
                toggle={() => this.setState({ [item.field]: !this.state[item.field] })}
                label={item.data.label}
              />
            );
          case 'input':
            return (
              <InputRow
                key={i}
                type={item.data.type}
                value={this.state[item.field]}
                label={item.data.label}
                unit={item.data.unit}
              />
            );
          case 'select':
            return (
              <SelectRow
                key={i}
                value={this.state[item.field]}
                setActiveValue={(val) => this.setState({ [item.field]: val })}
                options={item.data.options}
                dropdownLabel=''
                label={item.data.label}
              />
            );
          default:
        }
      });
    }
  }

  render() {
    return (
      <Wrapper>
        <StyledValuesForm>
          {this.renderFormContents()}
        </StyledValuesForm>
        <SaveButton
          text='Save Values'
          onClick={() => console.log(this.state)}
          status={null}
        />
      </Wrapper>
    );
  }
}

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const Helper = styled.div`
  color: #aaaabb;
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
  height: calc(100% - 60px);
  background: #ffffff11;
  padding: 0px 35px 50px;
  position: relative;
  border-radius: 5px;
  overflow: auto;
`;