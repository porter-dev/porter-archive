import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {};

type StateType = {};

export default class Boilerplate extends Component<PropsType, StateType> {
  state = {};

  render() {
    return <StyledBoilerplate>boilerplate</StyledBoilerplate>;
  }
}

const StyledBoilerplate = styled.div``;
