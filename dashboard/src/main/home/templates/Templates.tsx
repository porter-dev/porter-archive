import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import api from '../../../shared/api';
import { PorterChart } from '../../../shared/types';

import TabSelector from '../../../components/TabSelector';
import ExpandedTemplate from './expanded-template/ExpandedTemplate';
import Loading from '../../../components/Loading';

const tabOptions = [
  { label: 'Community Templates', value: 'community' }
];

type PropsType = {
};

type StateType = {
  currentChart: PorterChart | null,
  currentTab: string,
  porterCharts: PorterChart[],
  loading: boolean,
  error: boolean
};

export default class Templates extends Component<PropsType, StateType> {
  state = {
    currentChart: null as (PorterChart | null),
    currentTab: 'community',
    porterCharts: [] as PorterChart[],
    loading: false,
    error: false,
  }

  componentDidMount() {

    // Get templates
    this.setState({ loading: true });
    api.getTemplates('<token>', {}, {}, (err: any, res: any) => {
      if (err) {
        this.setState({ loading: false, error: true });
      } else {
        this.setState({ porterCharts: res.data, loading: false, error: false });
        console.log(res.data)
      }
    });
  }

  renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />;
    }

    return (
      <Polymer><i className="material-icons">layers</i></Polymer>
    );
  }

  renderTemplateList = () => {
    let { loading, error, porterCharts } = this.state;

    if (loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    } else if (error) {
      return (
        <Placeholder>
          <i className="material-icons">error</i> Error retrieving templates.
        </Placeholder>
      );
    } else if (porterCharts.length === 0) {
      return (
        <Placeholder>
          <i className="material-icons">category</i> No templates found.
        </Placeholder>
      );
    }

    return this.state.porterCharts.map((template: PorterChart, i: number) => {
      let { Name, Icon, Description } = template.Form;
      return (
        <TemplateBlock key={i} onClick={() => this.setState({ currentChart: template })}>
          {Icon ? this.renderIcon(Icon) : this.renderIcon(template.Icon)}
          <TemplateTitle>
            {Name ? Name : template.Name}
          </TemplateTitle>
          <TemplateDescription>
            {Description ? Description : template.Description}
          </TemplateDescription>
        </TemplateBlock>
      )
    });
  }

  renderContents = () => {
    if (this.state.currentChart) {
      return (
        <ExpandedTemplate
          currentChart={this.state.currentChart}
          setCurrentChart={(currentChart: PorterChart) => this.setState({ currentChart })}
        />
      );
    }

    return (
      <TemplatesWrapper>
        <TitleSection>
          <Title>Template Explorer</Title>
        </TitleSection>
        <TabSelector
          options={tabOptions}
          currentTab={this.state.currentTab}
          setCurrentTab={(value: string) => this.setState({ currentTab: value })}
        />
        <TemplateList>
          {this.renderTemplateList()}
        </TemplateList>
      </TemplatesWrapper>
    );
  }
  
  render() {
    return ( 
      <StyledTemplates>
        {this.renderContents()}
      </StyledTemplates>
    );
  }
}

Templates.contextType = Context;

const Placeholder = styled.div`
  padding-top: 100px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;

const LoadingWrapper = styled.div`
  padding-top: 300px;
`;

const Icon = styled.img`
  height: 42px;
  margin-top: 35px;
  margin-bottom: 13px;
`;

const Polymer = styled.div`
  > i {
    font-size: 34px;
    margin-top: 38px;
    margin-bottom: 20px;
  }
`;

const TemplateDescription = styled.div`
  margin-bottom: 26px;
  color: #ffffff55;
  text-align: center;
  font-weight: default;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;  
`;

const TemplateTitle = styled.div`
  margin-bottom: 12px;
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TemplateBlock = styled.div`
  background: none;
  border: 1px solid #ffffff44;
  align-items: center;
  user-select: none;
  border-radius: 5px;
  display: flex;
  color: #ffffff;
  ma: 'Work Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 200px;
  cursor: pointer;
  color: #ffffff;
  position: relative;
  :hover {
    background: #ffffff11;
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

const TemplateList = styled.div`
  overflow-y: auto;
  margin-top: 35px;
  padding-bottom: 150px;
  display: grid;
  grid-column-gap: 15px;
  grid-row-gap: 15px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: 'Work Sans', sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const StyledTemplates = styled.div`
  height: 100%;
  width: 100vw;
  padding-top: 45px;
  overflow-y: auto;
  display: flex;
  flex: 1;
  justify-content: center;
  position: relative;
`;

const TemplatesWrapper = styled.div`
  width: calc(90% - 30px);
  min-width: 300px;
  padding-top: 20px;
`;
