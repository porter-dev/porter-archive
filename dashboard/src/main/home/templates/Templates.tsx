import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import api from '../../../shared/api';
import { PorterTemplate } from '../../../shared/types';

import TabSelector from '../../../components/TabSelector';
import ExpandedTemplate from './expanded-template/ExpandedTemplate';
import Loading from '../../../components/Loading';

const tabOptions = [
  { label: 'Community Templates', value: 'community' }
];

// TODO: read in from metadata
const hardcodedNames: any = {
  'postgresql': 'PostgreSQL',
  'docker': 'Docker',
  'https-issuer': 'HTTPS Issuer'
};

type PropsType = {
  setCurrentView: (x: string) => void, // Link to add integration from source selector
};

type StateType = {
  currentTemplate: PorterTemplate | null,
  currentTab: string,
  porterTemplates: PorterTemplate[],
  loading: boolean,
  error: boolean
};

export default class Templates extends Component<PropsType, StateType> {
  state = {
    currentTemplate: null as (PorterTemplate | null),
    currentTab: 'community',
    porterTemplates: [] as PorterTemplate[],
    loading: true,
    error: false,
  }

  componentDidMount() {
    api.getTemplates('<token>', {}, {}, (err: any, res: any) => {
      if (err) {
        this.setState({ loading: false, error: true });
      } else {
        this.setState({ porterTemplates: res.data, loading: false, error: false });
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
    let { loading, error, porterTemplates } = this.state;

    if (loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    } else if (error) {
      return (
        <Placeholder>
          <i className="material-icons">error</i> Error retrieving templates.
        </Placeholder>
      );
    } else if (porterTemplates.length === 0) {
      return (
        <Placeholder>
          <i className="material-icons">category</i> No templates found.
        </Placeholder>
      );
    }

    return this.state.porterTemplates.map((template: PorterTemplate, i: number) => {
      let { name, icon, description } = template;
      if (hardcodedNames[name]) {
        name = hardcodedNames[name];
      }
      return (
        <TemplateBlock key={i} onClick={() => this.setState({ currentTemplate: template })}>
          {this.renderIcon(icon)}
          <TemplateTitle>{name}</TemplateTitle>
          <TemplateDescription>{description}</TemplateDescription>
        </TemplateBlock>
      )
    });
  }

  renderContents = () => {
    if (this.state.currentTemplate) {
      return (
        <ExpandedTemplate
          currentTemplate={this.state.currentTemplate}
          setCurrentTemplate={(currentTemplate: PorterTemplate) => this.setState({ currentTemplate })}
          setCurrentView={this.props.setCurrentView}
        />
      );
    }

    return (
      <TemplatesWrapper>
        <TitleSection>
          <Title>Template Explorer</Title>
          <a href='https://docs.getporter.dev/docs/porter-templates' target='_blank'>
            <i className="material-icons">help_outline</i>
          </a>
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
    return this.renderContents();
  }
}

Templates.contextType = Context;

const Placeholder = styled.div`
  padding-top: 200px;
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
  color: #ffffff66;
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
  border: 1px solid #ffffff00;
  align-items: center;
  user-select: none;
  border-radius: 5px;
  display: flex;
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
  background: #26282f;
  box-shadow: 0 5px 8px 0px #00000033;
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
  grid-column-gap: 25px;
  grid-row-gap: 25px;
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

  > a {
    > i {
      display: flex;
      align-items: center;
      margin-bottom: -2px;
      font-size: 18px;
      margin-left: 18px;
      color: #858FAAaa;
      cursor: pointer;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;

const TemplatesWrapper = styled.div`
  width: calc(90% - 150px);
  min-width: 300px;
  padding-top: 50px;
`;
