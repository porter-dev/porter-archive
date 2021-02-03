import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';
import { integrationList } from '../../../shared/common';
import api from '../../../shared/api';
import { ImageType, ActionConfigType } from '../../..//shared/types';
import ImageList from '../../../components/image-selector/ImageList';
import RepoList from '../../../components/repo-selector/RepoList';

type PropsType = {
  setCurrent: (x: any) => void,
  currentCategory: string,
  integrations: string[],
  itemIdentifier?: any[],
  titles?: string[],
  isCategory?: boolean
};

type StateType = {
  displayImages: boolean[],
};

export default class IntegrationList extends Component<PropsType, StateType> {
  state = {
    displayImages: [] as boolean[],
  }

  componentDidMount() {
    let x: boolean[] = [];
    for (let i = 0; i < this.props.integrations.length; i++) {
      x.push(true);
    }
    this.setState({ displayImages: x });
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.integrations !== this.props.integrations) {
      let x: boolean[] = [];
      for (let i = 0; i < this.props.integrations.length; i++) {
        x.push(true);
      }
      this.setState({ displayImages: x });
    }
  }

  toggleDisplay = (index: number) => {
    let x = this.state.displayImages;
    x[index] = !x[index];
    this.setState({ displayImages: x });
  }

  renderContents = () => {
    let { integrations, titles, setCurrent, isCategory, currentCategory } = this.props;
    if (titles && titles.length > 0) {
      return integrations.map((integration: string, i: number) => {
        let icon = integrationList[integration] && integrationList[integration].icon;
        let subtitle = integrationList[integration] && integrationList[integration].label;
        let label = titles[i];
        return (
          <Integration
            key={i}
            isCategory={isCategory}
            disabled={false}
          >
            <MainRow
              onClick={() => setCurrent(integration)}
              isCategory={isCategory}
              disabled={false}
            >
              <Flex>
                <Icon src={icon && icon} />
                <Description>
                  <Label>{label}</Label>
                  <Subtitle>{subtitle}</Subtitle>
                </Description>
              </Flex>
              <i className="material-icons">
                {isCategory ? 'launch' : 'more_vert'}
              </i>
            </MainRow>
            {this.state.displayImages[i] &&
              <ImageHodler
                adjustMargin={currentCategory !== 'repo'}
              >
                {currentCategory !== 'repo'
                  ?
                  <ImageList
                    selectedImageUrl={null}
                    selectedTag={null}
                    clickedImage={null}
                    registry={this.props.itemIdentifier[i]}
                    setSelectedImageUrl={(x: string) => {}}
                    setSelectedTag={(x: string) => {}}
                    setClickedImage={(x: ImageType) => {}}
                  />
                  :
                  <RepoList
                    actionConfig={{
                      git_repo: '',
                      image_repo_uri: '',
                      git_repo_id: 0,
                      dockerfile_path: '',
                    } as ActionConfigType}
                    setActionConfig={(x: ActionConfigType) => {}}
                    readOnly={true}
                    userId={this.props.itemIdentifier[i]}
                  />
                }
              </ImageHodler>
            }
          </Integration>
        );
      });
    } else if (integrations && integrations.length > 0) {
      return integrations.map((integration: string, i: number) => {
        let icon = integrationList[integration] && integrationList[integration].icon;
        let label = integrationList[integration] && integrationList[integration].label;
        let disabled = integration === 'kubernetes';
        return (
          <Integration
            key={i}
            onClick={() => disabled ? null : setCurrent(integration)}
            isCategory={isCategory}
            disabled={disabled}
          >
            <MainRow
              isCategory={isCategory}
              disabled={disabled}
            >
              <Flex>
                <Icon src={icon && icon} />
                <Label>{label}</Label>
              </Flex>
              <i className="material-icons">{isCategory ? 'launch' : 'more_vert'}</i>
            </MainRow>
          </Integration>
        );
      });
    }
    return (
      <Placeholder>
        No integrations set up yet.
      </Placeholder>
    );
  }
  
  render() {
    return ( 
      <StyledIntegrationList>
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

const ImageHodler = styled.div`
  width: 100%;
  padding: 12px;
  margin-top: ${(props: {adjustMargin: boolean}) => props.adjustMargin ? '-10px' : '0px'};
`;

const MainRow = styled.div`
  height: 70px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 25px;
  border-radius: 5px;
  :hover {
    background: ${(props: { isCategory: boolean, disabled: boolean }) => props.disabled ? '' : '#ffffff11'};
    > i {
      background: ${(props: { isCategory: boolean, disabled: boolean }) => props.disabled ? '' : '#ffffff11'};
    }
    > div {
      > i {
        background: ${(props: { isCategory: boolean, disabled: boolean }) => props.disabled ? '' : '#ffffff11'};
      }
    }
  }

  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: ${(props: { isCategory: boolean, disabled: boolean }) => props.isCategory ? '#616feecc' : '#ffffff44'};
    margin-right: -7px;
  }
`;

const Integration = styled.div`
  margin-left: -2px;
  display: flex;
  flex-direction: column;
  background: #26282f;
  cursor: ${(props: { isCategory: boolean, disabled: boolean }) => props.disabled ? 'not-allowed' : 'pointer'};
  margin-bottom: 15px;
  border-radius: 5px;
  box-shadow: 0 5px 8px 0px #00000033;
`;

const Description = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
`;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const Subtitle = styled.div`
  color: #aaaabb;
  font-size: 13px;
  display: flex;
  align-items: center;
  padding-top: 5px;
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 18px;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
  justify-content: center;
  margin-top: 30px;
  background: #ffffff11;
  color: #ffffff44;
  border-radius: 5px;
`;

const StyledIntegrationList = styled.div`
  margin-top: 20px;
`;