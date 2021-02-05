import React, { Component } from 'react';
import styled from 'styled-components';

import { ActionConfigType } from '../../shared/types';
import { Context } from '../../shared/Context';

import RepoList from './RepoList';
import BranchList from './BranchList';
import ContentsList from './ContentsList';
import ActionDetails from './ActionDetails';

type PropsType = {
  actionConfig: ActionConfigType | null,
  branch: string,
  pathIsSet: boolean,
  setActionConfig: (x: ActionConfigType) => void,
  setBranch: (x: string) => void,
  setPath: (x: boolean) => void,
};

type StateType = {
  loading: boolean,
  error: boolean,
};

export default class ActionConfEditor extends Component<PropsType, StateType> {
  state = {
    loading: true,
    error: false,
  }

  renderExpanded = () => {
    let {
      actionConfig,
      branch,
      pathIsSet,
      setActionConfig,
      setBranch,
      setPath,
    } = this.props;

    if (!actionConfig.git_repo) {
      return (
        <ExpandedWrapper>
          <RepoList
            actionConfig={actionConfig}
            setActionConfig={(x: ActionConfigType) => setActionConfig(x)}
            readOnly={false}
          />
        </ExpandedWrapper>
      );
    } else if (!branch) {
      return (
        <ExpandedWrapperAlt>
          <BranchList
            actionConfig={actionConfig}
            setBranch={(branch: string) => setBranch(branch)}
          />
        </ExpandedWrapperAlt>
      );
    } else if (!pathIsSet) {
      return (
        <ExpandedWrapperAlt>
          <ContentsList
            actionConfig={actionConfig}
            branch={branch}
            setActionConfig={setActionConfig}
            setPath={() => setPath(true)}
          />
        </ExpandedWrapperAlt>
      );
    }
    return (
      <ExpandedWrapperAlt>
        <ActionDetails
          actionConfig={actionConfig}
          setActionConfig={setActionConfig}
        />
      </ExpandedWrapperAlt>
    )
  }

  render() {
    return (
      <>
        {this.renderExpanded()}
      </>
    );
  }
}

ActionConfEditor.contextType = Context;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  overflow-y: auto;
`;

const ExpandedWrapperAlt = styled(ExpandedWrapper)`
`;