import React, { Component, MouseEvent } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import _ from "lodash";

import api from "shared/api";
import Logs from "../status/Logs";
import plus from "assets/plus.svg";
import closeRounded from "assets/close-rounded.png";
import KeyValueArray from "components/form-components/KeyValueArray";

type PropsType = {
  job: any;
  handleDelete: () => void;
  deleting: boolean;
  readOnly?: boolean;
};

type StateType = {
  expanded: boolean;
  configIsExpanded: boolean;
  pods: any[];
};

export default class JobResource extends Component<PropsType, StateType> {
  state = {
    expanded: false,
    configIsExpanded: false,
    pods: [] as any[],
  };

  expandJob = (event: MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    this.getPods(() => {
      this.setState({ expanded: !this.state.expanded });
    });
  };

  stopJob = (event: MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    let { currentCluster, currentProject, setCurrentError } = this.context;

    api
      .stopJob(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: this.props.job.metadata?.name,
          namespace: this.props.job.metadata?.namespace,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {})
      .catch((err) => {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];
        if (parsedErr) {
          err = parsedErr;
        }
        setCurrentError(err);
      });
  };

  getPods = (callback: () => void) => {
    let { currentCluster, currentProject, setCurrentError } = this.context;

    api
      .getJobPods(
        "<token>",
        {
        },
        {
          id: currentProject.id,
          name: this.props.job.metadata?.name,
          cluster_id: currentCluster.id,
          namespace: this.props.job.metadata?.namespace,
        }
      )
      .then((res) => {
        this.setState({ pods: res.data });
        callback();
      })
      .catch((err) => setCurrentError(JSON.stringify(err)));
  };

  readableDate = (s: string) => {
    let ts = new Date(s);
    let date = ts.toLocaleDateString();
    let time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };

  getCompletedReason = () => {
    let completeCondition: any;

    // get the completed reason from the status
    this.props.job.status?.conditions?.forEach((condition: any, i: number) => {
      if (condition.type == "Complete") {
        completeCondition = condition;
      }
    });

    return (
      completeCondition.reason ||
      `Completed at ${this.readableDate(completeCondition.lastTransitionTime)}`
    );
  };

  getFailedReason = () => {
    let failedCondition: any;

    // get the completed reason from the status
    this.props.job.status?.conditions?.forEach((condition: any, i: number) => {
      if (condition.type == "Failed") {
        failedCondition = condition;
      }
    });

    return failedCondition
      ? `Failed at ${this.readableDate(failedCondition.lastTransitionTime)}`
      : "Failed";
  };

  renderConfigSection = () => {
    let { job } = this.props;
    let commandString = job?.spec?.template?.spec?.containers[0]?.command?.join(
      " "
    );
    let envArray = job?.spec?.template?.spec?.containers[0]?.env;
    let envObject = {} as any;
    envArray &&
      envArray.forEach((env: any, i: number) => {
        envObject[env.name] = env.value;
      });

    // Handle no config to show
    if (!commandString && _.isEmpty(envObject)) {
      return;
    }

    if (!this.state.configIsExpanded) {
      return (
        <ExpandConfigBar
          onClick={() => this.setState({ configIsExpanded: true })}
        >
          <img src={plus} />
          Show Job Config
        </ExpandConfigBar>
      );
    } else {
      let tag = job.spec.template.spec.containers[0].image.split(":")[1];
      return (
        <>
          <ExpandConfigBar
            onClick={() => this.setState({ configIsExpanded: false })}
          >
            <img src={closeRounded} />
            Hide Job Config
          </ExpandConfigBar>
          <ConfigSection>
            {commandString ? (
              <>
                Command: <Command>{commandString}</Command>
              </>
            ) : (
              <DarkMatter size="-18px" />
            )}
            <Row>
              Image Tag: <Command>{tag}</Command>
            </Row>
            {!_.isEmpty(envObject) && (
              <>
                <KeyValueArray
                  envLoader={true}
                  values={envObject}
                  label="Environment Variables:"
                  disabled={true}
                />
                <DarkMatter />
              </>
            )}
          </ConfigSection>
        </>
      );
    }
  };

  renderLogsSection = () => {
    if (this.state.expanded) {
      return (
        <>
          {this.renderConfigSection()}
          <JobLogsWrapper>
            <Logs
              selectedPod={this.state.pods[0]}
              podError={!this.state.pods[0] ? "Pod no longer exists." : ""}
              rawText={true}
            />
          </JobLogsWrapper>
        </>
      );
    }

    return;
  };

  getSubtitle = () => {
    if (this.props.job.status?.succeeded >= 1) {
      return this.getCompletedReason();
    }

    if (this.props.job.status?.failed >= 1) {
      return this.getFailedReason();
    }

    return "Running";
  };

  renderStatus = () => {
    if (this.props.deleting) {
      return <Status color="#cc3d42">Deleting</Status>;
    }

    if (this.props.job.status?.succeeded >= 1) {
      return <Status color="#38a88a">Succeeded</Status>;
    }

    if (this.props.job.status?.failed >= 1) {
      return <Status color="#cc3d42">Failed</Status>;
    }

    return <Status color="#ffffff11">Running</Status>;
  };

  renderStopButton = () => {
    if (this.props.readOnly) {
      return null;
    }

    if (!this.props.job.status?.succeeded && !this.props.job.status?.failed) {
      // look for a sidecar container
      if (this.props.job?.spec?.template?.spec?.containers.length == 2) {
        return (
          <i className="material-icons" onClick={this.stopJob}>
            stop
          </i>
        );
      }
    }
  };

  render() {
    let icon =
      "https://user-images.githubusercontent.com/65516095/111258413-4e2c3800-85f3-11eb-8a6a-88e03460f8fe.png";
    let commandString = this.props.job?.spec?.template?.spec?.containers[0]?.command?.join(
      " "
    );

    return (
      <>
        <StyledJob>
          <MainRow onClick={this.expandJob}>
            <Flex>
              <Icon src={icon && icon} />
              <Description>
                <Label>
                  Started at{" "}
                  {this.readableDate(this.props.job.status?.startTime)}
                </Label>
                <Subtitle>{this.getSubtitle()}</Subtitle>
              </Description>
            </Flex>
            <EndWrapper>
              <CommandString>{commandString}</CommandString>
              {this.renderStatus()}
              <MaterialIconTray disabled={false}>
                {this.renderStopButton()}
                {!this.props.readOnly && (
                  <i
                    className="material-icons"
                    onClick={(e) => {
                      e.stopPropagation();
                      this.props.handleDelete();
                    }}
                  >
                    delete
                  </i>
                )}
                <i className="material-icons" onClick={this.expandJob}>
                  {this.state.expanded ? "expand_less" : "expand_more"}
                </i>
              </MaterialIconTray>
            </EndWrapper>
          </MainRow>
          {this.renderLogsSection()}
        </StyledJob>
      </>
    );
  }
}

