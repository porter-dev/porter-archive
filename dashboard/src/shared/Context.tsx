import React, { Component } from 'react';

type PropsType = {
}

type StateType = {
}

const Context = React.createContext({});

const { Provider } = Context;
const ContextConsumer = Context.Consumer;

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
class ContextProvider extends Component {
  state = {
    currentModal: null as string | null,
    currentModalData: null as any,
    setCurrentModal: (currentModal: string, currentModalData?: any) => {
      this.setState({ currentModal, currentModalData });
    },
    currentError: null as string | null,
    setCurrentError: (currentError: string) => {
      this.setState({ currentError });
    },
    currentCluster: null as string | null,
    setCurrentCluster: (currentCluster: string) => {
      this.setState({ currentCluster });
    },
    currentProject: null as string | null,
    setCurrentProject: (currentProject: string) => {
      this.setState({ currentProject });
    },
    user: null as any,
    setUser: (userId: number, email: string) => {
      this.setState({ user: {userId, email} });
    },
    devOpsMode: true,
    setDevOpsMode: (devOpsMode: boolean) => {
      this.setState({ devOpsMode });
    }
  };
  
  render() {
    return (
      <Provider value={this.state}>{this.props.children}</Provider>
    );
  }
}

export { Context, ContextProvider, ContextConsumer };
