import React, { Component } from 'react';
import styled from 'styled-components';

import api from '../../../../shared/api';
import { Context } from '../../../../shared/Context';
import { ChartType } from '../../../../shared/types';
import Chart from '../chart/Chart';

type PropsType = {
  showRevisions: boolean,
  toggleShowRevisions: () => void,
  chart: ChartType,
  namespace: string
};

type StateType = {
  revisions: ChartType[]
};

export default class RevisionSection extends Component<PropsType, StateType> {
  state = {
    revisions: [] as ChartType[]
  }

  componentDidMount() {
    let { chart } = this.props;

    api.getRevisions('<token>', {
      namespace: this.props.namespace,
      context: this.context.currentCluster,
      storage: 'secret'
    }, { name: chart.name }, (err: any, res: any) => {
      if (err) {
        console.log(err)
      } else {
        this.setState({ revisions: res.data.reverse() });
      }
    });
  }

  readableDate = (s: string) => {
    let ts = new Date(s);
    let date = ts.toLocaleDateString();
    let time = ts.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${time} on ${date}`;
  }

  handleRollback = (revision: number) => {    
    api.rollbackChart('<token>', {
      namespace: this.props.namespace,
      context: this.context.currentCluster,
      storage: 'secret'
    }, {
      name: this.props.chart.name,
      revision,
    }, (err: any, res: any) => {
      if (err) {
        console.log(err)
      } else {
        console.log(res)
      }
    });
  }

  renderRevisionList = () => {
    return this.state.revisions.map((revision: any, i: number) => {
      return (
        <Tr key={i}>
          <Td>{revision.version}</Td>
          <Td>{this.readableDate(revision.info.last_deployed)}</Td>
          <Td>{revision.info.status}</Td>
          <Td>
            <RollbackButton
              disabled={revision.version === this.props.chart.version}
              onClick={() => this.handleRollback(revision.version)}
            >
              {revision.version === this.props.chart.version ? 'Current' : 'Revert'}
            </RollbackButton>
          </Td>
        </Tr>
      );
    });
  }

  renderExpanded = () => {
    if (this.props.showRevisions) {
      return (
        <RevisionsTable>
          <tbody>
            <Tr>
              <Th>Revision No.</Th>
              <Th>Timestamp</Th>
              <Th>Status</Th>
              <Th>Rollback</Th>
            </Tr>
            {this.renderRevisionList()}
          </tbody>
        </RevisionsTable>
      )
    }
  }

  render() {
    return (
      <StyledRevisionSection showRevisions={this.props.showRevisions}>
        <RevisionHeader
          showRevisions={this.props.showRevisions}
          onClick={this.props.toggleShowRevisions}
        >
          Current Revision - <Revision>No. {this.props.chart.version}</Revision>
          <i className="material-icons">expand_more</i>
        </RevisionHeader>

        {this.renderExpanded()}
      </StyledRevisionSection>
    );
  }
}

RevisionSection.contextType = Context;

const RollbackButton = styled.div`
  cursor: ${(props: { disabled: boolean }) => props.disabled ? 'not-allowed' :'pointer'};
  display: flex;
  border-radius: 3px;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  height: 21px;
  font-size: 13px;
  width: 70px;
  background: ${(props: { disabled: boolean }) => props.disabled ? '#aaaabbee' :'#616FEEcc'};
  :hover {
    background: ${(props: { disabled: boolean }) => props.disabled ? '' : '#405eddbb'};
  }
`;

const Tr = styled.tr`
  line-height: 1.8em;
`;

const Td = styled.td`
  font-size: 13px;
  color: #ffffff;
`;

const Th = styled.td`
  font-size: 13px;
  font-weight: 500;
  color: #aaaabb;
`;

const RevisionsTable = styled.table`
  width: 100%;
  margin-top: 5px;
  padding-left: 32px;
  padding-bottom: 20px;
`;

const Revision = styled.div`
  color: #ffffff;
  margin-left: 5px;
`;

const RevisionHeader = styled.div`
  color: #ffffff66;
  display: flex;
  align-items: center;
  height: 40px;
  font-size: 14px;
  width: 100%;
  padding-left: 15px;
  cursor: pointer;
  background: ${(props: { showRevisions: boolean }) => props.showRevisions ? '#ffffff11' : ''};
  :hover {
    background: #ffffff18;
    > i {
      background: #ffffff22;
    }
  }

  > i {
    margin-left: 12px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    background: ${(props: { showRevisions: boolean }) => props.showRevisions ? '#ffffff18' : ''};
    transform: ${(props: { showRevisions: boolean }) => props.showRevisions ? 'rotate(180deg)' : ''};
  }
`;

const StyledRevisionSection = styled.div`
  width: 100%;
  max-height: ${(props: { showRevisions: boolean }) => props.showRevisions ? '250px' : '40px'};
  background: #ffffff11;
  margin-top: 25px;
  border-radius: 5px;
  overflow-y: auto;
  animation: ${(props: { showRevisions: boolean }) => props.showRevisions ? 'expandRevisions 0.3s' : ''};
  animation-timing-function: ease-out;
  @keyframes expandRevisions {
    from { max-height: 40px }
    to { max-height: 250px }
  }
`;