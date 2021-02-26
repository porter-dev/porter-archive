import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  label?: string;
  values: string[];
  setValues: (x: string[]) => void;
  width?: string;
};

type StateType = {};

export default class InputArray extends Component<PropsType, StateType> {
  dict2arr = (dict: Record<string, any>) => {
    let arr = [];
    for (let key in dict) {
      arr.push(`${key}: ${dict[key]}`);
    }
    return arr;
  };

  renderInputList = (values: string[]) => {
    return (
      <>
        {values.map((value: string, i: number) => {
          return (
            <InputWrapper>
              <Input
                placeholder=""
                width="270px"
                value={value}
                onChange={(e: any) => {
                  let v = [...values];
                  v[i] = e.target.value;
                  this.props.setValues(v);
                }}
              />
              <DeleteButton
                onClick={() => {
                  let v = [...values];
                  v.splice(i, 1);
                  this.props.setValues(v);
                }}
              >
                <i className="material-icons">cancel</i>
              </DeleteButton>
            </InputWrapper>
          );
        })}
      </>
    );
  };

  render() {
    let { values } = this.props;

    if (!Array.isArray(values)) {
      values = this.dict2arr(values);
    }

    return (
      <StyledInputArray>
        <Label>{this.props.label}</Label>
        {values.length === 0 ? <></> : this.renderInputList(values)}
        <AddRowButton
          onClick={() => {
            let v = [...values];
            v.push("");
            this.props.setValues(v);
          }}
        >
          <i className="material-icons">add</i> Add Row
        </AddRowButton>
      </StyledInputArray>
    );
  }
}

const AddRowButton = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
  width: 270px;
  font-size: 13px;
  color: #aaaabb;
  height: 30px;
  border-radius: 3px;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
  }

  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const DeleteButton = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  margin-left: 8px;
  margin-top: -3px;
  justify-content: center;

  > i {
    font-size: 17px;
    color: #ffffff44;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    :hover {
      color: #ffffff88;
    }
  }
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: ${(props: { disabled?: boolean; width: string }) =>
    props.width ? props.width : "270px"};
  color: ${(props: { disabled?: boolean; width: string }) =>
    props.disabled ? "#ffffff44" : "white"};
  padding: 5px 10px;
  height: 35px;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

const StyledInputArray = styled.div`
  margin-bottom: 15px;
  margin-top: 22px;
`;
