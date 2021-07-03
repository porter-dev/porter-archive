import React, { Component } from "react";
import styled from "styled-components";
import Modal from "../../main/home/modals/Modal";
import LoadEnvGroupModal from "../../main/home/modals/LoadEnvGroupModal";
import EnvEditorModal from "../../main/home/modals/EnvEditorModal";

import sliders from "assets/sliders.svg";
import upload from "assets/upload.svg";
import { keysIn } from "lodash";

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
    this.state.values.forEach((entry: any, i: number) => {
      obj[entry.key] = entry.value;
    });
    return obj;
  };

  objectToValues = (obj: Record<string, string>): KeyValue[] => {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
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
        {this.state.values.map((entry: any, i: number) => {
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
                disabled={this.props.disabled || value.includes("PORTERSECRET")}
                spellCheck={false}
              />
              <Spacer />
              <Input
                placeholder="ex: value"
                width="270px"
                value={value}
                onChange={(e: any) => {
                  this.state.values[i].value = e.target.value;
                  this.setState({ values: this.state.values });

                  let obj = this.valuesToObject();
                  this.props.setValues(obj);
                }}
                disabled={this.props.disabled || value.includes("PORTERSECRET")}
                type={value.includes("PORTERSECRET") ? "password" : "text"}
                spellCheck={false}
              />
              {this.renderDeleteButton(i)}
              {this.renderHiddenOption(value.includes("PORTERSECRET"), i)}
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
          width="665px"
          height="342px"
        >
          <LoadEnvGroupModal
            existingValues={this.props.values}
            namespace={this.props.externalValues?.namespace}
            clusterId={this.props.externalValues?.clusterId}
            closeModal={() => this.setState({ showEnvModal: false })}
            setValues={(values: any) => {
              this.props.setValues(values);
              this.setState({ values: this.objectToValues(values) });
            }}
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

  // Parses src into an Object
  parseEnv = (src: any, options: any) => {
    const debug = Boolean(options && options.debug);
    const obj = {} as Record<string, string>;
    const NEWLINE = "\n";
    const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/;
    const RE_NEWLINES = /\\n/g;
    const NEWLINES_MATCH = /\n|\r|\r\n/;

    // convert Buffers before splitting into lines and processing
    src
      .toString()
      .split(NEWLINES_MATCH)
      .forEach(function (line: any, idx: any) {
        // matching "KEY' and 'VAL' in 'KEY=VAL'
        const keyValueArr = line.match(RE_INI_KEY_VAL);
        // matched?
        if (keyValueArr != null) {
          const key = keyValueArr[1];
          // default undefined or missing values to empty string
          let val = keyValueArr[2] || "";
          const end = val.length - 1;
          const isDoubleQuoted = val[0] === '"' && val[end] === '"';
          const isSingleQuoted = val[0] === "'" && val[end] === "'";

          // if single or double quoted, remove quotes
          if (isSingleQuoted || isDoubleQuoted) {
            val = val.substring(1, end);

            // if double quoted, expand newlines
            if (isDoubleQuoted) {
              val = val.replace(RE_NEWLINES, NEWLINE);
            }
          } else {
            // remove surrounding whitespace
            val = val.trim();
          }

          obj[key] = val;
        } else if (debug) {
          console.log(
            `did not match key and value when parsing line ${idx + 1}: ${line}`
          );
        }
      });

    return obj;
  };

  readFile = (env: string) => {
    let envObj = this.parseEnv(env, null);
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
