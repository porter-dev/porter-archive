import React, { Component } from "react";
import styled from "styled-components";
import yaml from "js-yaml";
import _ from "lodash";

import { ChartType, StorageType } from "shared/types";
import api from "shared/api";
import { Context } from "shared/Context";

import YamlEditor from "components/YamlEditor";
import SaveButton from "components/SaveButton";
import ReactDiffViewer from "react-diff-viewer";
import { readableDate } from "shared/string_utils";

type PropsType = {
  currentChart: ChartType;
  compareChart?: ChartType;
  refreshChart: () => void;
  disabled?: boolean;
};

type StateType = {
  values: string;
  compareValues: string;
  saveValuesStatus: string | null;
};

// TODO: handle zoom out
export default class ValuesYaml extends Component<PropsType, StateType> {
  state = {
    values: "",
    compareValues: "",
    saveValuesStatus: null as string | null,
  };

  updateValues() {
    let values = "# Nothing here yet";
    let compareValues = "# Nothing here yet";
    if (this.props.currentChart.config) {
      values = yaml.dump(this.props.currentChart.config);
      if (this.props.compareChart?.config) {
        compareValues = yaml.dump(this.props.compareChart.config);
      }
    }
    this.setState({ values, compareValues });
  }

  componentDidMount() {
    this.updateValues();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (this.props.currentChart !== prevProps.currentChart || this.props.compareChart !== prevProps.compareChart) {
      this.updateValues();
    }
  }

  handleSaveValues = () => {
    let { currentCluster, setCurrentError, currentProject } = this.context;
    this.setState({ saveValuesStatus: "loading" });

    let valuesString = this.state.values;

    // if this is a job, set it to paused
    if (this.props.currentChart?.chart?.metadata?.name == "job") {
      const valuesYAML = yaml.load(this.state.values);
      _.set(valuesYAML, "paused", true);
      valuesString = yaml.dump(valuesYAML);
    }

    api
      .upgradeChartValues(
        "<token>",
        {
          values: valuesString,
          latest_revision: this.props.currentChart.version,
        },
        {
          id: currentProject.id,
          name: this.props.currentChart.name,
          cluster_id: currentCluster.id,
          namespace: this.props.currentChart.namespace,
        }
      )
      .then((res) => {
        this.setState({ saveValuesStatus: "successful" });
        this.props.refreshChart();
      })
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;

        if (parsedErr) {
          err = parsedErr;
        }

        this.setState({
          saveValuesStatus: parsedErr,
        });

        setCurrentError(parsedErr);
      });
  };

  render() {
    const compareVersionPrecedesCurrentVersion = this.props.compareChart && this.props.compareChart.version < this.props.currentChart.version;

    return (
      <>
        {this.props.compareChart ?
          <ReactDiffViewer
            oldValue={compareVersionPrecedesCurrentVersion ? this.state.compareValues : this.state.values}
            newValue={compareVersionPrecedesCurrentVersion ? this.state.values : this.state.compareValues}
            splitView
            useDarkTheme
            leftTitle={compareVersionPrecedesCurrentVersion ? `Version ${this.props.compareChart.version.toString()} (Deployed ${readableDate(this.props.compareChart.info.last_deployed)})` : `Version ${this.props.currentChart.version.toString()} (Deployed ${readableDate(this.props.currentChart.info.last_deployed)})`}
            rightTitle={compareVersionPrecedesCurrentVersion ? `Version ${this.props.currentChart.version.toString()} (Deployed ${readableDate(this.props.currentChart.info.last_deployed)})` : `Version ${this.props.compareChart.version.toString()} (Deployed ${readableDate(this.props.compareChart.info.last_deployed)})`}
          />
          :
          <StyledValuesYaml>
            <Wrapper>
              <YamlEditor
                value={this.state.values}
                onChange={(e: any) => this.setState({ values: e })}
                readOnly={this.props.disabled}
                height="calc(100vh - 412px)"
              />
            </Wrapper>
            {!this.props.disabled && (
              <SaveButton
                text="Update values"
                onClick={this.handleSaveValues}
                status={this.state.saveValuesStatus}
                statusPosition="right"
                clearPosition={true}
                makeFlush={true}
              />
            )}
          </StyledValuesYaml>}
      </>
    );
  }
}

ValuesYaml.contextType = Context;

const Wrapper = styled.div`
  overflow: auto;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid #ffffff33;
`;

const StyledValuesYaml = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 350px);
  font-size: 13px;
  overflow: hidden;
  border-radius: 8px;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
