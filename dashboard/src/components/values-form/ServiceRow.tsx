import React, { Component } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import { hardcodedNames, hardcodedIcons } from "shared/hardcodedNameDict";

type PropsType = {
  service: {
    clusterIP: string,
    name: string,
    release: string,
    app: string,
    namespace: string,
    type?: string,
  }
};

type StateType = any;

export default class ServiceRow extends Component<
  PropsType,
  StateType
> {
  render() {
    let { clusterIP, name, namespace, type, app, release } = this.props.service;
    name = name || release;
    type = type || app;
    return (
      <>
      { name && type && hardcodedNames[type] && hardcodedIcons[type] && namespace !== "kube-system" &&
        <StyledServiceRow>
          <Flex>
            <Icon src={hardcodedIcons[type]} />
            <Type>{hardcodedNames[type]}</Type>
            <Name>{name}</Name> <Dash>-</Dash> <IP>{clusterIP}</IP>
          </Flex>
          <TagWrapper>
            Namespace: <NamespaceTag>{namespace}</NamespaceTag>
          </TagWrapper>
        </StyledServiceRow>
      }
      </>
    );
  }
}

ServiceRow.contextType = Context;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const TagWrapper = styled.div`
  float: right;
  height: 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  border-right: 0;
  border-radius: 3px;
  padding-left: 5px;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  border-radius: 3px;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 3px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
`;


const Dash = styled.div`
  margin-right: 10px;
`;

const Icon = styled.img`
  width: 20px;
  margin-right: 12px;
`;

const Type = styled.div`
  color: #aaaabb;
  margin-right: 15px;
`;

const Name = styled.div`
  margin-right: 10px;
`;

const IP = styled.div`
  user-select: text;
  font-weight: 500;
`;

const StyledServiceRow = styled.div`
  width: 100%;
  height: 40px;
  background: #ffffff11;
  margin-bottom: 15px;
  border-radius: 5px;
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;