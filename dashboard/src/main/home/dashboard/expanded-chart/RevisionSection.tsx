import React, { Component } from 'react';
import styled from 'styled-components';

import api from '../../../../shared/api';
import { ChartType } from '../../../../shared/types';

type PropsType = {
  showRevisions: boolean,
  toggleShowRevisions: () => void,
  chart: ChartType
};

type StateType = {
};

const dummyRevisions = [
  {
    version: 3,
    timestamp: 'Monday at 5:00 PM',
    status: 'deployed'
  },
  {
    version: 2,
    timestamp: 'Monday at 5:00 PM',
    status: 'superseded'
  },
  {
    version: 1,
    timestamp: 'Monday at 5:00 PM',
    status: 'superseded'
  }
]

export default class RevisionSection extends Component<PropsType, StateType> {
  state = {
  }

  componentDidMount() {
    let { chart } = this.props;

    /*
    api.getRevisions('<token>', {}, { name: chart.name }, (err: any, res: any) => {
      if (err) {
        alert(err);
      } else {
        console.log(res);
      }
    });
    */
  }

  renderRevisionList = () => {
    return dummyRevisions.map((revision: any, i: number) => {
      return (
        <Tr key={i}>
          <Td>{revision.version}</Td>
          <Td>{revision.timestamp}</Td>
          <Td>{revision.status}</Td>
          <Td><RollbackButton disabled={false}>Revert</RollbackButton></Td>
        </Tr>
      );
    });
  }

  renderExpanded = () => {
    if (this.props.showRevisions) {
      return (
        <RevisionsTable>
          <Tr>
            <Th>Revision No.</Th>
            <Th>Timestamp</Th>
            <Th>Status</Th>
            <Th>Rollback</Th>
          </Tr>
          {this.renderRevisionList()}
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

const RollbackButton = styled.div`
  cursor: pointer;
  display: flex;
  border-radius: 3px;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  height: 21px;
  font-size: 13px;
  width: 65px;
  background: ${(props: { disabled: boolean }) => props.disabled ? '#aaaabbee' :'#616FEEcc'};
  :hover {
    background: ${(props: { disabled: boolean }) => props.disabled ? '' : '#505edddd'};
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
`;