import React, { Component } from "react";
import styled from "styled-components";

import Loading from "components/Loading";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";

import EventTab from "./EventTab";

type PropsType = {
  currentChart: ChartType;
};

type StateType = {
  events: any[];
  loading: boolean;
};

export default class StatusSection extends Component<PropsType, StateType> {
  state = {
    events: [] as any[],
    loading: true
  };

  renderTabs = () => {
    return this.state.events.map((c, i) => {
      return <EventTab />;
    });
  };

  renderStatusSection = () => {
    if (this.state.loading) {
      return (
        <NoEvents>
          <Loading />
        </NoEvents>
      );
    }
    if (this.state.events.length > 0) {
      return <Wrapper>{this.renderTabs()}</Wrapper>;
    } else {
      return (
        <NoEvents>
          <i className="material-icons">category</i>
          No events to display. This might happen while your app is still
          deploying.
        </NoEvents>
      );
    }
  };

  componentDidMount() {
    const { currentChart } = this.props;
    let { currentCluster, currentProject, setCurrentError } = this.context;

    // api.getChartEvents('<token>', {
    //   namespace: currentChart.namespace,
    //   cluster_id: currentCluster.id,
    //   storage: StorageType.Secret
    // }, {
    //   id: currentProject.id,
    //   name: currentChart.name,
    //   revision: currentChart.version
    // }, (err: any, res: any) => {
    //   if (err) {
    //     setCurrentError(JSON.stringify(err));
    //     return
    //   }
    //   this.setState({ controllers: res.data, loading: false })
    // });
    this.setState({ events: [1, 2, 3], loading: false });
  }

  render() {
    return (
      <StyledDeploySection>{this.renderStatusSection()}</StyledDeploySection>
    );
  }
}

StatusSection.contextType = Context;

const StyledDeploySection = styled.div`
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
  overflow-y: auto;
  min-width: 250px;
`;

const NoEvents = styled.div`
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
