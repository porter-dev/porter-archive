import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';

import InputRow from '../../../../components/values-form/InputRow';
import TextArea from '../../../../components/values-form/TextArea';
import SaveButton from '../../../../components/SaveButton';
import Heading from '../../../../components/values-form/Heading';
import Helper from '../../../../components/values-form/Helper';

type PropsType = {
};

type StateType = {
};

export default class ECRForm extends Component<PropsType, StateType> {
  state = {
  }

  render() {
    return ( 
      <StyledForm>
        <CredentialWrapper>
          <Heading>Coming Soon</Heading>
          <Helper>Under construction.</Helper>
        </CredentialWrapper>
        <SaveButton
          text='Save Settings'
          makeFlush={true}
          onClick={() => console.log('unimplemented')}
        />
      </StyledForm>
    );
  }
}

const CredentialWrapper = styled.div`
  padding: 10px 40px 25px;
  background: #ffffff11;
  border-radius: 5px;
`;

const StyledForm = styled.div`
  position: relative;
  padding-bottom: 75px;
`;