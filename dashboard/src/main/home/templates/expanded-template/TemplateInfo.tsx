import React, { Component } from 'react';
import styled from 'styled-components';
import launch from '../../../../assets/launch.svg';
import Markdown from 'markdown-to-jsx';

import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';
import Loading from '../../../../components/Loading';

import { PorterTemplate } from '../../../../shared/types';

type PropsType = {
  currentTemplate: any,
  setCurrentTemplate: (x: PorterTemplate) => void,
  launchTemplate: () => void,
  markdown: string | null,
  keywords: string[],
};

type StateType = {
};

export default class TemplateInfo extends Component<PropsType, StateType> {
  renderIcon = (icon: string) => {
    if (icon) {
      return <Icon src={icon} />
    }

    return (
      <Polymer><i className="material-icons">layers</i></Polymer>
    );
  }

  renderTagList = () => {
    if (this.props.keywords) {
      return this.props.keywords.map((tag: string, i: number) => {
        return (
          <Tag key={i}>{tag}</Tag>
        )
      });
    }
  }

  renderMarkdown = () => {
    let { currentTemplate, markdown } = this.props;
    if (markdown) {
      return (
        <Markdown>{markdown}</Markdown>
      );
    }
    return currentTemplate.description;
  }

  renderTagSection = () => {
    if (this.props.keywords && this.props.keywords.length > 0) {
      return (
        <TagSection>
          <i className="material-icons">local_offer</i>
          {this.renderTagList()}
        </TagSection>
      );
    }
  }

  render() {
    let { currentCluster } = this.context;
    let { name, icon } = this.props.currentTemplate;
    let { currentTemplate } = this.props;
    name = name ? name : currentTemplate.name;
    return (
      <StyledExpandedTemplate>
        <TitleSection>
          <Flex>
            <i className="material-icons" onClick={() => this.props.setCurrentTemplate(null)}>
              keyboard_backspace
            </i>
            {icon ? this.renderIcon(icon) : this.renderIcon(currentTemplate.icon)}
            <Title>{name}</Title>
          </Flex>
          <Button
            isDisabled={!currentCluster}
            onClick={!currentCluster ? null : this.props.launchTemplate}
          >
            <img src={launch} />
            Launch Template
          </Button>
        </TitleSection>
        {this.renderTagSection()}
        <ContentSection>
          {this.renderMarkdown()}
        </ContentSection>
      </StyledExpandedTemplate>
    );
  }
}

TemplateInfo.contextType = Context;

const ContentSection = styled.div`
  margin-top: 50px;
  font-size: 14px;
  line-height: 1.8em;
  padding-bottom: 100px;
  overflow: hidden;
`;

const Tag = styled.div`
  border: 1px solid #ffffff44;
  border-radius: 3px;
  display: flex;
  margin-right: 7px;
  align-items: center;
  padding: 5px 10px;
`;

const TagSection = styled.div`
  margin-top: 20px;
  display: flex;
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
  align-items: center;

  > i {
    font-size: 18px;
    margin-right: 10px;
    color: #aaaabb;
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;

  > i {
    cursor: pointer;
    font-size 24px;
    color: #969Fbbaa;
    padding: 3px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const Button = styled.div`
  height: 100%;
  background: ${(props: { isDisabled: boolean }) => (!props.isDisabled ? '#616feecc' : '#aaaabb')};
  :hover {
    background: ${(props: { isDisabled: boolean }) => (!props.isDisabled ? '#505edddd' : '#aaaabb')};
  }
  color: white;
  font-weight: 500;
  font-size: 13px;
  padding: 10px 15px;
  border-radius: 3px;
  cursor: ${(props: { isDisabled: boolean }) => (!props.isDisabled ? 'pointer' : 'default')};
  box-shadow: 0 5px 8px 0px #00000010;
  display: flex;
  flex-direction: row;
  align-items: center;

  > img {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    margin-right: 10px;
    justify-content: center;
  }
`;

const Icon = styled.img`
  width: 27px;
  margin-left: 14px;
  margin-right: 4px;
  margin-bottom: -1px;
`;


const Polymer = styled.div`
  margin-bottom: -3px;

  > i {
    color: ${props => props.theme.containerIcon};
    font-size: 24px;
    margin-left: 12px;
    margin-right: 3px;
  }
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: 'Work Sans', sans-serif;
  margin-left: 10px;
  border-radius: 2px;
  color: #ffffff;
`;

const TitleSection = styled.div`
  display: flex;
  margin-left: -42px;
  flex-direction: row;
  height: 40px;
  justify-content: space-between;
  width: calc(100% + 42px);
  align-items: center;
`;

const StyledExpandedTemplate = styled.div`
  width: 100%;
`;