JobResource.contextType = Context;

const Row = styled.div`
  margin-top: 20px;
`;

const DarkMatter = styled.div<{ size?: string }>`
  width: 100%;
  margin-bottom: ${(props) => props.size || "-13px"};
`;

const Command = styled.span`
  font-family: monospace;
  color: #aaaabb;
  margin-left: 7px;
`;

const ConfigSection = styled.div`
  padding: 20px 30px;
  font-size: 13px;
  font-weight: 500;
`;

const ExpandConfigBar = styled.div`
  display: flex;
  align-items: center;
  padding-left: 28px;
  font-size: 13px;
  height: 40px;
  width: 100%;
  background: #3f465288;
  color: #ffffff;
  user-select: none;
  cursor: pointer;

  > img {
    width: 18px;
    margin-right: 10px;
  }

  :hover {
    background: #3f4652cc;
  }
`;

const CommandString = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
  color: #ffffff55;
  margin-right: 27px;
  font-family: monospace;
`;

const EndWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Status = styled.div<{ color: string }>`
  padding: 5px 10px;
  margin-right: 12px;
  background: ${(props) => props.color};
  font-size: 13px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 18px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StartedText = styled.div`
  position: relative;
  text-decoration: none;
  padding: 8px;
  font-size: 14px;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  width: 80%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const StyledJob = styled.div`
  display: flex;
  flex-direction: column;
  background: #2b2e36;
  margin-bottom: 20px;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid #ffffff0a;

  :hover {
    border: 1px solid #ffffff3c;
  }
`;

const MainRow = styled.div`
  height: 70px;
  width: 100%;
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: space-between;
  padding: 25px;
  padding-right: 18px;
  border-radius: 5px;
`;

const MaterialIconTray = styled.div`
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    margin: 0 5px;
    color: #ffffff44;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const Description = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
`;

const Label = styled.div`
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
`;

const Subtitle = styled.div`
  color: #aaaabb;
  font-size: 13px;
  display: flex;
  align-items: center;
  padding-top: 5px;
`;

const JobLogsWrapper = styled.div`
  height: 250px;
  width: 100%;
  background-color: black;
  overflow-y: auto;
`;
