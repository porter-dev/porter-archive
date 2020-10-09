import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import api from '../../../shared/api';

import Selector from '../../../components/Selector';

type PropsType = {
  setNamespace: (x: string) => void,
  currentCluster: string,
  namespace: string
};

type StateType = {
  namespaceOptions: { label: string, value: string }[]
};


// TODO: display selected in option dropdown and actually filter!

export default class NamespaceSelector extends Component<PropsType, StateType> {
  state = {
    namespaceOptions: [] as { label: string, value: string }[]
  }

  updateOptions = () => {
    let { currentCluster, setCurrentError } = this.context;

    api.getNamespaces('<token>', { context: currentCluster }, {}, (err: any, res: any) => {
      if (err) {
        setCurrentError('Could not read clusters: ' + JSON.stringify(err));
      } else {
        let namespaceOptions: { label: string, value: string }[] = [];
        res.data.items.forEach((x: { metadata: { name: string }}, i: number) => {
          namespaceOptions.push({ label: x.metadata.name, value: x.metadata.name });
        })
        this.setState({ namespaceOptions });
      }
    });
  }

  componentDidMount() {
    this.updateOptions();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps !== this.props) {
      this.updateOptions();
    }
  }

  render() {
    return ( 
      <StyledNamespaceSelector>
        <Label>
          <i className="material-icons">filter_alt</i> Filter
        </Label>
        <Selector
          activeValue={this.props.namespace}
          setActiveValue={(namespace) => this.props.setNamespace(namespace)}
          options={this.state.namespaceOptions}
          dropdownLabel='Namespace:'
        />
      </StyledNamespaceSelector>
    );
  }
}

NamespaceSelector.contextType = Context;

const Label = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;

  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;

const StyledNamespaceSelector = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
`;