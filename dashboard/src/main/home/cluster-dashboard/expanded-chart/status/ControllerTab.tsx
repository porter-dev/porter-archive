import React, { Component } from 'react';
import styled from 'styled-components';
import { kindToIcon } from '../../../../../shared/rosettaStone';
import api from '../../../../../shared/api';
import { Context } from '../../../../../shared/Context';

interface Pod {
  namespace?: string;
  name?: string;

}

type PropsType = {
  controller: any,
  selectedPod: Pod,
  selectPod: Function,
};

type StateType = {
  expanded: boolean,
  pods: Pod[],
};

// Controller tab in log section that displays list of pods on click.
export default class ControllerTab extends Component<PropsType, StateType> {
  state = {
    expanded: false,
    pods: [] as Pod[],
  }

  // Handle previewing old revisions
//   componentDidUpdate(prevProps: PropsType) {
//     if (prevProps.resource.RawYAML !== this.props.resource.RawYAML) {
    //   this.setState({ RawYAML: yaml.dump(this.props.resource.RawYAML) });
//     }
//   }

  renderIcon = (kind: string) => {

    let icon = 'tonality';
    if (Object.keys(kindToIcon).includes(kind)) {
      icon = kindToIcon[kind]; 
    }
    
    return (
      <IconWrapper>
        <i className="material-icons">{icon}</i>
      </IconWrapper>
    );
  }

  renderExpanded = () => {
    if (this.state.expanded) {
      return (
        <ExpandWrapper>
            {
              this.state.pods.map((pod) => {
                return (
                  <Tab 
                    key={pod.name}
                    selected={(this.props.selectedPod.name === pod.name)}
                    onClick={() => {this.props.selectPod(pod)}}
                  > 
                    {pod.name} 
                  </Tab>)
              })
            }
        </ExpandWrapper>
      );
    }
  }

  componentDidMount() {
    let { currentCluster, currentProject, setCurrentError } = this.context;
    let { controller } = this.props;

    let selectors = [] as string[]
    let ml = controller?.spec?.selector?.matchLabels || controller?.spec?.selector
    let i = 1;
    let selector = ''
    for (var key in ml) {
      selector += key + '=' + ml[key]
      if (i != Object.keys(ml).length) {
        selector += ','
      }
      i += 1;
    }
    selectors.push(selector)
    
    api.getMatchingPods('<token>', { 
      cluster_id: currentCluster.id,
      service_account_id: currentCluster.service_account_id,
      selectors,
    }, {
      id: currentProject.id
    }, (err: any, res: any) => {
      if (err) {
        console.log(err)
        setCurrentError(JSON.stringify(err))
        return
      }
      let pods = res?.data?.map((pod: any) => {
        return {
          namespace: pod?.metadata?.namespace, 
          name: pod?.metadata?.name
        }
      })
      console.log(res.data)
      this.setState({ pods })
    })
  }

  render() {
    let { controller } = this.props;
    console.log(controller)
    let status = 'running'
    return (
      <StyledResourceItem>
        <ResourceHeader
          expanded={this.state.expanded}
          onClick={() => this.setState({ expanded: !this.state.expanded })}
        >
          <DropdownIcon expanded={this.state.expanded}>
            <i className="material-icons">arrow_right</i>
          </DropdownIcon>
          <Info>
          <Metadata>
            {this.renderIcon(controller.kind)}
            {`${controller.kind}`}
            <ResourceName
              showKindLabels={true}
            >
              {controller.metadata.name}
            </ResourceName>
          </Metadata>
          <Status>
            <StatusColor status={status} />
            3/{controller.status.replicas}
          </Status>
          </Info>
        </ResourceHeader>
        {this.renderExpanded()}
      </StyledResourceItem>
    );
  }
}

ControllerTab.contextType = Context;

const StyledResourceItem = styled.div`
  width: 100%;
`;

const ExpandWrapper = styled.div`
  overflow: hidden;
`;

const ResourceHeader = styled.div`
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  color: #ffffff66;
  padding: 8px 13px;
  text-transform: capitalize;
  cursor: pointer;
  background: ${(props: { expanded: boolean }) => props.expanded ? '#ffffff11' : ''};
  :hover {
    background: #ffffff18;

    > i {
      background: #ffffff22;
    }
  }
`;

const Info = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 100%;
`;

const Metadata = styled.div`
  display: flex;
  align-items: center;
  width: 85%;
`;

const Status = styled.div`
  display: flex;
  font-size: 13px;
  flex-direction: row;
  text-transform: capitalize;
  align-items: center;
  font-family: 'Hind Siliguri', sans-serif;
  color: #aaaabb;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

const StatusColor = styled.div`
  margin-bottom: 1px;
  margin-right: 5px;
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) => (props.status === 'running' ? '#4797ff' : props.status === 'failed' ? "#ed5f85" : "#f5cb42")};
  border-radius: 20px;
`;

const Tab = styled.div`
  align-items: center;
  color: ${(props: {selected: boolean}) => props.selected ? 'white' : '#ffffff66'};
  background: ${(props: {selected: boolean}) => props.selected ? '#ffffff18' : '##ffffff11'};
  height: 100%;
  justify-content: center;
  font-size: 13px;
  padding: 25px 13px;
  text-shadow: 0px 0px 8px none;
  cursor: pointer;
  :hover {
    color: white;
    background: #ffffff18;
  }
`;

const ResourceName = styled.div`
  color: #ffffff;
  margin-left: ${(props: { showKindLabels: boolean }) => props.showKindLabels ? '10px' : ''};
  text-transform: none;
  max-width: 60%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  :hover {
    overflow: visible;
  }
`;

const IconWrapper = styled.div`
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 16px;
    color: #ffffff;
    margin-right: 14px;
  }
`;

const DropdownIcon = styled.div`
  > i {
    margin-right: 13px;
    font-size: 20px;
    color: #ffffff66;
    cursor: pointer;
    border-radius: 20px;
    background: ${(props: { expanded: boolean }) => props.expanded ? '#ffffff18' : ''};
    transform: ${(props: { expanded: boolean }) => props.expanded ? 'rotate(180deg)' : ''};
    animation: ${(props: { expanded: boolean }) => props.expanded ? 'quarterTurn 0.3s' : ''};
    animation-fill-mode: forwards;

    @keyframes quarterTurn {
      from { transform: rotate(0deg) }
      to { transform: rotate(90deg) }
    }
  }
`;