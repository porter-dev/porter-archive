import React, { Component } from "react";
import styled from "styled-components";

import key from "assets/key.svg";

import { Context } from "shared/Context";
import { readableDate } from "shared/string_utils";

export type EnvGroupData = {
  name: string;
  namespace: string;
  created_at?: string;
  version: number;
};

type PropsType = {
  envGroup: EnvGroupData;
  setExpanded: () => void;
};

type StateType = {
  expand: boolean;
  update: any[];
};

export default class EnvGroup extends Component<PropsType, StateType> {
  state = {
    expand: false,
    update: [] as any[],
  };

  render() {
    let { envGroup, setExpanded } = this.props;
    let name = envGroup?.name;
    let timestamp = envGroup?.created_at;
    let namespace = envGroup?.namespace;
    let version = envGroup?.version;

    return (
      <StyledEnvGroup
        onMouseEnter={() => this.setState({ expand: true })}
        onMouseLeave={() => this.setState({ expand: false })}
        expand={this.state.expand}
        onClick={() => setExpanded()}
      >
        <Title>
          <IconWrapper>
            <Icon src={key} />
          </IconWrapper>
          {name}
        </Title>

        <BottomWrapper>
          <InfoWrapper>
            <LastDeployed>Last updated {readableDate(timestamp)}</LastDeployed>
          </InfoWrapper>

          <TagWrapper>
            Namespace
            <NamespaceTag>{namespace}</NamespaceTag>
          </TagWrapper>
        </BottomWrapper>

        <Version>v{version}</Version>
      </StyledEnvGroup>
    );
  }
}

export function formattedEnvironmentValue(value: string) {
  if (value.startsWith("PORTERSECRET_")) {
    return "••••";
  }
  return value;
}

EnvGroup.contextType = Context;

const BottomWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 11px;
  margin-top: 3px;
`;

const Version = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 12px;
  color: #aaaabb;
`;

const Dot = styled.div`
  margin-right: 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 14px;
  margin-bottom: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #ffffff22;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Icon = styled.img`
  width: 100%;
`;

const IconWrapper = styled.div`
  color: #efefef;
  background: none;
  font-size: 16px;
  top: 11px;
  left: 14px;
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 3px;
  position: absolute;

  > i {
    font-size: 17px;
    margin-top: -1px;
  }
`;

const Title = styled.div`
  position: relative;
  text-decoration: none;
  padding: 12px 35px 12px 45px;
  font-size: 14px;
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  width: 80%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  animation: fadeIn 0.5s;

  > img {
    background: none;
    top: 12px;
    left: 13px;

    padding: 5px 4px;
    width: 24px;
    position: absolute;
  }
`;

const StyledEnvGroup = styled.div`
  cursor: pointer;
  margin-bottom: 15px;
  padding-top: 2px;
  padding-bottom: 13px;
  position: relative;
  width: calc(100% + 2px);
  height: calc(100% + 2px);
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;
