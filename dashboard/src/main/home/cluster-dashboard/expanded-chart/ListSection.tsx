import React, { Component } from 'react';
import styled from 'styled-components';
import yaml from 'js-yaml';

import { Context } from '../../../../shared/Context';
import { ResourceType, ChartType } from '../../../../shared/types';

import Loading from '../../../../components/Loading';
import ResourceTab from '../../../../components/ResourceTab';
import YamlEditor from '../../../../components/YamlEditor';

type PropsType = {
  currentChart: ChartType,
  components: ResourceType[],
  showRevisions: boolean,
};

type StateType = {
  showKindLabels: boolean,
  yaml: string | null,
  wrapperHeight: number,
};

export default class ListSection extends Component<PropsType, StateType> {
  state = {
    showKindLabels: true,
    yaml: '# Select a resource to view its manifest' as string | null,
    wrapperHeight: 0,
  }

  wrapperRef: any = React.createRef();

  componentDidMount() {
    this.setState({ wrapperHeight: this.wrapperRef.offsetHeight });
  }

  componentDidUpdate(prevProps: PropsType) {
    if ((prevProps.showRevisions !== this.props.showRevisions) && this.wrapperRef) {
      this.setState({ wrapperHeight: this.wrapperRef.offsetHeight });
    }
  }

  renderResourceList = () => {
    return this.props.components.map((resource: ResourceType, i: number) => {
      let rawYaml = yaml.dump(resource.RawYAML);
      return (
        <ResourceTab
          key={i}
          handleClick={() => this.setState({ yaml: rawYaml })}
          selected={this.state.yaml === rawYaml}
          kind={resource.Kind}
          name={resource.Name}
          isLast={i === this.props.components.length - 1}
        />
      );
    });
  }

  renderTabs = () => {
    if (this.props.components && this.props.components.length > 0) {
      return (
        <TabWrapper>
          {this.renderResourceList()}
        </TabWrapper>
      );
    }

    return <Loading offset='-30px' />;
  }

  render() {
    return (
      <StyledListSection>
        {this.renderTabs()}
        <FlexWrapper ref={element => this.wrapperRef = element}>
          <YamlWrapper>
            <YamlEditor
              value={this.state.yaml}
              onChange={(e: any) => this.setState({ yaml: e })}
              height={this.state.wrapperHeight - 2 + 'px'}
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
`;

const TabWrapper = styled.div`
  min-width: 200px;
  width: 35%;
  margin-right: 10px;
  border-radius: 5px;
  overflow: hidden;
`;

const FlexWrapper = styled.div`
  display: flex;
  flex: 1;
  height: 100%;
`;

const StyledListSection = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  overflow: hidden;
`;