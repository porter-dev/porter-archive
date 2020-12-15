import React, { Component } from 'react';
import styled from 'styled-components';

import { Section, FormElement } from '../../shared/types';

import SaveButton from '../SaveButton';

type PropsType = {
  formTabs: any,
  onSubmit: (formValues: any) => void,
  disabled?: boolean,
  saveValuesStatus?: string | null,
  isInModal?: boolean,
};

type StateType = any;

// Manages the consolidated state of all form tabs ("metastate")
export default class ValuesWrapper extends Component<PropsType, StateType> {

  // No need to render, so OK to set as class variable outside of state
  requiredFields: string[] = [];

  updateFormState() {
    console.log('here')
    console.log(this.props.formTabs)
    let metaState: any = {};
    this.props.formTabs.forEach((tab: any, i: number) => {

      // TODO: reconcile tab.name and tab.value
      if (tab.name || (tab.value && tab.value.includes('@'))) {
        tab.sections.forEach((section: Section, i: number) => {
          section.contents.forEach((item: FormElement, i: number) => {

            // If no name is assigned use values.yaml variable as identifier
            let key = item.name || item.variable;
            let def = (item.value && item.value[0]) || (item.settings && item.settings.default);

            // Handle add to list of required fields
            if (item.required) {
              key && this.requiredFields.push(key);
            }

            switch (item.type) {
              case 'checkbox':
                metaState[key] = def ? def : false;
                break;
              case 'string-input':
                metaState[key] = def ? def : '';
                break;
              case 'number-input':
                metaState[key] = def.toString() ? def : '';
                break;
              case 'select':
                metaState[key] = def ? def : item.settings.options[0].value;
                break;
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
    if (this.props.formTabs !== prevProps.formTabs) {
      this.updateFormState();
    }
  }

  // Checks if all required fields are set
  isDisabled = (): boolean => {
    let valueIndicators: any[] = [];
    this.requiredFields.forEach((field: string, i: number) => {
      valueIndicators.push(this.state[field] && true);
    });
    return valueIndicators.includes(false) || valueIndicators.includes('')
  }

  render() {
    let renderFunc: any = this.props.children;
    return (
      <StyledValuesWrapper isInModal={this.props.isInModal}>
        {renderFunc(this.state, (x: any) => this.setState(x))}
        <SaveButton
          disabled={this.isDisabled() || this.props.disabled}
          text='Deploy'
          onClick={() => this.props.onSubmit(this.state)}
          status={this.isDisabled() ? 'Missing required fields' : this.props.saveValuesStatus}
          makeFlush={true}
        />
      </StyledValuesWrapper>
    );
  }
}

const StyledValuesWrapper = styled.div`
  width: 100%;
  height: ${(props: { isInModal: boolean }) => props.isInModal ? '100%' : 'calc(100% + 65px)'};
  padding-bottom: ${(props: { isInModal: boolean }) => props.isInModal ? '' : '65px'};
`;