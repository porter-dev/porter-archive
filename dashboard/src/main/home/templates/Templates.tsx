import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import api from '../../../shared/api';

import TabSelector from '../../../components/TabSelector';
import { AnyNaptrRecord } from 'dns';

const tabOptions = [
  { label: 'Community Templates', value: 'community' }
];

type PropsType = {
};

type StateType = {
  currentTab: string,
  porterCharts: any[]
};

export default class Templates extends Component<PropsType, StateType> {
  state = {
    currentTab: 'community',
    porterCharts: [] as any[]
  }

  componentDidMount() {
    // Get templates
    api.getTemplates('<token>', {}, {}, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else {
        this.setState({ porterCharts: res.data });
      }
    });
  }

  renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />
    }

    return (
        <Polymer><i className="material-icons">layers</i></Polymer>
    )
  }

  renderStackList = () => {
    return this.state.porterCharts.map((template, i) => {
      console.log(template)
      return (
        <TemplateBlock key={i}>
          {this.renderIcon(template.Icon)}
          <TemplateTitle>
            {template.Form.Name ? template.Form.Name : template.Name}
          </TemplateTitle>
          <TemplateDescription>
            {template.Form.Description ? template.Form.Description : template.Description}
          </TemplateDescription>
        </TemplateBlock>
      )
    })
  }
  
  render() {
    return ( 
      <StyledTemplates>
        <TemplatesWrapper>
        <TitleSection>
          <Title>Template Manager</Title>
        </TitleSection>
        <TabSelector
          options={tabOptions}
          currentTab={this.state.currentTab}
          setCurrentTab={(value: string) => this.setState({ currentTab: value })}
        />
        <TemplateList>
          {this.renderStackList()}
        </TemplateList>
        </TemplatesWrapper>
      </StyledTemplates>
    );
  }
}

Templates.contextType = Context;


const Icon = styled.img`
  height: 50px;
  margin-top: 28px;
  margin-bottom: 15px;
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

const CenterWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding-bottom: 15px;
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
    background: #ffffff08;
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
