import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";

import Selector from "components/Selector";

type PropsType = {
  setNamespace: (x: string) => void;
  namespace: string;
};

type StateType = {
  namespaceOptions: { label: string; value: string }[];
};

// TODO: fix update to unmounted component
export default class NamespaceSelector extends Component<PropsType, StateType> {
  _isMounted = false;

  state = {
    namespaceOptions: [] as { label: string; value: string }[],
  };

  updateOptions = () => {
    let { currentCluster, currentProject } = this.context;

    api
      .getNamespaces(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        if (this._isMounted) {
          let namespaceOptions: { label: string; value: string }[] = [
            { label: "All", value: "ALL" },
          ];

          // Set namespace from URL if specified
          let queryString = window.location.search;
          let urlParams = new URLSearchParams(queryString);
          let urlNamespace = urlParams.get("namespace");
          if (urlNamespace === "ALL") {
            urlNamespace = "ALL";
          }

          let defaultNamespace = "default";
          const availableNamespaces = res.data.filter(
            (namespace: any) => {
              return namespace.status !== "Terminating";
            }
          );
          availableNamespaces.forEach(
            (x: { name: string }, i: number) => {
              namespaceOptions.push({
                label: x.name,
                value: x.name,
              });
              if (x.name === urlNamespace) {
                defaultNamespace = urlNamespace;
              }
            }
          );
          this.setState({ namespaceOptions }, () => {
            if (
              urlNamespace === "" ||
              defaultNamespace === "" ||
              urlNamespace === "ALL"
            ) {
              this.props.setNamespace("ALL");
            } else if (this.props.namespace !== defaultNamespace) {
              this.props.setNamespace(defaultNamespace);
            }
          });
        }
      })
      .catch((err) => {
        if (this._isMounted) {
          this.setState({ namespaceOptions: [{ label: "All", value: "ALL" }] });
        }
      });
  };

  componentDidMount() {
    this._isMounted = true;
    this.updateOptions();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.namespace !== this.props.namespace) {
      this.updateOptions();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleSetActive = (namespace: any) => {
    // console.log("SELECTED", namespace);
    this.props.setNamespace(namespace);
  };

  render() {
    return (
      <StyledNamespaceSelector>
        <Label>
          <i className="material-icons">filter_alt</i> Namespace
        </Label>
        <Selector
          activeValue={this.props.namespace}
          setActiveValue={this.handleSetActive}
          options={this.state.namespaceOptions}
          dropdownLabel="Namespace"
          width="150px"
          dropdownWidth="230px"
          closeOverlay={true}
        />
      </StyledNamespaceSelector>
    );
  }
}

NamespaceSelector.contextType = Context;

const Label = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;

  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;

const StyledNamespaceSelector = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
`;
