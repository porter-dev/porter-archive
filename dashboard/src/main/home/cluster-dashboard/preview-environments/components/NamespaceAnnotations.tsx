import React, { useEffect } from "react";
import styled from "styled-components";

export type KeyValueType = {
  key: string;
  value: string;
};

type PropsType = {
  values: KeyValueType[];
  setValues: (x: KeyValueType[]) => void;
};

const NamespaceAnnotations = ({ values, setValues }: PropsType) => {
  useEffect(() => {
    if (!values) {
      setValues([]);
    }
  }, [values]);

  if (!values) {
    return null;
  }

  return (
    <>
      <StyledInputArray>
        {!!values?.length &&
          values.map((entry: KeyValueType, i: number) => {
            return (
              <InputWrapper key={i}>
                <Input
                  placeholder="ex: key"
                  width="270px"
                  value={entry.key}
                  onChange={(e: any) => {
                    let _values = values;
                    _values[i].key = e.target.value;
                    setValues(_values);
                  }}
                />
                <Spacer />
                <Input
                  placeholder="ex: value"
                  width="270px"
                  value={entry.value}
                  onChange={(e: any) => {
                    let _values = values;
                    _values[i].value = e.target.value;
                    setValues(_values);
                  }}
                />
                <DeleteButton
                  onClick={() => {
                    let _values = values;
                    _values = _values.filter((val) => val.key !== entry.key);
                    setValues(_values);
                  }}
                >
                  <i className="material-icons">cancel</i>
                </DeleteButton>
              </InputWrapper>
            );
          })}
        <InputWrapper>
          <AddRowButton
            onClick={() => {
              let _values = values;
              _values.push({
                key: "",
                value: "",
              });
              setValues(_values);
            }}
          >
            <i className="material-icons">add</i> Add Row
          </AddRowButton>
          <Spacer />
        </InputWrapper>
      </StyledInputArray>
    </>
  );
};

export default NamespaceAnnotations;

const Spacer = styled.div`
  width: 10px;
  height: 20px;
`;

const AddRowButton = styled.div`
  display: flex;
  align-items: center;
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
  margin-top: 5px;
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

const StyledInputArray = styled.div`
  margin-bottom: 15px;
  margin-top: 22px;
`;
