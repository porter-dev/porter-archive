import React, { Component } from "react";
import styled from "styled-components";
import close from "assets/close.png";

import { Context } from "shared/Context";
import api from "shared/api";
import { integrationList } from "shared/common";

type PropsType = {};

type StateType = {
  integrations: any[];
};

export default class IntegrationsModal extends Component<PropsType, StateType> {
  state = {
    integrations: [] as any[],
  };

  componentDidMount() {
    let { category } = this.context.currentModalData;
    if (category === "kubernetes") {
      api
        .getClusterIntegrations("<token>", {}, {})
        .then((res) => this.setState({ integrations: res.data }))
        .catch((err) => console.log(err));
    } else if (category === "registry") {
      api
        .getRegistryIntegrations("<token>", {}, {})
        .then((res) => this.setState({ integrations: res.data }))
        .catch((err) => console.log(err));
    } else {
      api
        .getRepoIntegrations("<token>", {}, {})
        .then((res) => this.setState({ integrations: res.data }))
        .catch((err) => console.log(err));
    }
  }

  renderIntegrationsCatalog = () => {
    if (this.context.currentModalData) {
      let { setCurrentIntegration } = this.context.currentModalData;
      return this.state.integrations.map((integration: any, i: number) => {
        let icon =
          integrationList[integration.service] &&
          integrationList[integration.service].icon;
        let disabled =
          integration.service === "kube" || integration.service === "dockerhub";

        if (!disabled) {
          return (
          <IntegrationOption
            key={i}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setCurrentIntegration(integration.service);
                this.context.setCurrentModal(null, null);
              }
            }}
          >
            <Icon src={icon && icon} />
            <Label>{integrationList[integration.service].label}</Label>
          </IntegrationOption>
        );
        }
      });
    }
  };

  render() {
    return (
      <>
        <Subtitle>Select the service you would like to connect to.</Subtitle>
        <IntegrationsCatalog>
          {this.renderIntegrationsCatalog()}
        </IntegrationsCatalog>
      </>
    );
  }
}

IntegrationsModal.contextType = Context;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 15px;
`;

const IntegrationOption = styled.div`
  height: 60px;
  user-select: none;
  width: 100%;
  border-bottom: 1px solid #ffffff44;
  display: flex;
  align-items: center;
  padding: 20px;
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  :hover {
    background: ${(props: { disabled: boolean }) =>
      props.disabled ? "" : "#ffffff22"};
  }
`;

const IntegrationsCatalog = styled.div`
  width: 100%;
  margin-top: 17px;
  border: 1px solid #ffffff44;
  border-radius: 5px;
  background: #ffffff11;
  height: calc(100% - 100px);
  overflow-y: auto;
`;

const Subtitle = styled.div`
  padding: 10px 0px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;