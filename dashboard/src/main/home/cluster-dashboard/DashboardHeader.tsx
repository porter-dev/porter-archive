import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";

import TitleSection from "components/TitleSection";

type PropsType = {
  image: any;
  title: string;
  description: string;
};

type StateType = {};

export default class DashboardHeader extends Component<PropsType, StateType> {
  render() {
    return (
      <>
        <TitleSection capitalize={true} icon={this.props.image}>
          {this.props.title}
        </TitleSection>

        <Br />

        <InfoSection>
          <TopRow>
            <InfoLabel>
              <i className="material-icons">info</i> Info
            </InfoLabel>
          </TopRow>
          <Description>{this.props.description}</Description>
        </InfoSection>

        <LineBreak />
      </>
    );
  }
}

DashboardHeader.contextType = Context;

const Br = styled.div`
  width: 100%;
  height: 1px;
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 10px 0px 35px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #aaaabb;
  margin-top: 13px;
  margin-left: 2px;
  font-size: 13px;
  line-height: 1.5em;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #7a838f;
  font-size: 13px;
  > i {
    color: #8b949f;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const InfoSection = styled.div`
  margin-top: 20px;
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
  margin-bottom: 35px;
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