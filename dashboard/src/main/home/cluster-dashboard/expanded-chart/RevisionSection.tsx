import React, { Component } from "react";
import styled from "styled-components";
import loading from "assets/loading.gif";

import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType, StorageType } from "shared/types";

import ConfirmOverlay from "components/ConfirmOverlay";

type PropsType = {
  showRevisions: boolean;
  toggleShowRevisions: () => void;
  chart: ChartType;
  refreshChart: () => void;
  setRevision: (x: ChartType, isCurrent?: boolean) => void;
  forceRefreshRevisions: boolean;
  refreshRevisionsOff: () => void;
  status: string;
};

type StateType = {
  revisions: ChartType[];
  rollbackRevision: number | null;
  loading: boolean;
  maxVersion: number;
};

// TODO: handle refresh when new revision is generated from an old revision
export default class RevisionSection extends Component<PropsType, StateType> {
  state = {
    revisions: [] as ChartType[],
    rollbackRevision: null as number | null,
    loading: false,
    maxVersion: 0, // Track most recent version even when previewing old revisions
  };

  refreshHistory = () => {
    let { chart } = this.props;
    let { currentCluster, currentProject } = this.context;
    return api
      .getRevisions(
        "<token>",
        {
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
        },
        { id: currentProject.id, name: chart.name }
      )
      .then((res) => {
        res.data.sort((a: ChartType, b: ChartType) => {
          return -(a.version - b.version);
        });
        this.setState({
          revisions: res.data,
          maxVersion: res.data[0].version,
        });
      })
      .catch(console.log);
  };

  componentDidMount() {
    this.refreshHistory();
  }

  // Handle update of values.yaml
  componentDidUpdate(prevProps: PropsType) {
    if (this.props.forceRefreshRevisions) {
      this.props.refreshRevisionsOff();

      // Force refresh occurs on submit -> set current to newest
      this.refreshHistory().then(() => {
        this.props.setRevision(this.state.revisions[0], true);
      });
    } else if (this.props.chart !== prevProps.chart) {
      this.refreshHistory();
    }
  }

  readableDate = (s: string) => {
    let ts = new Date(s);
    let date = ts.toLocaleDateString();
    let time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };

  handleRollback = () => {
    let { setCurrentError, currentCluster, currentProject } = this.context;

    let revisionNumber = this.state.rollbackRevision;
    this.setState({ loading: true, rollbackRevision: null });

    api
      .rollbackChart(
        "<token>",
        {
          namespace: this.props.chart.namespace,
          storage: StorageType.Secret,
          revision: revisionNumber,
        },
        {
          id: currentProject.id,
          name: this.props.chart.name,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        this.setState({ loading: false });
        this.refreshHistory().then(() => {
          this.props.setRevision(this.state.revisions[0], true);
        });
      })
      .catch((err) => {
        console.log(err);
        setCurrentError(err.response.data);
        this.setState({ loading: false });
      });
  };

  handleClickRevision = (revision: ChartType) => {
    let isCurrent = revision.version === this.state.maxVersion;
    if (isCurrent) {
      this.props.setRevision(revision, true);
    } else {
      this.props.setRevision(revision);
    }
  };

  renderStatus = (revision: ChartType) => {
    if (
      this.props.chart.version === revision.version &&
      this.props.status == "loading"
    ) {
      return (
        <div>
          {this.props.status}
          <LoadingGif src={loading} revision={true} />
        </div>
      );
    } else if (this.props.chart.version === revision.version) {
      return this.props.status;
    }
    return revision.info.status;
  };

  renderRevisionList = () => {
    return this.state.revisions.map((revision: ChartType, i: number) => {
      let isCurrent = revision.version === this.state.maxVersion;
      return (
        <Tr
          key={i}
          onClick={() => this.handleClickRevision(revision)}
          selected={this.props.chart.version === revision.version}
        >
          <Td>{revision.version}</Td>
          <Td>{this.readableDate(revision.info.last_deployed)}</Td>
          <Td>{this.renderStatus(revision)}</Td>
          <Td>
            <RollbackButton
              disabled={isCurrent}
              onClick={() =>
                this.setState({ rollbackRevision: revision.version })
              }
            >
              {isCurrent ? "Current" : "Revert"}
            </RollbackButton>
          </Td>
        </Tr>
      );
    });
  };

  renderExpanded = () => {
    if (this.props.showRevisions) {
      return (
        <TableWrapper>
          <RevisionsTable>
            <tbody>
              <Tr disableHover={true}>
                <Th>Revision No.</Th>
                <Th>Timestamp</Th>
                <Th>Status</Th>
                <Th>Rollback</Th>
              </Tr>
              {this.renderRevisionList()}
            </tbody>
          </RevisionsTable>
        </TableWrapper>
      );
    }
  };

