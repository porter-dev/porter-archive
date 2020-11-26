import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import api from '../../../shared/api';

import Selector from '../../../components/Selector';

type PropsType = {
  setNamespace: (x: string) => void,
  namespace: string
};

type StateType = {
  namespaceOptions: { label: string, value: string }[]
};

// TODO: fix update to unmounted component 
export default class NamespaceSelector extends Component<PropsType, StateType> {
  _isMounted = false;

  state = {
    namespaceOptions: [] as { label: string, value: string }[]
  }

  updateOptions = () => {
    let { currentCluster, currentProject } = this.context;

    api.getNamespaces('<token>', {
      cluster_id: currentCluster.id,
    }, { id: currentProject.id }, (err: any, res: any) => {
      if (err && this._isMounted) {
        // setCurrentError('Could not read clusters: ' + JSON.stringify(err));
        this.setState({ namespaceOptions: [{ label: 'All', value: '' }] });
      } else if (this._isMounted) {
        let namespaceOptions: { label: string, value: string }[] = [{ label: 'All', value: '' }];
        res.data.items.forEach((x: { metadata: { name: string }}, i: number) => {
          namespaceOptions.push({ label: x.metadata.name, value: x.metadata.name });
        })
        this.setState({ namespaceOptions });
      }
    });
  }

  componentDidMount() {
    this._isMounted = true;
    this.updateOptions();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps !== this.props) {
      this.updateOptions();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
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
          dropdownLabel='Namespace'
          width='150px'
          dropdownWidth='230px'
          closeOverlay={true}
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