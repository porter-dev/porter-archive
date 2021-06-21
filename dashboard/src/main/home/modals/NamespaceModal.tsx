import React, { Component } from "react";
import styled from "styled-components";
import close from "assets/close.png";

import api from "shared/api";
import { Context } from "shared/Context";

import SaveButton from "components/SaveButton";
import InputRow from "components/values-form/InputRow";

type PropsType = {};

type StateType = {
  namespaceName: string;
  status: string | null;
};

export default class NamespaceModal extends Component<PropsType, StateType> {
  state = {
    namespaceName: "",
    status: null as string | null,
  };

  isValidName = (namespaceName: string) =>
    !/(^default$)|(^kube-.*)/.test(namespaceName);

  hasInvalidCharacters = (namespaceName: string) =>
    !/([a-z0-9]|\-)+/.test(namespaceName);

  createNamespace = () => {
    if (!this.isValidName(this.state.namespaceName)) {
      this.setState({
        status: "The name cannot be default or start with kube-",
      });
      return;
    }

    if (this.hasInvalidCharacters(this.state.namespaceName)) {
      this.setState({
        status: "Only lowercase, numbers or dash (-) are allowed",
      });
      return;
    }

    const namespaceExists = this.context.currentModalData?.find(
      (namespace: any) => {
        return namespace?.value === this.state.namespaceName;
      }
    );

    if (namespaceExists) {
      this.setState({
        status: "Namespace already exist, choose another name",
      });
      return;
    }

    api
      .createNamespace(
        "<token>",
        {
          name: this.state.namespaceName,
        },
        {
          id: this.context.currentProject.id,
          cluster_id: this.context.currentCluster.id,
        }
      )
      .then((res) => {
        this.setState({ status: "successful" }, () => {
          setTimeout(() => {
            this.context.setCurrentModal(null, null);
          }, 1000);
        });
      })
      .catch((err) => {
        this.setState({ status: "Could not create" });
      });
  };

  render() {
    return (
      <StyledUpdateProjectModal>
        <CloseButton
          onClick={() => {
            this.context.setCurrentModal(null, null);
          }}
        >
          <CloseButtonImg src={close} />
        </CloseButton>

        <ModalTitle>Add Namespace</ModalTitle>
        <Subtitle>Name</Subtitle>

        <InputWrapper>
          <DashboardIcon>
            <i className="material-icons">space_dashboard</i>
          </DashboardIcon>
          <InputRow
            type="string"
            value={this.state.namespaceName}
            setValue={(x: string) =>
              this.setState({ namespaceName: x, status: null })
            }
            placeholder="ex: porter-workers"
            width="480px"
          />
        </InputWrapper>

        <SaveButton
          text="Create Namespace"
          color="#616FEEcc"
          onClick={() => this.createNamespace()}
          status={this.state.status}
        />
      </StyledUpdateProjectModal>
    );
  }
}

NamespaceModal.contextType = Context;

const DashboardIcon = styled.div`
  width: 32px;
  margin-top: 6px;
  min-width: 25px;
  height: 32px;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  margin-right: 15px;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;
  color: white;

  > i {
    font-size: 17px;
  }
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Subtitle = styled.div`
  margin-top: 23px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: -10px;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: "Assistant";
  font-size: 18px;
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

const StyledUpdateProjectModal = styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 30px;
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
`;
