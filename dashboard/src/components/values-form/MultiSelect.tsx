import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {};

type StateType = {
  options: { label: string; value: string }[];
};

export default class MultiSelect extends Component<PropsType, StateType> {
  state = {
    options: [] as { label: string; value: string }[],
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
