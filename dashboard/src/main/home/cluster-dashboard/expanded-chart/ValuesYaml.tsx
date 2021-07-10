import React, { Component } from "react";
import styled from "styled-components";
import yaml from "js-yaml";

import { ChartType, StorageType } from "shared/types";
import api from "shared/api";
import { Context } from "shared/Context";

import YamlEditor from "components/YamlEditor";
import SaveButton from "components/SaveButton";

type PropsType = {
  currentChart: ChartType;
  refreshChart: () => void;
  disabled?: boolean;
};

type StateType = {
  values: string;
  saveValuesStatus: string | null;
};

// TODO: handle zoom out
export default class ValuesYaml extends Component<PropsType, StateType> {
  state = {
    values: "",
    saveValuesStatus: null as string | null,
  };

  updateValues() {
    let values = "# Nothing here yet";
    if (this.props.currentChart.config) {
      values = yaml.dump(this.props.currentChart.config);
    }
    this.setState({ values });
  }

  componentDidMount() {
    this.updateValues();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (this.props.currentChart !== prevProps.currentChart) {
      this.updateValues();
    }
  }

  handleSaveValues = () => {
    let { currentCluster, setCurrentError, currentProject } = this.context;
    this.setState({ saveValuesStatus: "loading" });

    api
      .upgradeChartValues(
        "<token>",
        {
          namespace: this.props.currentChart.namespace,
          storage: StorageType.Secret,
          values: this.state.values,
        },
        {
          id: currentProject.id,
          name: this.props.currentChart.name,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        this.setState({ saveValuesStatus: "successful" });
        this.props.refreshChart();
      })
      .catch((err) => {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];

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
    return (
      <StyledValuesYaml>
        <Wrapper>
          <YamlEditor
            value={this.state.values}
            onChange={(e: any) => this.setState({ values: e })}
            readOnly={this.props.disabled}
          />
        </Wrapper>
        {!this.props.disabled && (
          <SaveButton
            text="Update Values"
            onClick={this.handleSaveValues}
            status={this.state.saveValuesStatus}
            makeFlush={true}
          />
        )}
      </StyledValuesYaml>
    );
  }
}

ValuesYaml.contextType = Context;

const Wrapper = styled.div`
  overflow: auto;
  height: calc(100% - 60px);
  border-radius: 5px;
  border: 1px solid #ffffff22;
`;

const StyledValuesYaml = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`;
