import React, { Component } from "react";
import styled from "styled-components";

import api from "shared/api";
import { ProjectType } from "shared/types";
import { isAlphanumeric } from "shared/common";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";

import SaveButton from "components/SaveButton";
import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {
  projectName: string;
  trackOnSave: () => void;
};

type StateType = {
  buttonStatus: string;
};

class ExistingClusterSection extends Component<PropsType, StateType> {
  state = {
    buttonStatus: "",
  };

  onSkip = () => {
    this.props?.trackOnSave();

    this.setState({ buttonStatus: "loading" });

    pushFiltered(this.props, "/dashboard", ["project_id"], {
      tab: "overview",
    });
  };

  render() {
    let { children, projectName } = this.props;
    let { buttonStatus } = this.state;
    return (
      <StyledExistingClusterSection>
        <Placeholder>
          You can manually link to an existing cluster once this project has
          been created.
        </Placeholder>
        {children ? children : <Padding />}
        <SaveButton
          text="Submit"
          disabled={!isAlphanumeric(projectName)}
          onClick={this.onSkip}
          status={buttonStatus}
          makeFlush={true}
          helper="Note: Provisioning can take up to 15 minutes"
        />
      </StyledExistingClusterSection>
    );
  }
}

ExistingClusterSection.contextType = Context;

export default withRouter(ExistingClusterSection);

const Padding = styled.div`
  height: 15px;
`;

const StyledExistingClusterSection = styled.div`
  position: relative;
  padding-bottom: 35px;
`;

const Placeholder = styled.div`
  margin-top: 25px;
  background: #26282f;
  margin-bottom: 27px;
  border-radius: 5px;
  height: 230px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 13px;
`;
