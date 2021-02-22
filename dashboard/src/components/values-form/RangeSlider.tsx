import React, { ChangeEvent, Component } from "react";
import Slider from "@material-ui/core/Slider";
import styled from "styled-components";

type PropsType = {};

type StateType = {};

export default class RangeSelector extends Component<PropsType, StateType> {
  state = {};

  render() {
    return (
      <StyledInputRow>
        <Label>asdfasdf</Label>
        <Slider
          value={12}
          onChange={() => console.log("huh")}
          valueLabelDisplay="auto"
          aria-labelledby="range-slider"
        />
      </StyledInputRow>
    );
  }
}

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
`;

const Unit = styled.div`
  margin-left: 8px;
`;

const InputWrapper = styled.div`
  display: flex;
  margin-bottom: -1px;
  align-items: center;
`;

const Input = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: ${(props: { disabled: boolean; width: string }) =>
    props.width ? props.width : "270px"};
  color: ${(props: { disabled: boolean; width: string }) =>
    props.disabled ? "#ffffff44" : "white"};
  padding: 5px 10px;
  height: 35px;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const StyledInputRow = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
`;
