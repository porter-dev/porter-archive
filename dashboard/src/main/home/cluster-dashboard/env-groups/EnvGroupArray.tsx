import React, { Component } from "react";
import styled from "styled-components";
import Modal from "main/home/modals/Modal";
import EnvEditorModal from "main/home/modals/EnvEditorModal";

import sliders from "assets/sliders.svg";
import upload from "assets/upload.svg";
import { keysIn } from "lodash";

export type KeyValueType = {
  key: string;
  value: string;
  hidden: boolean;
  locked: boolean;
  deleted: boolean;
};

type PropsType = {
  label?: string;
  values: KeyValueType[];
  setValues: (x: KeyValueType[]) => void;
  width?: string;
  disabled?: boolean;
  namespace?: string;
  clusterId?: number;
  envLoader?: boolean;
  fileUpload?: boolean;
  secretOption?: boolean;
};

type StateType = {
  showEnvModal: boolean;
  showEditorModal: boolean;
};

export default class EnvGroupArray extends Component<PropsType, StateType> {
  state = {
    showEnvModal: false,
    showEditorModal: false,
  };

  componentDidMount() {
    if (!this.props.values) {
      let _values = [] as KeyValueType[];
      this.props.setValues(_values);
    }
  }

  renderDeleteButton = (i: number) => {
    if (!this.props.disabled) {
      return (
        <DeleteButton
          onClick={() => {
            let _values = this.props.values;
            _values[i].deleted = true;
            this.props.setValues(_values);
          }}
        >
          <i className="material-icons">cancel</i>
        </DeleteButton>
      );
    }
  };

  renderHiddenOption = (hidden: boolean, locked: boolean, i: number) => {
    if (this.props.secretOption) {
      let icon = <i className="material-icons">lock_open</i>;

      if (hidden) {
        icon = <i className="material-icons">lock</i>;
      }

      return (
        <HideButton
          onClick={() => {
            if (!locked) {
              let _values = this.props.values;
              _values[i].hidden = !_values[i].hidden;
              this.props.setValues(_values);
            }
          }}
          disabled={locked}
        >
          {icon}
        </HideButton>
      );
    }
  };

  renderInputList = () => {
    return (
      <>
        {this.props.values.map((entry: KeyValueType, i: number) => {
          if (!entry.deleted) {
            return (
              <InputWrapper key={i}>
                <Input
                  placeholder="ex: key"
                  width="270px"
                  value={entry.key}
                  onChange={(e: any) => {
                    let _values = this.props.values;
                    _values[i].key = e.target.value;
                    this.props.setValues(_values);
                  }}
                  disabled={this.props.disabled || entry.locked}
                  spellCheck={false}
                />
                <Spacer />
                <Input
                  placeholder="ex: value"
                  width="270px"
                  value={entry.value}
                  onChange={(e: any) => {
                    let _values = this.props.values;
                    _values[i].value = e.target.value;
                    this.props.setValues(_values);
                  }}
                  disabled={this.props.disabled || entry.locked}
                  type={entry.hidden ? "password" : "text"}
                  spellCheck={false}
                />
                {this.renderHiddenOption(entry.hidden, entry.locked, i)}
                {this.renderDeleteButton(i)}
              </InputWrapper>
            );
          }
        })}
      </>
    );
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
    let _values = this.props.values;

    for (let key in envObj) {
      let push = true;
      for (var i = 0; i < this.props.values.length; i++) {
        let existingKey = this.props.values[i]["key"];
        let isExistingKeyDeleted = this.props.values[i]["deleted"];
        if (key === existingKey && !isExistingKeyDeleted) {
          _values[i]["value"] = envObj[key];
          push = false;
        }
      }

      if (push) {
        _values.push({
          key,
          value: envObj[key],
          hidden: false,
          locked: false,
          deleted: false,
        });
      }
    }

    this.props.setValues(_values);
  };

  render() {
    if (this.props.values) {
      return (
        <>
          <StyledInputArray>
            <Label>{this.props.label}</Label>
            {this.props.values.length === 0 ? <></> : this.renderInputList()}
            {this.props.disabled ? (
              <></>
            ) : (
              <InputWrapper>
                <AddRowButton
                  onClick={() => {
                    let _values = this.props.values;
                    _values.push({
                      key: "",
                      value: "",
                      hidden: false,
                      locked: false,
                      deleted: false,
                    });
                    this.props.setValues(_values);
                  }}
                >
                  <i className="material-icons">add</i> Add Row
                </AddRowButton>
                <Spacer />
                {this.props.namespace && this.props.envLoader && (
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
          {this.renderEditorModal()}
        </>
      );
    }

    return null;
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
    cursor: ${(props: { disabled: boolean }) =>
      props.disabled ? "default" : "pointer"};
    :hover {
      color: ${(props: { disabled: boolean }) =>
        props.disabled ? "#ffffff44" : "#ffffff88"};
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
