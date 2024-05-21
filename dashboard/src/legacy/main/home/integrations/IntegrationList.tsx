import React, { Component, MouseEvent } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { integrationList } from "shared/common";
import IntegrationRow from "./IntegrationRow";
import ConfirmOverlay from "components/ConfirmOverlay";
import api from "shared/api";

type PropsType = {
  setCurrent?: (x: string) => void;
  currentCategory: string;
  integrations: string[];
  itemIdentifier?: any[];
  titles?: string[];
  isCategory?: boolean;
  updateIntegrationList: () => void;
};

type StateType = {
  displayExpanded: boolean[];
  isDelete: boolean;
  deleteName: string;
  deleteID: number;
};

export default class IntegrationList extends Component<PropsType, StateType> {
  state = {
    displayExpanded: this.props.integrations.map(() => false),
    isDelete: false,
    deleteName: "",
    deleteID: 0,
  };

  allCollapsed = () =>
    this.state.displayExpanded.reduce((prev, cur) => prev && !cur, true);

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.integrations !== this.props.integrations) {
      this.collapseAll();
    }
  }

  collapseAll = () => {
    this.setState({
      displayExpanded: this.props.integrations.map(() => false),
    });
  };

  expandAll = () => {
    this.setState({ displayExpanded: this.props.integrations.map(() => true) });
  };

  toggleDisplay = (event: MouseEvent, index: number) => {
    if (event) {
      event.stopPropagation();
    }
    let x = this.state.displayExpanded;
    x[index] = !x[index];
    this.setState({ displayExpanded: x });
  };

  triggerDelete = (event: MouseEvent, i: number, id: number) => {
    if (event) {
      event.stopPropagation();
    }

    this.setState({
      isDelete: true,
      deleteName: this.props.titles[i],
      deleteID: id,
    });
  };

  handleDeleteIntegration = () => {
    let { currentProject } = this.context;

    if (this.props.currentCategory === "registry") {
      api
        .deleteRegistryIntegration(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            registry_id: this.state.deleteID,
          }
        )
        .then(() => {
          this.setState({ isDelete: false });
          this.props.updateIntegrationList();
        })
        .catch((err) => {
          this.context.setCurrentError(err);
        });
    }
  };

  handleParent = (event: any, integration: string) =>
    this.props.setCurrent && this.props.setCurrent(integration);

  renderContents = () => {
    let { integrations, titles, setCurrent, isCategory } = this.props;

    if (titles && titles.length > 0) {
      return integrations.map((integration: string, i: number) => {
        let label = titles[i];
        let item_id =
          this.props.itemIdentifier[i].id || this.props.itemIdentifier[i];

        return (
          <IntegrationRow
            category={this.props.currentCategory}
            integration={integration}
            expanded={this.state.displayExpanded[i]}
            key={i}
            itemId={this.props.itemIdentifier[i]}
            label={label}
            toggleCollapse={(e: MouseEvent) => this.toggleDisplay(e, i)}
            triggerDelete={(e: MouseEvent) => this.triggerDelete(e, i, item_id)}
          />
        );
      });
    } else if (integrations && integrations.length > 0) {
      return integrations.map((integration: string, i: number) => {
        let icon =
          integrationList[integration] && integrationList[integration].icon;
        let label =
          integrationList[integration] && integrationList[integration].label;
        let disabled = integration === "kubernetes";
        return (
          <Integration
            key={i}
            onClick={() =>
              disabled ? null : setCurrent && setCurrent(integration)
            }
            disabled={disabled}
          >
            <MainRow disabled={disabled}>
              <Flex>
                <Icon src={icon && icon} />
                <Label>{label}</Label>
              </Flex>
              <i className="material-icons">
                {isCategory ? "launch" : "more_vert"}
              </i>
            </MainRow>
          </Integration>
        );
      });
    }
    return <Placeholder>No Docker integrations set up yet.</Placeholder>;
  };

  collapseAllButton = () => (
    <Button
      onClick={() =>
        this.allCollapsed() ? this.expandAll() : this.collapseAll()
      }
    >
      {this.allCollapsed() ? (
        <>
          <i className="material-icons">expand_more</i> Expand all
        </>
      ) : (
        <>
          <i className="material-icons">expand_less</i> Collapse all
        </>
      )}
    </Button>
  );

  render() {
    return (
      <StyledIntegrationList>
        <ConfirmOverlay
          show={this.state.isDelete}
          message={`Are you sure you want to delete the ${
            this.props.currentCategory === "registry"
              ? "Docker registry integration"
              : "Github integration"
          } with name ${this.state.deleteName}?`}
          onYes={this.handleDeleteIntegration}
          onNo={() => this.setState({ isDelete: false })}
        />
        {this.renderContents()}
      </StyledIntegrationList>
    );
  }
}

IntegrationList.contextType = Context;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MainRow = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  border-radius: 5px;
  :hover {
    > i {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }

  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: #ffffff44;
    margin-right: -7px;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const Integration = styled.div`
  margin-left: -2px;
  display: flex;
  flex-direction: column;
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  margin-bottom: 20px;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 15px;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 250px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  justify-content: center;
  color: #aaaabb;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
`;

const StyledIntegrationList = styled.div`
  margin-bottom: 80px;
`;

const I = styled.i`
  transform: ${(props: { showList: boolean }) =>
    props.showList ? "rotate(180deg)" : ""};
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-left: 0px;
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;
