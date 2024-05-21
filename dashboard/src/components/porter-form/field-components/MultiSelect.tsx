import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {};

type StateType = {
  options: Array<{ label: string; value: string }>;
};

export default class MultiSelect extends Component<PropsType, StateType> {
  state = {
    options: [] as Array<{ label: string; value: string }>,
  };

  renderOptions = () => {};

  render() {
    return (
      <>
        <StyledMultiSelect></StyledMultiSelect>
        boilerplate
      </>
    );
  }
}

const StyledMultiSelect = styled.div``;
