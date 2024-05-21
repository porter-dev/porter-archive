import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import Tooltip from "components/porter/Tooltip";
import { type KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import { type PorterAppFormData } from "lib/porter-apps";

import warning from "assets/warning.svg";

type Props = {
  entry: KeyValueType;
  index: number;
  remove: () => void;
  isKeyOverriding: (key: string) => boolean;
};
const EnvVarRow: React.FC<Props> = ({
  entry,
  index,
  remove,
  isKeyOverriding,
}) => {
  const { control: appControl, watch } = useFormContext<PorterAppFormData>();
  const hidden = watch(`app.env.${index}.hidden`);

  return (
    <InputWrapper>
      {entry.locked ? (
        <Input
          placeholder="ex: key"
          width="270px"
          value={entry.key}
          disabled
          spellCheck={false}
        />
      ) : (
        <Controller
          name={`app.env.${index}.key`}
          control={appControl}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <Input
              placeholder="ex: key"
              width="270px"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
              }}
              spellCheck={false}
              style={error ? { borderColor: "#fbc902" } : {}}
            />
          )}
        />
      )}
      <Spacer inline width="10px" />
      {hidden ? (
        entry.locked ? (
          <Input
            placeholder="ex: value"
            flex
            value={entry.value}
            disabled
            type={"password"}
            spellCheck={false}
          />
        ) : (
          <Controller
            name={`app.env.${index}.value`}
            control={appControl}
            render={({ field: { value, onChange } }) => (
              <Input
                placeholder="ex: value"
                flex
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                }}
                type={"password"}
                spellCheck={false}
              />
            )}
          />
        )
      ) : (
        <Controller
          name={`app.env.${index}.value`}
          control={appControl}
          render={({ field: { value, onChange } }) => (
            <MultiLineInputer
              placeholder="ex: value"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
              }}
              rows={value?.split("\n").length}
              spellCheck={false}
            />
          )}
        />
      )}
      {hidden ? (
        <Controller
          name={`app.env.${index}.hidden`}
          control={appControl}
          render={({ field: { value, onChange } }) => (
            <HideButton
              onClick={() => {
                onChange(!value);
              }}
              disabled={entry.locked}
            >
              <i className="material-icons">lock</i>
            </HideButton>
          )}
        />
      ) : (
        <Controller
          name={`app.env.${index}.hidden`}
          control={appControl}
          render={({ field: { value, onChange } }) => (
            <HideButton
              onClick={() => {
                onChange(!value);
              }}
              disabled={entry.locked}
            >
              <i className="material-icons">lock_open</i>
            </HideButton>
          )}
        />
      )}
      <DeleteButton
        onClick={() => {
          remove();
        }}
      >
        <i className="material-icons">cancel</i>
      </DeleteButton>
      {isKeyOverriding(entry.key) && (
        <>
          <Spacer width="10px" inline />
          <Tooltip
            content="This key overrides a value in a synced environment group"
            position="left"
            width="220px"
          >
            <Image src={warning} size={14} />
          </Tooltip>
          <Spacer width="2px" inline />
        </>
      )}
      {!isKeyOverriding(entry.key) && <Spacer width="27px" inline />}
    </InputWrapper>
  );
};
export default EnvVarRow;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
`;

type InputProps = {
  disabled?: boolean;
  width?: string;
  override?: boolean;
};

const Input = styled.input<{ flex?: boolean; override?: boolean }>`
  outline: none;
  display: ${(props) => (props.flex ? "flex" : "block")};
  ${(props) => props.flex && "flex: 1;"}
  border: none;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border: ${(props) =>
    props.override ? "2px solid #f4cb42" : " 1px solid #494b4f"};
  border-radius: 5px;
  width: ${(props) => (props.width ? props.width : "270px")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "#fefefe")};
  padding: 5px 10px;
  height: 35px;
`;

export const MultiLineInputer = styled.textarea<InputProps>`
  outline: none;
  border: none;
  display: flex;
  flex: 1;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border: ${(props) =>
    props.override ? "2px solid #f4cb42" : " 1px solid #494b4f"};
  border-radius: 5px;
  color: ${(props) => (props.disabled ? "#ffffff44" : "#fefefe")};
  padding: 8px 10px 5px 10px;
  min-height: 35px;
  max-height: 100px;
  white-space: nowrap;

  ::-webkit-scrollbar {
    width: 8px;
    :horizontal {
      height: 8px;
    }
  }

  ::-webkit-scrollbar-corner {
    width: 10px;
    background: #ffffff11;
    color: white;
  }

  ::-webkit-scrollbar-track {
    width: 10px;
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

  ::-webkit-scrollbar-thumb {
    background-color: darkgrey;
    outline: 1px solid slategrey;
  }
`;

const DeleteButton = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  margin-left: 8px;
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
