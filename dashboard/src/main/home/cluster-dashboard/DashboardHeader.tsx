import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";

import TitleSection from "components/TitleSection";
import Spacer from "components/porter/Spacer";
import Tooltip from "components/porter/Tooltip";

type PropsType = {
  image?: any;
  title: any;
  description?: any;
  materialIconClass?: string;
  disableLineBreak?: boolean;
  capitalize?: boolean;
};

type StateType = {};

export default class DashboardHeader extends Component<PropsType, StateType> {
  render() {
    return (
      <>
        <TitleSection
          capitalize={
            this.props.capitalize === undefined || this.props.capitalize
          }
          icon={this.props.image}
          materialIconClass={this.props.materialIconClass}
        >
          {this.props.title}
        </TitleSection>

        {this.props.description && (
          <>
            <Spacer height="35px" />
            <InfoSection>
              <TopRow>
                <Tooltip content="TestInfo" position="bottom" hidden={true}>
                  <InfoLabel>
                    <i className="material-icons">info</i> Info
                  </InfoLabel>
                </Tooltip>
              </TopRow>
              <Description>{this.props.description}</Description>
            </InfoSection>
          </>
        )}
        <Spacer height="35px" />
      </>
    );
  }
}

DashboardHeader.contextType = Context;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 1px;
  background: #494b4f;
  width: 100%;
  margin: 10px 0px 15px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #aaaabb;
  margin-top: 13px;
  margin-left: 1px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #aaaabb;
  font-size: 13px;
  > i {
    color: #aaaabb;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const InfoSection = styled.div`
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
`;

const ClusterLabel = styled.div`
  color: #ffffff22;
  font-size: 14px;
  text-transform: none;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