  renderContents = () => {
    if (this.state.loading) {
      return (
        <LoadingPlaceholder>
          <StatusWrapper>
            <LoadingGif src={loading} revision={false} /> Updating . . .
          </StatusWrapper>
        </LoadingPlaceholder>
      );
    }

    let isCurrent =
      this.props.chart.version === this.state.maxVersion ||
      this.state.maxVersion === 0;
    return (
      <div>
        <RevisionHeader
          showRevisions={this.props.showRevisions}
          isCurrent={isCurrent}
          onClick={this.props.toggleShowRevisions}
        >
          {isCurrent
            ? `Current Revision`
            : `Previewing Revision (Not Deployed)`}{" "}
          - <Revision>No. {this.props.chart.version}</Revision>
          <i className="material-icons">expand_more</i>
        </RevisionHeader>

        <RevisionList>{this.renderExpanded()}</RevisionList>
      </div>
    );
  };

  render() {
    return (
      <StyledRevisionSection showRevisions={this.props.showRevisions}>
        {this.renderContents()}
        <ConfirmOverlay
          show={this.state.rollbackRevision && true}
          message={`Are you sure you want to revert to version ${this.state.rollbackRevision}?`}
          onYes={this.handleRollback}
          onNo={() => this.setState({ rollbackRevision: null })}
        />
      </StyledRevisionSection>
    );
  }
}

RevisionSection.contextType = Context;

const TableWrapper = styled.div`
  padding-bottom: 20px;
`;

const LoadingPlaceholder = styled.div`
  height: 40px;
  display: flex;
  align-items: center;
  padding-left: 20px;
`;

const LoadingGif = styled.img`
  width: 15px;
  height: 15px;
  margin-right: ${(props: { revision: boolean }) =>
    props.revision ? "0px" : "9px"};
  margin-left: ${(props: { revision: boolean }) =>
    props.revision ? "10px" : "0px"};
  margin-bottom: ${(props: { revision: boolean }) =>
    props.revision ? "-2px" : "0px"};
`;

const StatusWrapper = styled.div`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  margin-right: 25px;
`;

const RevisionList = styled.div`
  overflow-y: auto;
  max-height: 215px;
`;

const RollbackButton = styled.div`
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  display: flex;
  border-radius: 3px;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  height: 21px;
  font-size: 13px;
  width: 70px;
  background: ${(props: { disabled: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled: boolean }) =>
      props.disabled ? "" : "#405eddbb"};
  }
`;

const Tr = styled.tr`
  line-height: 2.2em;
  cursor: ${(props: { disableHover?: boolean; selected?: boolean }) =>
    props.disableHover ? "" : "pointer"};
  background: ${(props: { disableHover?: boolean; selected?: boolean }) =>
    props.selected ? "#ffffff11" : ""};
  :hover {
    background: ${(props: { disableHover?: boolean; selected?: boolean }) =>
      props.disableHover ? "" : "#ffffff22"};
  }
`;

const Td = styled.td`
  font-size: 13px;
  color: #ffffff;
  padding-left: 32px;
`;

const Th = styled.td`
  font-size: 13px;
  font-weight: 500;
  color: #aaaabb;
  padding-left: 32px;
`;

const RevisionsTable = styled.table`
  width: 100%;
  margin-top: 5px;
  padding-left: 32px;
  padding-bottom: 20px;
  min-width: 500px;
  border-collapse: collapse;
`;

const Revision = styled.div`
  color: #ffffff;
  margin-left: 5px;
`;

const RevisionHeader = styled.div`
  color: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
    props.isCurrent ? "#ffffff66" : "#f5cb42"};
  display: flex;
  align-items: center;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 15px;
  cursor: pointer;
  background: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
    props.showRevisions ? "#ffffff11" : ""};
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
    background: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
      props.showRevisions ? "#ffffff18" : ""};
    transform: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
      props.showRevisions ? "rotate(180deg)" : ""};
  }
`;

const StyledRevisionSection = styled.div`
  width: 100%;
  max-height: ${(props: { showRevisions: boolean }) =>
    props.showRevisions ? "255px" : "40px"};
  background: #ffffff11;
  margin: 25px 0px 18px;
  overflow: hidden;
  border-radius: 5px;
  animation: ${(props: { showRevisions: boolean }) =>
    props.showRevisions ? "expandRevisions 0.3s" : ""};
  animation-timing-function: ease-out;
  @keyframes expandRevisions {
    from {
      max-height: 40px;
    }
    to {
      max-height: 250px;
    }
  }
`;
