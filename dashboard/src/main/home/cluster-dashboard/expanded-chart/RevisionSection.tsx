import React, { Component } from "react";
import styled from "styled-components";
import loading from "assets/loading.gif";

import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType, StorageType } from "shared/types";

import ConfirmOverlay from "components/ConfirmOverlay";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";

import Modal from "main/home/modals/Modal";
import UpgradeChartModal from "main/home/modals/UpgradeChartModal";
import { readableDate } from "shared/string_utils";

type PropsType = WithAuthProps & {
  chart: ChartType;
  refreshChart: () => void;
  setRevision: (x: ChartType, isCurrent?: boolean) => void;
  forceRefreshRevisions: boolean;
  refreshRevisionsOff: () => void;
  shouldUpdate: boolean;
  upgradeVersion: (version: string, cb: () => void) => void;
  latestVersion: string;
  showRevisions?: boolean;
  toggleShowRevisions?: () => void;
};

type StateType = {
  revisions: ChartType[];
  rollbackRevision: number | null;
  upgradeVersion: string;
  loading: boolean;
  maxVersion: number;
  expandRevisions: boolean;
};

// TODO: handle refresh when new revision is generated from an old revision
class RevisionSection extends Component<PropsType, StateType> {
  state = {
    revisions: [] as ChartType[],
    rollbackRevision: null as number | null,
    upgradeVersion: "",
    loading: false,
    maxVersion: 0, // Track most recent version even when previewing old revisions
    expandRevisions: false,
  };

