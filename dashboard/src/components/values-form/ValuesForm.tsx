import React, { Component } from 'react';
import styled from 'styled-components';

import SaveButton from '../SaveButton';
import CheckboxRow from './CheckboxRow';
import InputRow from './InputRow';
import SelectRow from './SelectRow';

type PropsType = {
};

type StateType = any;

const naiveFormArray = [
  { type: 'heading', data: '⚡ Wordpress Settings' },
  { type: 'helper', data: 'Enable persistent volume for WordPress' },
  { field: 'pv-enabled', type: 'checkbox', data: { label: 'Persistent volume enabled' } },
  { field: 'name', type: 'input', data: { type: 'number', label: 'WordPress volume size', unit: 'Gi' } },
  {
    field: 'ocean', type: 'select', data: {
      label: 'Default StorageClass for WordPress',
      options: [
        { label: 'Standard', value: 'A' },
        { label: 'Custom Storage Class', value: 'B' },
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
  margin-top: -5px;
`;

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
  margin-top: 35px;
  margin-bottom: 5px;
`;

const StyledValuesForm = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
  color: #ffffff;
  padding: 0px 35px;
  position: relative;
  border-radius: 5px;
  font-size: 13px;
  overflow: auto;
`;