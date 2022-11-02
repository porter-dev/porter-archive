import React, { Component } from "react";
import styled from "styled-components";
import close from "assets/close.png";
import api from "shared/api";

import { Context } from "shared/Context";
import { ChartType } from "shared/types";

import Loading from "components/Loading";

import Markdown from "markdown-to-jsx";
import SaveButton from "components/SaveButton";

type PropsType = {
  currentChart: ChartType;
  onSubmit: () => void;
  closeModal: () => void;
};

type StateType = {
  notes: string;
};

export default class UpgradeChartModal extends Component<PropsType, StateType> {
  state = {
    notes: "Loading",
  };

  componentDidMount() {
    // get the chart update notes from the api
    let repoURL = this.context.capabilities.default_addon_helm_repo_url;
    let chartName = this.props.currentChart.chart.metadata.name
      .toLowerCase()
      .trim();

    if (chartName == "web" || chartName == "worker" || chartName === "job") {
      repoURL = this.context.capabilities?.default_app_helm_repo_url;
    }

    api
      .getTemplateUpgradeNotes(
        "<token>",
        {
          repo_url: repoURL,
          prev_version: this.props.currentChart.chart.metadata.version,
        },
        {
          name: chartName,
          version: this.props.currentChart.latest_version,
        }
      )
      .then((res) => {
        if (!res.data.upgrade_notes || res.data.upgrade_notes.length == 0) {
          this.setState({
            notes: `
## Version ${this.props.currentChart.chart.metadata.version} -> ${this.props.currentChart.latest_version}
No upgrade notes available. This update should be backwards-compatible. 
        `,
          });

          return;
        }

        let noteArr = res.data.upgrade_notes.map((note: any) => {
          return `
## Version ${note.previous} -> ${note.target}
${note.note}
            `;
        });

        this.setState({ notes: noteArr.join("\n") });
      })
      .catch((err) => console.log(err));
  }

  renderContent() {
    if (this.state.notes == "Loading") {
      return <Loading />;
    }

    return <Markdown>{this.state.notes}</Markdown>;
  }

  render() {
    return (
      <StyledUpgradeChartModal>
        {this.renderContent()}
        <SaveButton
          disabled={false}
          text="Upgrade Template"
          status={""}
          onClick={this.props.onSubmit}
        />
      </StyledUpgradeChartModal>
    );
  }
}

UpgradeChartModal.contextType = Context;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: Work Sans, sans-serif;
  font-size: 12px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledUpgradeChartModal = styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 30px;
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
  font-size: 13px;
  line-height: 1.8em;
  font-family: Work Sans, sans-serif;
`;
