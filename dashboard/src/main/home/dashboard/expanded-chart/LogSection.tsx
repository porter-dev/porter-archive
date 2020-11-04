import React, { Component } from 'react';
import styled from 'styled-components';
import api from '../../../../shared/api';
import { ResourceType } from '../../../../shared/types';
import { Context } from '../../../../shared/Context';

type PropsType = {
  components: ResourceType[],
};

type StateType = {
  logs: string[]
  podLabels: Record<string, string>[]
};

export default class LogSection extends Component<PropsType, StateType> {
  state = {
    logs: [] as string[],
    podLabels: [] as Record<string, string>[]
  }
  scrollRef = React.createRef<HTMLDivElement>()

  ws = new WebSocket('ws://localhost:8080/api/k8s/default/pod/my-release-mongodb-77cfb78b98-t7xjq/logs?context=do-nyc1-k8s-1-18-8-do-1-nyc1-1603481399357')

  scrollToBottom = () => {
    this.scrollRef.current.scrollTop = this.scrollRef.current.scrollHeight
  }

  renderLogs = () => {
    return this.state.logs.map(log => {
      return <div>{log}</div>
    })
  }

  renderPodTabs = () => {
    console.log(this.state.podLabels)
  }

  componentDidMount() {
    const { components } = this.props;

    components.forEach((c: ResourceType) => {
      switch(c.Kind) {
        case "Pod":
          this.setState({podLabels: [...this.state.podLabels, c.RawYAML.metadata.labels]})
      }
    })

    this.ws.onopen = () => {
      console.log('connected to websocket')
    }

    this.ws.onmessage = evt => {
      this.setState({ logs: [...this.state.logs, evt.data] }, () => {
        this.scrollToBottom()
      })
    }
    // api.getPodLogs('<token>', { context: currentCluster }, {}, (err: any, res: any) => {
    //   if (err) {
    //     this.setState({logs: "ERROR"})
    //     // this.setState({ namespaceOptions: [{ label: 'All', value: '' }] });
    //   } else {
    //     this.setState({logs: res.data});
    //   }
    // });
  }

  render() {
    return (
      <StyledLogSection ref={this.scrollRef}>
        {this.renderPodTabs()}
        {this.renderLogs()}
      </StyledLogSection>
    );
  }
}

LogSection.contextType = Context;


const StyledLogSection = styled.div`
  width: 100%;
  height: 100%;
  background: #202227;
  position: relative;
  padding: 0px;
  user-select: text;
`;