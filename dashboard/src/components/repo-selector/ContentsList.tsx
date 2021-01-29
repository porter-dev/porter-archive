import { stringify } from 'querystring';
import React, { Component } from 'react';
import styled from 'styled-components';
import file from '../../assets/file.svg';
import folder from '../../assets/folder.svg';
import info from '../../assets/info.svg';

import api from '../../shared/api';
import { Context } from '../../shared/Context';
import { FileType } from '../../shared/types';

import Loading from '../Loading';

type PropsType = {
  grid: number,
  repoName: string,
  owner: string,
  selectedBranch: string,
  subdirectory: string,
  setSubdirectory: (x: string) => void,
  setDockerfile: () => void,
};

type StateType = {
  loading: boolean,
  error: boolean,
  contents: FileType[]
};

export default class ContentsList extends Component<PropsType, StateType> {
  state = {
    loading: true,
    error: false,
    contents: [] as FileType[]
  }

  updateContents = () => {
    let { currentProject } = this.context;

    // Get branch contents
    api.getBranchContents('<token>', { dir: this.props.subdirectory }, {
      project_id: currentProject.id,
      git_repo_id: this.props.grid,
      kind: 'github',
      owner: this.props.owner,
      name: this.props.repoName,
      branch: this.props.selectedBranch
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
        this.setState({ loading: false, error: true });
      } else {
        let files = [] as FileType[];
        let folders = [] as FileType[];
        res.data.map((x: FileType, i: number) => {
          x.Type === 'dir' ? folders.push(x) : files.push(x);
        });

        folders.sort((a: FileType, b: FileType) => { return a.Path < b.Path ? 1 : 0 });
        files.sort((a: FileType, b: FileType) => { return a.Path < b.Path ? 1 : 0 });
        let contents = folders.concat(files);
        
        this.setState({ contents, loading: false, error: false });
      }
    });
  }

  componentDidMount() {
    this.updateContents();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (this.props.subdirectory !== prevProps.subdirectory) {
      this.updateContents();  
    }
  }

  renderContentList = () => {
    let { contents, loading, error } = this.state;
    if (loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    } else if (error || !contents) {
      return <LoadingWrapper>Error loading repo contents.</LoadingWrapper>
    }

    return contents.map((item: FileType, i: number) => {
      let splits = item.Path.split('/');
      let fileName = splits[splits.length - 1];
      if (item.Type === 'dir') {
        return (
          <Item
            key={i}
            isSelected={item.Path === this.props.subdirectory}
            lastItem={i === contents.length - 1}
            onClick={() => this.props.setSubdirectory(item.Path)}
          >
            <img src={folder} />
            {fileName}
          </Item>
        );
      }

      if (fileName === 'Dockerfile') {
        return (
          <FileItem
            key={i}
            lastItem={i === contents.length - 1}
            isADocker
            onClick={() => this.props.setDockerfile()}
          >
            <img src={file} />
            {fileName}
          </FileItem>
        );
      }
      return (
        <FileItem
          key={i}
          lastItem={i === contents.length - 1}
        >
          <img src={file} />
          {fileName}
        </FileItem>
      );
    });
  }

  renderJumpToParent = () => {
    let { subdirectory, setSubdirectory } = this.props;
    if (subdirectory !== '') {
      let splits = subdirectory.split('/');
      let subdir = '';
      if (splits.length !== 1) {
        subdir = subdirectory.replace(splits[splits.length - 1], '');
        if (subdir.charAt(subdir.length - 1) === '/') {
          subdir = subdir.slice(0, subdir.length - 1);
        }
      }

      return (
        <Item
          lastItem={false}
          onClick={() => setSubdirectory(subdir)}
        >
          <BackLabel>..</BackLabel>
        </Item>
      );
    }

    return (
      <FileItem
        lastItem={false}
      >
        <img src={info} />
        Select subfolder (optional)
      </FileItem>
    );
  }

  render() {
    return (
      <div>
        {this.renderJumpToParent()}
        {this.renderContentList()}
      </div>
    );
  }
}

ContentsList.contextType = Context;

const BackLabel = styled.div`
  font-size: 16px;
  padding-left: 16px;
  margin-top: -4px;
  padding-bottom: 4px;
`;

const Item = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid ${(props: { lastItem: boolean, isSelected?: boolean }) => props.lastItem ? '#00000000' : '#606166'};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected?: boolean, lastItem: boolean }) => props.isSelected ? '#ffffff22' : '#ffffff11'};
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const FileItem = styled(Item)`
  cursor: ${(props: {isADocker?: boolean}) => props.isADocker ? 'pointer' : 'default'};
  color: ${(props: {isADocker?: boolean}) => props.isADocker ? '#fff' : '#ffffff55'};
  :hover {
    background: ${(props: {isADocker?: boolean}) => props.isADocker ? '#ffffff22' : '#ffffff11'};
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  background: #ffffff11;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
`;