  refreshHistory = () => {
    let { chart } = this.props;
    let { currentCluster, currentProject } = this.context;

    return api
      .getRevisions(
        "<token>",
        {},
        {
          id: currentProject.id,
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
          name: chart.name,
        }
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
    this.connectToLiveUpdates();
  }

  connectToLiveUpdates() {
    let { chart } = this.props;
    let { currentCluster, currentProject } = this.context;

    const apiPath = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/helm_release?charts=${chart.name}`;
    const protocol = window.location.protocol == "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}`;

    const ws = new WebSocket(`${url}${apiPath}`);

    ws.onopen = () => {
      // console.log("connected to chart live updates websocket");
    };

    ws.onmessage = (evt: MessageEvent) => {
      let event = JSON.parse(evt.data);

      if (event.event_type == "UPDATE") {
        let object = event.Object;

        this.setState(
          (prevState) => {
            const { revisions: oldRevisions } = prevState;
            // Copy old array to clean up references
            const prevRevisions = [...oldRevisions];

            // Check if it's an update of a revision or if it's a new one
            const revisionIndex = prevRevisions.findIndex((rev) => {
              if (rev.version === object.version) {
                return true;
              }
            });

            // Place new one at top of the array or update the old one
            if (revisionIndex > -1) {
              prevRevisions.splice(revisionIndex, 1, object);
            } else {
              return { ...prevState, revisions: [object, ...prevRevisions] };
            }

            return { ...prevState, revisions: prevRevisions };
          },
          () => {
            this.props.setRevision(this.state.revisions[0], true);
          }
        );
      }
    };

    ws.onclose = () => {
      console.log("closing chart live updates websocket");
    };

    ws.onerror = (err: ErrorEvent) => {
      console.log(err);
      ws.close();
    };
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

  handleRollback = () => {
    let { setCurrentError, currentCluster, currentProject } = this.context;

    let revisionNumber = this.state.rollbackRevision;
    this.setState({ loading: true, rollbackRevision: null });

    api
      .rollbackChart(
        "<token>",
        {
          revision: revisionNumber,
        },
        {
          id: currentProject.id,
          name: this.props.chart.name,
          namespace: this.props.chart.namespace,
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

  renderRevisionList = () => {
    return this.state.revisions.map((revision: ChartType, i: number) => {
      let isCurrent = revision.version === this.state.maxVersion;
      const isGithubApp = !!this.props.chart.git_action_config;
      const imageTag = revision.config?.image?.tag;

      const parsedImageTag = isGithubApp
        ? String(imageTag).slice(0, 7)
        : imageTag;

      const isStack = !!this.props.chart.stack_id;

      return (
        <Tr
          key={i}
          onClick={() => this.handleClickRevision(revision)}
          selected={this.props.chart.version === revision.version}
        >
          <Td>{revision.version}</Td>
          <Td>{readableDate(revision.info.last_deployed)}</Td>
          <Td>
            {!imageTag ? (
              "N/A"
            ) : isGithubApp && /^[0-9A-Fa-f]{7}$/g.test(imageTag) ? (
              <A
                href={`https://github.com/${this.props.chart.git_action_config?.git_repo}/commit/${imageTag}`}
                target="_blank"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {parsedImageTag}
              </A>
            ) : (
              parsedImageTag
            )}
          </Td>
          <Td>v{revision.chart.metadata.version}</Td>
          <Td>
            <RollbackButton
              disabled={
                isCurrent ||
                !this.props.isAuthorized("application", "", [
                  "get",
                  "update",
                ]) ||
                isStack
              }
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
    if (this.state.expandRevisions) {
      return (
        <TableWrapper>
          <RevisionsTable>
            <tbody>
              <Tr disableHover={true}>
                <Th>Revision No.</Th>
                <Th>Timestamp</Th>
                <Th>
                  {this.props.chart.git_action_config ? "Commit" : "Image Tag"}
                </Th>
                <Th>Template Version</Th>
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
        {this.state.upgradeVersion && (
          <Modal
            onRequestClose={() => this.setState({ upgradeVersion: "" })}
            width="500px"
            height="450px"
          >
            <UpgradeChartModal
              currentChart={this.props.chart}
              closeModal={() => {
                this.setState({ upgradeVersion: "" });
              }}
              onSubmit={() => {
                this.props.upgradeVersion(this.state.upgradeVersion, () => {
                  this.setState({ loading: false });
                });
                this.setState({ upgradeVersion: "", loading: true });
              }}
            />
          </Modal>
        )}
        <RevisionHeader
          showRevisions={this.props.showRevisions}
          isCurrent={isCurrent}
          onClick={() => {
            if (typeof this.props.toggleShowRevisions === "function") {
              this.props.toggleShowRevisions();
            }
            this.setState((prev) => ({
              ...prev,
              expandRevisions: !prev.expandRevisions,
            }));
          }}
        >
          <RevisionPreview>
            {isCurrent
              ? `Current Revision`
              : `Previewing Revision (Not Deployed)`}{" "}
            - <Revision>No. {this.props.chart.version}</Revision>
            <i className="material-icons">arrow_drop_down</i>
          </RevisionPreview>
          {this.props.shouldUpdate && isCurrent && (
            <div>
              <RevisionUpdateMessage
                onClick={(e) => {
                  e.stopPropagation();
                  this.setState({ upgradeVersion: this.props.latestVersion });
                }}
              >
                <i className="material-icons">notification_important</i>
                Template Update Available
              </RevisionUpdateMessage>
            </div>
          )}
        </RevisionHeader>
        <RevisionList>{this.renderExpanded()}</RevisionList>
      </div>
    );
  };

  render() {
    return (
      <StyledRevisionSection showRevisions={this.state.expandRevisions}>
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

export default withAuth(RevisionSection);

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
  justify-content: space-between;
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
    > div > i {
      background: #ffffff22;
    }
  }

  > div > i {
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
  border-radius: 8px;
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

const RevisionPreview = styled.div`
  display: flex;
  align-items: center;
`;

const RevisionUpdateMessage = styled.div`
  color: white;
  display: flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 5px;
  margin-right: 10px;

  :hover {
    border: 1px solid white;
    padding: 3px 9px;
  }

  > i {
    margin-right: 6px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: none;
  }
`;

const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  cursor: pointer;
`;
