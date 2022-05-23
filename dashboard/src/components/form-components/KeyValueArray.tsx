import React, { Component } from "react";
import styled from "styled-components";
import Modal from "../../main/home/modals/Modal";
import LoadEnvGroupModal from "../../main/home/modals/LoadEnvGroupModal";
import EnvEditorModal from "../../main/home/modals/EnvEditorModal";
import { dotenv_parse } from "shared/string_utils";

import sliders from "assets/sliders.svg";
import upload from "assets/upload.svg";
import { MultiLineInput } from "components/porter-form/field-components/KeyValueArray";

export type KeyValue = {
  key: string;
  value: string;
};

type PropsType = {
  label?: string;
  values: any;
  setValues?: (x: any) => void;
  width?: string;
  disabled?: boolean;
  externalValues?: any;
  envLoader?: boolean;
  fileUpload?: boolean;
  secretOption?: boolean;
};

type StateType = {
  values: any[];
  showEnvModal: boolean;
  showEditorModal: boolean;
};

export default class KeyValueArray extends Component<PropsType, StateType> {
  state = {
    values: [] as any[],
    showEnvModal: false,
    showEditorModal: false,
  };

  componentDidMount() {
    let arr = [] as any[];
    if (this.props.values) {
      Object.keys(this.props.values).forEach((key: string, i: number) => {
        arr.push({ key, value: this.props.values[key] });
      });
    }
    this.setState({ values: arr });
  }

  valuesToObject = () => {
    let obj = {} as any;
    const rg = /(?:^|[^\\])(\\n)/g;
    const fixNewlines = (s: string) => {
      while (rg.test(s)) {
        s = s.replace(rg, (str) => {
          if (str.length == 2) return "\n";
          if (str[0] != "\\") return str[0] + "\n";
          return "\\n";
        });
      }
      return s;
    };
    const isNumber = (s: string) => {
      return !isNaN(!s ? NaN : Number(String(s).trim()));
    };
    this.state.values.forEach((entry: any, i: number) => {
      if (isNumber(entry.value)) {
        obj[entry.key] = entry.value;
      } else {
        obj[entry.key] = fixNewlines(entry.value);
      }
    });
    return obj;
  };

  objectToValues = (obj: Record<string, string>): KeyValue[] => {
    return Object.entries(obj)?.map(([key, value]) => ({ key, value }));
  };

  renderDeleteButton = (i: number) => {
    if (!this.props.disabled) {
      return (
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
      );
    }
  };

  renderHiddenOption = (hidden: boolean, i: number) => {
    if (this.props.secretOption && hidden) {
      return (
        <HideButton>
          <i className="material-icons">lock</i>
        </HideButton>
      );
    }
  };

  renderInputList = () => {
    return (
      <>
        {this.state.values?.map((entry: any, i: number) => {
          // Preprocess non-string env values set via raw Helm values
          let { value } = entry;
          if (typeof value === "object") {
            value = JSON.stringify(value);
          } else if (typeof value === "number" || typeof value === "boolean") {
            value = value.toString();
          }

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
                disabled={
                  this.props.disabled || value?.includes("PORTERSECRET")
                }
                spellCheck={false}
              />
              <Spacer />
              {value?.includes("PORTERSECRET") ? (
                <Input
                  placeholder="ex: value"
                  width="270px"
                  value={value}
                  disabled
                  type={"password"}
                  spellCheck={false}
                />
              ) : (
                <MultiLineInput
                  placeholder="ex: value"
                  width="270px"
                  value={value}
                  onChange={(e: any) => {
                    this.state.values[i].value = e.target.value;
                    this.setState({ values: this.state.values });

                    let obj = this.valuesToObject();
                    this.props.setValues(obj);
                  }}
                  disabled={
                    this.props.disabled || value?.includes("PORTERSECRET")
                  }
                  spellCheck={false}
                  rows={value?.split("\n").length}
                />
              )}
              {this.renderDeleteButton(i)}
              {this.renderHiddenOption(value?.includes("PORTERSECRET"), i)}
            </InputWrapper>
          );
        })}
      </>
    );
  };

  renderEnvModal = () => {
    if (this.state.showEnvModal) {
      return (
        <Modal
          onRequestClose={() => this.setState({ showEnvModal: false })}
          width="765px"
          height="542px"
        >
          <LoadEnvGroupModal
            existingValues={this.props.values}
            namespace={this.props.externalValues?.namespace}
            clusterId={this.props.externalValues?.clusterId}
            closeModal={() => this.setState({ showEnvModal: false })}
            setValues={(values) => {
              const newValues = { ...this.props.values, ...values };
              this.props.setValues(newValues);
              this.setState({ values: this.objectToValues(newValues) });
            }}
            normalEnvVarsOnly
          />
        </Modal>
      );
    }
  };

  renderEditorModal = () => {
    if (this.state.showEditorModal) {
      return (
        <Modal
          onRequestClose={() => this.setState({ showEditorModal: false })}
          width="60%"
          height="80%"
        >
          <EnvEditorModal
            closeModal={() => this.setState({ showEditorModal: false })}
            setEnvVariables={(envFile: string) => this.readFile(envFile)}
          />
        </Modal>
      );
    }
  };

  readFile = (env: string) => {
    let envObj = dotenv_parse(env);
    let push = true;

    for (let key in envObj) {
      for (var i = 0; i < this.state.values.length; i++) {
        let existingKey = this.state.values[i]["key"];
        if (key === existingKey) {
          this.state.values[i]["value"] = envObj[key];
          push = false;
        }
      }

      if (push) {
        this.state.values.push({ key, value: envObj[key] });
      }
    }

    this.setState({ values: this.state.values }, () => {
      let obj = this.valuesToObject();
      this.props.setValues(obj);
    });
  };

  render() {
    return (
      <>
        <StyledInputArray>
          <Label>{this.props.label}</Label>
          {this.state.values.length === 0 ? <></> : this.renderInputList()}
          {this.props.disabled ? (
            <></>
          ) : (
            <InputWrapper>
              <AddRowButton
                onClick={() => {
                  this.state.values.push({ key: "", value: "" });
                  this.setState({ values: this.state.values });
                }}
              >
                <i className="material-icons">add</i> Add Row
              </AddRowButton>
              <Spacer />
              {this.props.externalValues?.namespace && this.props.envLoader && (
                <LoadButton
                  onClick={() =>
                    this.setState({ showEnvModal: !this.state.showEnvModal })
                  }
                >
                  <img src={sliders} /> Load from Env Group
                </LoadButton>
              )}
              {this.props.fileUpload && (
                <UploadButton
                  onClick={() => {
                    this.setState({ showEditorModal: true });
                  }}
                >
                  <img src={upload} /> Copy from File
                </UploadButton>
              )}
            </InputWrapper>
          )}
        </StyledInputArray>
        {this.renderEnvModal()}
        {this.renderEditorModal()}
      </>
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

const LoadButton = styled(AddRowButton)`
  background: none;
  border: 1px solid #ffffff55;
  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  > img {
    width: 14px;
    margin-left: 10px;
    margin-right: 12px;
  }
`;

const UploadButton = styled(AddRowButton)`
  background: none;
  position: relative;
  border: 1px solid #ffffff55;
  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  > img {
    width: 14px;
    margin-left: 10px;
    margin-right: 12px;
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

const HideButton = styled(DeleteButton)`
  margin-top: -5px;
  > i {
    font-size: 19px;
    cursor: default;
    :hover {
      color: #ffffff44;
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

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

const StyledInputArray = styled.div`
  margin-bottom: 15px;
  margin-top: 22px;
`;
