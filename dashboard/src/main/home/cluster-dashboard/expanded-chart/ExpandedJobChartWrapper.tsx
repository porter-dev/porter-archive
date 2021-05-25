import React, { Component } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";

import api from "shared/api";
import { PorterUrl, pushQueryParams, pushFiltered } from "shared/routing";
import ExpandedJobChart from "./ExpandedJobChart";
import Loading from "components/Loading";

type PropsType = RouteComponentProps & {
  setSidebar: (x: boolean) => void;
};

type StateType = {
  loading: boolean;
};

class ExpandedJobChartWrapper extends Component<PropsType, StateType> {
  state = {
    loading: true,
  };

  getClusterFromName = (clusterName: string) => {
    api
      .getClusters("<token>", {}, { id: currentProject.id })
      .then((res) => {
        window.analytics.identify(user.userId, {
          currentProject,
          clusters: res.data,
        });

        this.props.setWelcome(false);
        // TODO: handle uninitialized kubeconfig
        if (res.data) {
          let clusters = res.data;
  }

  getChartFromName = (chartName: string) => {

  }

  componentDidMount() {
    let { setSidebar, location, match } = this.props;
    let { clusterName, namespace, chartName } = match.params as any;
    console.log(clusterName, namespace, chartName);
  } 

  render() {
    let { loading } = this.state;
    if (loading) {
      return <Loading />
    }
    return (
      <h1>lil ol me</h1>
    );
  }
}

export default withRouter(ExpandedJobChartWrapper);
