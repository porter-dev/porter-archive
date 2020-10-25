import React, { Component } from 'react';
import styled from 'styled-components';
import api from '../../../../shared/api';
import { Context } from '../../../../shared/Context';

type PropsType = {
};

type StateType = {
  logs: string
};

export default class LogSection extends Component<PropsType, StateType> {
  state = {
    logs: ""
  }

  componentDidMount() {
    const { currentCluster } = this.context;

    api.getPodLogs('<token>', { context: currentCluster }, {}, (err: any, res: any) => {
      if (err) {
        this.setState({logs: "ERROR"})
        // this.setState({ namespaceOptions: [{ label: 'All', value: '' }] });
      } else {
        this.setState({logs: res.data});
      }
    });
  }

  render() {
    return (
      <StyledLogSection>
        {this.state.logs}
      </StyledLogSection>
    );
  }
}

LogSection.contextType = Context;


const StyledLogSection = styled.div`
  width: 100%;
  height: 100%;
  background: #202227;
  position: relative;
  padding: 20px;
`;