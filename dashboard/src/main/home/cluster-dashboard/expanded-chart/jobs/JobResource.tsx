import React, { MouseEvent, Component } from "react";
import styled from "styled-components";

import { ChartType, StorageType } from "shared/types";
import { Context } from "shared/Context";
import StatusIndicator from "components/StatusIndicator";

import api from "shared/api";
import Logs from "../status/Logs"

type PropsType = {
    job: any,
};

type StateType = {
    expanded: boolean;
    pods: any[];
};

export default class JobResource extends Component<PropsType, StateType> {
    state = {
        expanded: false,
        pods: [] as any[],
    }

  expandJob = (event: MouseEvent) => {
    if (event) {
        event.stopPropagation();
      }

      this.getPods(() => {
        this.setState({ expanded: !this.state.expanded })
      })
  }

  getPods = (callback : () => void) => {
    let { currentCluster, currentProject, setCurrentError } = this.context;

    api.getJobPods(
        "<token>",
        {
          cluster_id: currentCluster.id,
        },
        {
          id: currentProject.id,
          name: this.props.job.metadata?.name,
          namespace: this.props.job.metadata?.namespace,
        }
      ).then(res => {
          this.setState({ pods: res.data })
          callback()
      })
      .catch(err => setCurrentError(JSON.stringify(err)));
  }

  readableDate = (s: string) => {
    let ts = new Date(s);
    let date = ts.toLocaleDateString();
    let time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
    return `${time} on ${date}`;
  };

  getCompletedReason = () => {
      let completeCondition : any

      // get the completed reason from the status 
      this.props.job.status?.conditions?.forEach((condition: any, i: number) => {
          if (condition.type == "Complete") {
              completeCondition = condition
          }
      })

      return completeCondition.reason || `Completed at ${this.readableDate(completeCondition.lastTransitionTime)}`
  }

  getFailedReason = () => {
    let failedCondition : any

    // get the completed reason from the status 
    this.props.job.status?.conditions?.forEach((condition: any, i: number) => {
        if (condition.type == "Failed") {
            failedCondition = condition
        }
    })

    return `Failed at ${this.readableDate(failedCondition.lastTransitionTime)}`
}

  renderLogsSection = () => {
      if (this.state.expanded) {
          return <JobLogsWrapper>
              <Logs 
                selectedPod={this.state.pods[0]}
                podError={""}
                rawText={true}
              />
          </JobLogsWrapper>
      }
      
      return
  }

  getSubtitle = () => {
      if (this.props.job.status?.succeeded >= 1) {
          return this.getCompletedReason()
      }

      if (this.props.job.status?.failed >= 1) {
        return this.getFailedReason()
      }

      return "Running"
  }

  render() {
    let icon = "https://user-images.githubusercontent.com/65516095/111258413-4e2c3800-85f3-11eb-8a6a-88e03460f8fe.png"

    return (
      <StyledJob>
        <MainRow onClick={this.expandJob}>
          <Flex>
            <Icon src={icon && icon} />
            <Description>
              <Label>Started at {this.readableDate(this.props.job.status?.startTime)}</Label>
              <Subtitle>{this.getSubtitle()}</Subtitle>
            </Description>
          </Flex>
          <MaterialIconTray disabled={false}>
            {/* <i className="material-icons"
            onClick={this.editButtonOnClick}>mode_edit</i> */}
            <i className="material-icons" onClick={this.expandJob}>
              {this.state.expanded ? "expand_less" : "expand_more"}
            </i>
          </MaterialIconTray>
        </MainRow>
        {this.renderLogsSection()}
      </StyledJob>
    );
  }
}

JobResource.contextType = Context;

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
  cursor: pointer;
  margin-bottom: 20px;
  border-radius: 5px;
  border: 1px solid #ffffff0a;

  :hover {
    border: 1px solid #ffffff3c;
  }
`;

const MainRow = styled.div`
  height: 70px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 25px;
  border-radius: 5px;
`;

const MaterialIconTray = styled.div`
  max-width: 60px;
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
  font-size: 14px;
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
  height: 400px; 
  width: 100%;
  background-color: black;
`