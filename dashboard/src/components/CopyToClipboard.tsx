// import ClipboardJS from "clipboard";
import ClipboardJS from "clipboard";
import React, { Component, RefObject } from "react";
import styled from "styled-components";



type PropsType = {
  text: string,
  onSuccess?: (e: ClipboardJS.Event) => void
  onError?: (e: ClipboardJS.Event) => void
};

type StateType = {
  clipboard: ClipboardJS | undefined,
};


/**
 * Enables parent onClick to copy the text provided to the CopyToClipboard element.
 * 
 * 
 * Example of usage: 
 * <MyCustomComponent>
 *    <CopyToClipboard 
 *      text={`some usefull text ${var}`} 
 *      onSuccess={(e) => console.log("Success event:", e)}
 *      onError={(e) => console.log("Error event:", e)}
 *    />
 * </MyCustomComponent>
 */
export default class CopyToClipboard extends Component<PropsType, StateType> {
  triggerRef: RefObject<HTMLSpanElement>;
  
  state: StateType = {
    clipboard: undefined,
  }

  constructor(props: PropsType) {
    super(props);
    this.triggerRef = React.createRef();
  }
  
  componentDidMount() {
    const trigger = this.triggerRef.current.parentElement;
    if (!trigger) {
      console.error('Couldn\'t find a parent element. The CopyToClipboard component should be inside the trigger component, for example a button')
      return;
    }
    const clipboard = new ClipboardJS(trigger, {
      text: () => {
        return this.props.text;
      }
    });
  
    this.props.onSuccess && clipboard.on("success", this.props.onSuccess);
  
    this.props.onError && clipboard.on("error", this.props.onError);
  
    this.setState({clipboard})
  }

  componentWillUnmount() {
    if (this.state.clipboard && this.state.clipboard.destroy) {
      this.state.clipboard.destroy();
    }
  }

  render() {
    return (
      <NonVisibleSpan ref={this.triggerRef}>
      </NonVisibleSpan>
    )
  }
}

const NonVisibleSpan = styled.span`
  display: none;
`

