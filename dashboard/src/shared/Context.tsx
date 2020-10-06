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
    setCurrentModal: (currentModal: string): void => {
      this.setState({ currentModal });
    },
    currentError: null as string | null,
    setCurrentError: (currentError: string): void => {
      console.log('setting err', currentError)
      this.setState({ currentError });
    },
    currentCluster: null as string | null,
    setCurrentCluster: (currentCluster: string): void => {
      this.setState({ currentCluster });
    },
    userId: null as number | null,
    setUserId: (userId: number): void => {
      this.setState({ userId });
    },
    devOpsMode: true,
    setDevOpsMode: (devOpsMode: boolean): void => {
      this.setState({ devOpsMode });
    }
  };

  componentDidMount() {
    this.setState({ userId: 1 });
  }

  render() {
    return (
      <Provider value={this.state}>{this.props.children}</Provider>
    );
  }
}

export { Context, ContextProvider, ContextConsumer };
