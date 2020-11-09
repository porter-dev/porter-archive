import React, { Component } from 'react';
import styled from 'styled-components';
import gradient from '../../../assets/gradient.jpg';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import { KubeContextConfig } from '../../../shared/types';

import Selector from '../../../components/Selector';
import Drawer from './Drawer';

type PropsType = {
  setWelcome?: (x: boolean) => void,
  setCurrentView?: (x: string) => void,
};

type StateType = {
  projects: any[],
  expanded: boolean
};

const options = [
  { label: 'Thunder', value: 'z' },
  { label: 'Lightning', value: 'x' },
  { label: 'Storm', value: 'qq' },
  { label: 'Backlog', value: 'd' },
]

export default class ProjectSection extends Component<PropsType, StateType> {
  state = {
    projects: [] as any[],
    expanded: false,
  };

  updateProjects = () => {
    this.context.setCurrentProject('z');
  }

  componentDidMount() {
    this.updateProjects();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps !== this.props) {
    }
  }
  
  showProjectCreateModal = () => {
    this.context.setCurrentModal('ClusterConfigModal', { updateClusters: null });
  }

  handleOptionClick = (option: { value: string, label: string }) => {
    this.context.setCurrentProject(option.value);
  }


  renderOptionList = () => {
    return options.map((option: { value: string, label: string }, i: number) => {
      return (
        <Option
          key={i}
          selected={option.value === this.context.currentProject}
          onClick={() => this.handleOptionClick(option)}
          lastItem={i === options.length - 1}
        >
          {option.label}
        </Option>
      );
    });
  }

  renderDropdown = () => {
    if (this.state.expanded) {
      return (
        <div>
          <CloseOverlay onClick={() => this.setState({ expanded: false })} />
          <Dropdown>
            {this.renderOptionList()}
          </Dropdown>
        </div>
      )
    }
  }

  getLabel = (value: string): any => {
    let tgt = options.find((element: { value: string, label: string }) => element.value === value);
    if (tgt) {
      return tgt.label;
    }
  }

  render() {
    if (this.context.currentProject) {
      let projectName = this.getLabel(this.context.currentProject);
      return (
        <StyledProjectSection>
          <MainSelector
            onClick={() => this.setState({ expanded: !this.state.expanded })}
            expanded={this.state.expanded}
          >
            <ProjectIcon>
              <ProjectImage src={gradient} />
              <Letter>{projectName && projectName[0].toUpperCase()}</Letter>
            </ProjectIcon>
            <ProjectName>{projectName}</ProjectName>
            <i className="material-icons">arrow_drop_down</i>
          </MainSelector>
          {this.renderDropdown()}
        </StyledProjectSection>
      );
    }
    return (
      <InitializeButton onClick={this.showProjectCreateModal}>
        <Plus>+</Plus> Create a Project
      </InitializeButton>
    );
  }
}

ProjectSection.contextType = Context;

const Plus = styled.div`
  margin-right: 10px;
  font-size: 15px;
`;

const InitializeButton = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - 30px);
  height: 38px;
  margin: 20px 15px 0;
  font-size: 13px;
  font-weight: 500;
  border-radius: 3px;
  color: #ffffff;
  padding-bottom: 1px;
  cursor: pointer;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }
`;

const Option = styled.div` 
  width: 100%;
  border-top: 1px solid #00000000;
  border-bottom: 1px solid ${(props: { selected: boolean, lastItem: boolean }) => props.lastItem ? '#ffffff00' : '#ffffff15'};
  height: 35px;
  font-size: 13px;
  padding-top: 9px;
  align-items: center;
  padding-left: 15px;
  cursor: pointer;
  padding-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${(props: { selected: boolean, lastItem: boolean }) => props.selected ? '#ffffff11' : ''};

  :hover {
    background: #ffffff22;
  }
`;

const CloseOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
`;

const Dropdown = styled.div`
  position: absolute;
  right: 10px;
  top: calc(100% + 5px);
  background: #26282f;
  width: 180px;
  max-height: 300px;
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px 0px #00000088;
`;

const ProjectName = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Letter = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  background: #00000028;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProjectImage = styled.img`
  width: 100%;
  height: 100%;
`;

const ProjectIcon = styled.div`
  width: 25px;
  min-width: 25px;
  height: 25px;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  margin-right: 10px;
  margin-left: 20px;
  font-weight: 400;
`;

const StyledProjectSection = styled.div`
  position: relative;
`;

const MainSelector = styled.div`
  display: flex;
  align-items: center;
  margin: 10px 0 0;
  font-size: 14px;
  font-family: 'Work Sans', sans-serif;
  font-weight: 600;
  cursor: pointer;
  padding: 10px 0;
  :hover {
    > i {
      background: #ffffff11;
    }
  }

  > i {
    margin-left: 7px;
    margin-right: 12px;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    background: ${(props: { expanded: boolean }) => props.expanded ? '#ffffff11' : ''};
  }
`;