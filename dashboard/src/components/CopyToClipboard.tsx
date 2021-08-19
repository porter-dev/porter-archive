// import ClipboardJS from "clipboard";
import ClipboardJS from "clipboard";
import React, { Component, RefObject } from "react";
import Tooltip from "@material-ui/core/Tooltip";
import styled from "styled-components";

type PropsType = {
  text: string;
  onSuccess?: (e: ClipboardJS.Event) => void;
  onError?: (e: ClipboardJS.Event) => void;
  wrapperProps?: any;
  as?: any;
};

type StateType = {
  clipboard: ClipboardJS | undefined;
  success: boolean;
};

/**
 * Dynamic component to enable copy to clipboard.
 *  By default, it will be displayed as a span, when the user clicks over the span
 *  it will copy the text provided
 *
 * Examples of usage:
 * <CopyToClipboard
 *   as={MyCustomComponent}
 *   text={`some usefull text ${var}`}
 *   onSuccess={(e) => console.log("Success event:", e)}
 *   onError={(e) => console.log("Error event:", e)}
 * >
 *   Some content
 * </CopyToClipboard>
 */
export default class CopyToClipboard extends Component<PropsType, StateType> {
  triggerRef: RefObject<HTMLSpanElement>;

  state: StateType = {
    clipboard: undefined,
    success: false,
  };

  constructor(props: PropsType) {
    super(props);
    this.triggerRef = React.createRef();
  }

  componentDidMount() {
    const trigger = this.triggerRef.current;
    if (!trigger) {
      console.error("Couldn't mount clipboardjs on wrapper component");
      return;
    }
    const clipboard = new ClipboardJS(trigger, {
      text: () => {
        return this.props.text;
      },
    });

    clipboard.on("success", (e) => {
      this.setState({ success: true });
      this.props.onSuccess && this.props.onSuccess(e);
      setTimeout(() => {
        this.setState({ success: false });
      }, 2000);
    });

    this.props.onError && clipboard.on("error", this.props.onError);

    this.setState({ clipboard });
  }

  componentWillUnmount() {
    if (this.state.clipboard && this.state.clipboard.destroy) {
      this.state.clipboard.destroy();
    }
  }

  render() {
    return (
      <Tooltip
        title={
          <div
            style={{
              fontFamily: "Work Sans, sans-serif",
              fontSize: "12px",
              fontWeight: "normal",
              padding: "5px 6px",
            }}
          >
            Copied to clipboard
          </div>
        }
        open={this.state.success}
        placement="bottom"
        arrow
      >
        <DynamicSpanComponent
          as={this.props.as || "span"}
          ref={this.triggerRef}
          {...(this.props.wrapperProps || {})}
        >
          {this.props.children}
        </DynamicSpanComponent>
      </Tooltip>
    );
  }
}

const DynamicSpanComponent = styled.span``;
