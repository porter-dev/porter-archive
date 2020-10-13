import React, { Component } from 'react';
import styled from 'styled-components';

import YamlEditor from '../../../../components/YamlEditor';

type PropsType = {
};

type StateType = {
  valuesYaml: string,
};

export default class ValuesYaml extends Component<PropsType, StateType> {
  state = {
    valuesYaml: '# placeholder for values.yaml'
  }

  render() {
    return (
      <StyledValuesYaml>
        <YamlEditor
          value={this.state.valuesYaml}
          onChange={(e: any) => this.setState({ valuesYaml: e })}
        />
      </StyledValuesYaml>
    );
  }
}

const StyledValuesYaml = styled.div`
  width: 100%;
`;