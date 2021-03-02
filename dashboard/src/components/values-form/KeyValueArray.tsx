import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  label?: string;
  values: any;
  setValues: (x: any) => void;
  width?: string;
};

type StateType = {
  values: any[];
};

export default class KeyValueArray extends Component<PropsType, StateType> {
  state = {
    values: [] as any[],
  };

  componentDidMount() {
    let arr = [] as any[];
    Object.keys(this.props.values).forEach((key: string, i: number) => {
      arr.push({ key, value: this.props.values[key] });
    });
    this.setState({ values: arr });
  }

  valuesToObject = () => {
    let obj = {} as any;
    this.state.values.forEach((entry: any, i: number) => {
      obj[entry.key] = entry.value;
    });
    return obj;
  };

  renderInputList = () => {
    return (
      <>
        {this.state.values.map((entry: any, i: number) => {
          return (
            <InputWrapper key={i}>
              <Input
                placeholder="ex: key"
                width="270px"
                value={entry.key}
                onChange={(e: any) => {
                  this.state.values[i].key = e.target.value;
                  this.setState({ values: this.state.values });

                  let obj = this.valuesToObject();
                  this.props.setValues(obj);
                }}
              />
              <Spacer />
              <Input
                placeholder="ex: value"
                width="270px"
                value={entry.value}
                onChange={(e: any) => {
                  this.state.values[i].value = e.target.value;
                  this.setState({ values: this.state.values });

                  let obj = this.valuesToObject();
                  this.props.setValues(obj);
                }}
              />
              <DeleteButton
                onClick={() => {
                  this.state.values.splice(i, 1);
                  this.setState({ values: this.state.values });

                  let obj = this.valuesToObject();
                  this.props.setValues(obj);
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
    return (
      <StyledInputArray>
        <Label>{this.props.label}</Label>
        {this.state.values.length === 0 ? <></> : this.renderInputList()}
        <AddRowButton
          onClick={() => {
            this.state.values.push({ key: "", value: "" });
            this.setState({ values: this.state.values });
          }}
        >
          <i className="material-icons">add</i> Add Row
        </AddRowButton>
      </StyledInputArray>
    );
  }
}

const Spacer = styled.div`
  width: 10px;
  height: 20px;
`;

const AddRowButton = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
  width: 270px;
  font-size: 13px;
  color: #aaaabb;
  height: 32px;
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
