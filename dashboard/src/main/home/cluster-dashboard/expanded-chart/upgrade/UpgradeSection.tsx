import React, { Component } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";

import api from "shared/api";
import { ChartType } from "shared/types";

import Markdown from "markdown-to-jsx";
import SaveButton from "components/SaveButton";
import { flatMap } from "lodash";

type PropsType = {
    currentChart: ChartType;
};

type StateType = {
    notes: string;
};

export default class UpgradeSection extends Component<PropsType, StateType> {
    state = {
        notes: "Loading..."
    }

  componentDidMount() {
      // get the chart update notes from the api
      api
      .getTemplateUpgradeNotes("<token>", {
          repo_url: "https://charts.dev.getporter.dev",
          prev_version: "0.1.0",
       }, {
        name: this.props.currentChart.chart.metadata.name.toLowerCase().trim(),
        version: "0.8.0",
      })
      .then((res) => {
          let noteArr = res.data.upgrade_notes.map((note : any) => {
              return `
### Version ${note.previous} -> ${note.target}
${note.note}
              `
          })

          this.setState({ notes: noteArr.join("\n")})
      })
      .catch((err) => console.log(err));
  }

  onSubmit = () => {}

  render() {
    return (
      <StyledUpgradeSection>
          <Markdown>{this.state.notes}</Markdown>
            <SaveButton
            disabled={false}
            text="Upgrade"
            status="Hello status"
            onClick={this.onSubmit}
            />
      </StyledUpgradeSection>
    );
  }
}

UpgradeSection.contextType = Context;

const StyledUpgradeSection = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  overflow: hidden;
`;
