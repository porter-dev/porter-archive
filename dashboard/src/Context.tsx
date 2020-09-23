import React, { Component } from 'react';

type ContextProps = {
}

const Context = React.createContext<ContextProps>({});

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
    currentModal: null,
    setCurrentModal: (currentModal: string): void => {
      this.setState({ currentModal });
    }
  };

  render() {
    return (
      <Provider value={this.state}>{this.props.children}</Provider>
    );
  }
}

export { Context, ContextProvider, ContextConsumer };
