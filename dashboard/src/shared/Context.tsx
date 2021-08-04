import React, { Component } from "react";

import {
  ProjectType,
  ClusterType,
  CapabilityType,
  ContextProps,
} from "shared/types";

import { pushQueryParams } from "shared/routing";

const Context = React.createContext<Partial<ContextProps>>(null);

const { Provider } = Context;
const ContextConsumer = Context.Consumer;

type PropsType = {
  history: any;
  location: any;
};

type StateType = GlobalContextType;

export interface GlobalContextType {
  currentModal: string;
  currentModalData: any;
  setCurrentModal: (currentModal: string, currentModalData?: any) => void;
  currentOverlay: {
    message: string,
    onYes: any,
    onNo: any,
  };
  setCurrentOverlay: (x: any) => void;
  currentError: string | null;
  setCurrentError: (currentError: string) => void;
  currentCluster: ClusterType;
  setCurrentCluster: (currentCluster: ClusterType, callback?: any) => void;
  currentProject: ProjectType | null;
  setCurrentProject: (
    currentProject: ProjectType,
    callback?: () => void
  ) => void;
  projects: ProjectType[];
  setProjects: (projects: ProjectType[]) => void;
  user: any;
  setUser: (userId: number, email: string) => void;
  devOpsMode: boolean;
  setDevOpsMode: (devOpsMode: boolean) => void;
  capabilities: CapabilityType;
  setCapabilities: (capabilities: CapabilityType) => void;
  clearContext: () => void;
}

/**
 * Component managing a universal (application-wide) data store.
 *
 * Important Usage Notes:
 * 1) Each field must have an accompanying setter
 * 2) No function calls are allowed from within Context (not counting
 *    initialization)
 * 3) Context should be used as a last-resort (changes will re-render ALL
 *    components consuming Context)
 * 4) As a rule of thumb, Context should not be used for UI-related state
 */
class ContextProvider extends Component<PropsType, StateType> {
  state: GlobalContextType = {
    currentModal: null,
    currentModalData: null,
    setCurrentModal: (currentModal: string, currentModalData?: any) => {
      this.setState({ currentModal, currentModalData });
    },
    currentOverlay: null,
    setCurrentOverlay: (x: any) => this.setState({ currentOverlay: x }),
    currentError: null,
    setCurrentError: (currentError: string) => {
      this.setState({ currentError });
    },
    currentCluster: {
      id: -1,
      name: "",
      server: "",
      service_account_id: -1,
      infra_id: -1,
      service: "",
    },
    setCurrentCluster: (currentCluster: ClusterType, callback?: any) => {
      localStorage.setItem(
        this.state.currentProject.id + "-cluster",
        JSON.stringify(currentCluster)
      );
      this.setState({ currentCluster }, () => {
        callback && callback();
      });
    },
    currentProject: null,
    setCurrentProject: (currentProject: ProjectType, callback?: any) => {
      if (currentProject) {
        localStorage.setItem("currentProject", currentProject.id.toString());
        pushQueryParams(this.props, {
          project_id: currentProject.id.toString(),
        });
      } else {
        localStorage.removeItem("currentProject");
      }
      this.setState({ currentProject }, () => {
        callback && callback();
      });
    },
    projects: [],
    setProjects: (projects: ProjectType[]) => {
      projects.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
      this.setState({ projects });
    },
    user: null,
    setUser: (userId: number, email: string) => {
      this.setState({ user: { userId, email } });
    },
    devOpsMode: true,
    setDevOpsMode: (devOpsMode: boolean) => {
      this.setState({ devOpsMode });
    },
    capabilities: null,
    setCapabilities: (capabilities: CapabilityType) => {
      this.setState({ capabilities });
    },
    clearContext: () => {
      this.setState({
        currentModal: null,
        currentModalData: null,
        currentError: null,
        currentCluster: null,
        currentProject: null,
        projects: [],
        user: null,
        devOpsMode: true,
      });
    },
  };

  render() {
    return <Provider value={this.state}>{this.props.children}</Provider>;
  }
}

export { Context, ContextProvider, ContextConsumer };
