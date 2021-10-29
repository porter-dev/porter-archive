import React, { Component } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";

import ResourceTab from "./ResourceTab";

type PropsType = {
  resource: any;
  button: any;
  handleClick?: () => void;
  selected?: boolean;
  isLast?: boolean;
  roundAllCorners?: boolean;
};

type StateType = any;

export default class ExpandableResource extends Component<
  PropsType,
  StateType
> {
  render() {
    let { resource, button } = this.props;

    console.log("BUTTON IS", button, resource);

    return (
      <ResourceTab
        label={resource.label}
        name={resource.name}
        status={{ label: resource.status }}
      >
        <ExpandedWrapper>
          <StatusSection>
            <StatusHeader>
              <Status>
                <Key>Status:</Key> {resource.status}
              </Status>
              <Timestamp>Updated {resource.timestamp}</Timestamp>
            </StatusHeader>
            {resource.message}
          </StatusSection>
          {Object.keys(this.props.resource.data).map(
            (key: string, i: number) => {
              return (
                <Pair key={i}>
                  <Key>{key}:</Key>
                  {this.props.resource.data[key]}
                </Pair>
              );
            }
          )}
        </ExpandedWrapper>
      </ResourceTab>
    );
  }
}

ExpandableResource.contextType = Context;

const Timestamp = styled.div`
  font-size: 12px;
  color: #ffffff44;
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const Status = styled.div`
  display: flex;
  align-items: center;
  color: #aaaabb;
`;

const StatusSection = styled.div`
  border-radius: 8px;
  background: #ffffff11;
  font-size: 13px;
  padding: 20px 20px 25px;
`;

const ExpandedWrapper = styled.div`
  padding: 20px 20px 25px;
`;

const Pair = styled.div`
  margin-top: 20px;
  font-size: 13px;
  padding: 0 5px;
  color: #aaaabb;
  display: flex;
  align-items: center;
`;

const Key = styled.div`
  font-weight: bold;
  color: #ffffff;
  margin-right: 8px;
`;
