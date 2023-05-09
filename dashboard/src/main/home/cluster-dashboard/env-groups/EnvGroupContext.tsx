import React, { Component } from "react";

import {
  CapabilityType,
  ClusterType,
  ContextProps,
  ProjectType,
  UsageData,
} from "shared/types";

import { pushQueryParams } from "shared/routing";
import api from "shared/api";
export type KeyValueType = {
  key: string;
  value: string;
  hidden: boolean;
  locked: boolean;
  deleted: boolean;
};

export type EnvGroupData = {
  name: string;
  namespace: string;
  created_at?: string;
  version: number;
};
const EnvContext = React.createContext<Partial<ContextProps>>(null);

const { Provider } = EnvContext;
const EnvContextConsumer = EnvContext.Consumer;
type PropsType = {
  createdEnvGroup?: EnvGroupData[];
  children?: React.ReactNode;
};
type StateType = EnvContextType;
export interface EnvContextType {
  currentEnvGroup: EnvGroupData;
  setCurrentEnvGroup: (currentEnvGroup: EnvGroupData) => void;
  envGrouping: any[];
  setEnvGroups: (envGroups: EnvGroupData[]) => void;
}
class EnvContextProvider extends Component<PropsType, StateType> {
  state: EnvContextType = {
    currentEnvGroup: null,
    envGrouping: null,
    setCurrentEnvGroup: (currentEnvGroup: EnvGroupData) => {
      this.setState({ currentEnvGroup });
    },
    setEnvGroups: (envGrouping: EnvGroupData[]) => {
      this.setState({ envGrouping });
    },
  };
  render() {
    return <Provider value={{ ...this.state }}>{this.props.children}</Provider>;
  }
}

export { EnvContext, EnvContextProvider, EnvContextConsumer };
