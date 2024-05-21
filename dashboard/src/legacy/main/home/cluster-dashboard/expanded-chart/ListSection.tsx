import React, { Component } from "react";
import styled from "styled-components";
import yaml from "js-yaml";

import { Context } from "shared/Context";
import { ChartType, ResourceType } from "shared/types";

import Loading from "components/Loading";
import ResourceTab from "components/ResourceTab";
import YamlEditor from "components/YamlEditor";

type PropsType = {
  currentChart: ChartType;
  components: ResourceType[];
  showRevisions: boolean;
};

type StateType = {
  showKindLabels: boolean;
  yaml: string | null;
  wrapperHeight: number;
  selectedResource: { kind: string; name: string } | null;
};

export default class ListSection extends Component<PropsType, StateType> {
  state = {
    showKindLabels: true,
    yaml: "# Select a resource to view its manifest" as string | null,
    wrapperHeight: 0,
    selectedResource: null as { kind: string; name: string } | null,
  };

  wrapperRef: any = React.createRef();

  componentDidMount() {
    this.setState({ wrapperHeight: this.wrapperRef.offsetHeight });
  }

  componentDidUpdate(prevProps: PropsType) {
    // Adjust yaml wrapper height on revision toggle
    if (
      prevProps.showRevisions !== this.props.showRevisions &&
      this.wrapperRef
    ) {
      this.setState({ wrapperHeight: this.wrapperRef.offsetHeight });
    }

    if (
      prevProps.components !== this.props.components &&
      this.state.selectedResource
    ) {
      let matchingResourceFound = false;
      this.props.components.forEach((resource: ResourceType) => {
        if (
          resource.Kind === this.state.selectedResource.kind &&
          resource.Name === this.state.selectedResource.name
        ) {
          let rawYaml = yaml.dump(resource.RawYAML);
          this.setState({ yaml: rawYaml });
          matchingResourceFound = true;
        }
      });
      if (!matchingResourceFound) {
        this.setState({ yaml: "# Select a resource to view its manifest" });
      }
    }
  }

  renderResourceList = () => {
    return this.props.components.map((resource: ResourceType, i: number) => {
      let rawYaml = yaml.dump(resource.RawYAML);
      return (
        <ResourceTab
          key={i}
          handleClick={() =>
            this.setState({
              yaml: rawYaml,
              selectedResource: { kind: resource.Kind, name: resource.Name },
            })
          }
          selected={this.state.yaml === rawYaml}
          label={resource.Kind}
          name={resource.Name}
          isLast={i === this.props.components.length - 1}
        />
      );
    });
  };

  renderTabs = () => {
    if (this.props.components && this.props.components.length > 0) {
      return <TabWrapper>{this.renderResourceList()}</TabWrapper>;
    }

    return <Loading offset="-30px" />;
  };

  render() {
    return (
      <StyledListSection>
        {this.renderTabs()}
        <FlexWrapper ref={(element) => (this.wrapperRef = element)}>
          <YamlWrapper>
            <YamlEditor
              value={this.state.yaml}
              onChange={(e: any) => this.setState({ yaml: e })}
              height={this.state.wrapperHeight - 2 + "px"}
              border={true}
              readOnly={true}
            />
          </YamlWrapper>
        </FlexWrapper>
      </StyledListSection>
    );
  }
}

ListSection.contextType = Context;

const YamlWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const TabWrapper = styled.div`
  min-width: 200px;
  width: 35%;
  margin-right: 10px;
  overflow: hidden;
  overflow-y: auto;
`;

const FlexWrapper = styled.div`
  display: flex;
  flex: 1;
  height: 100%;
  overflow: visible;
`;

const StyledListSection = styled.div`
  display: flex;
  font-size: 13px;
  width: 100%;
  min-height: 400px;
  height: calc(100vh - 400px);
  font-size: 13px;
  overflow: hidden;
  border-radius: 8px;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
