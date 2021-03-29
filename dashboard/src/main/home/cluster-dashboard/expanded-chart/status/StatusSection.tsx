import React, { Component } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType, StorageType } from "shared/types";
import Loading from "components/Loading";

import Logs from "./Logs";
import ControllerTab from "./ControllerTab";

type PropsType = {
  selectors?: string[];
  currentChart: ChartType;
};

type StateType = {
  logs: string[];
  pods: any[];
  selectedPod: any;
  controllers: any[];
  loading: boolean;
  podError: string;
};

export default class StatusSection extends Component<PropsType, StateType> {
  state = {
    logs: [] as string[],
    pods: [] as any[],
    selectedPod: {} as any,
    controllers: [] as any[],
    loading: true,
    podError: "",
  };

  renderLogs = () => {
    return (
      <Logs
        podError={this.state.podError}
        key={this.state.selectedPod?.metadata?.name}
        selectedPod={this.state.selectedPod}
      />
    );
  };

  selectPod = (pod: any) => {
    this.setState({
      selectedPod: pod,
    });
  };

  renderTabs = () => {
    return this.state.controllers.map((c, i) => {
      return (
        <ControllerTab
          // handle CronJob case
          key={c.metadata?.uid || c.uid}
          selectedPod={this.state.selectedPod}
          selectPod={this.selectPod.bind(this)}
          selectors={this.props.selectors ? [this.props.selectors[i]] : null}
          controller={c}
          isLast={i === this.state.controllers?.length - 1}
          isFirst={i === 0}
          setPodError={(x: string) => this.setState({ podError: x })}
        />
      );
    });
  };

  renderStatusSection = () => {
    if (this.state.loading) {
      return (
        <NoControllers>
          <Loading />
        </NoControllers>
      );
    }
    if (this.state.controllers?.length > 0) {
      return (
        <Wrapper>
          <TabWrapper>{this.renderTabs()}</TabWrapper>
          {this.renderLogs()}
        </Wrapper>
      );
    }

    if (this.props.currentChart.chart.metadata.name === "job") {
      return (
        <NoControllers>
          <i className="material-icons">category</i>
          There are no jobs currently running.
        </NoControllers>
      );
    }

    return (
      <NoControllers>
        <i className="material-icons">category</i>
        No objects to display. This might happen while your app is still
        deploying.
      </NoControllers>
    );
  };

  componentDidMount() {
    const { currentChart } = this.props;
    let { currentCluster, currentProject, setCurrentError } = this.context;

    api
      .getChartControllers(
        "<token>",
        {
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
        },
        {
          id: currentProject.id,
          name: currentChart.name,
          revision: currentChart.version,
        }
      )
      .then((res: any) => {
        let controllers =
          currentChart.chart.metadata.name == "job"
            ? res.data[0]?.status.active
            : res.data;
        this.setState({ controllers, loading: false });
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        this.setState({ controllers: [], loading: false });
      });
  }

  render() {
    return (
      <StyledStatusSection>{this.renderStatusSection()}</StyledStatusSection>
    );
  }
}

StatusSection.contextType = Context;

const TabWrapper = styled.div`
  width: 35%;
  min-width: 250px;
  height: 100%;
  overflow-y: auto;
`;

const StyledStatusSection = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  font-size: 13px;
  padding: 0px;
  user-select: text;
  border-radius: 5px;
  overflow: hidden;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
`;

const NoControllers = styled.div`
  padding-top: 20%;
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;
