import { Tooltip } from "@material-ui/core";
import React from "react";
import styled from "styled-components";
import useFormField from "../hooks/useFormField";
import { StringInputFieldState, TextAreaField } from "../types";
import { hasSetValue } from "../utils";

const TextAreaInput: React.FC<TextAreaField> = (props) => {
  const {
    id,
    variable,
    label,
    info,
    placeholder,
    required,
    settings,
    isReadOnly,
    value,
  } = props;

  const { state, variables, setVars } = useFormField<StringInputFieldState>(
    id,
    {
      initVars: {
        [variable]: hasSetValue(props) ? value[0] : undefined,
      },
    }
  );

  if (!state) {
    return null;
  }

  return (
    <div>
      {label || info ? (
        <Label>
          {label}
          {info && (
            <Tooltip
              title={
                <div
                  style={{
                    fontFamily: "Work Sans, sans-serif",
                    fontSize: "12px",
                    fontWeight: "normal",
                    padding: "5px 6px",
                  }}
                >
                  {info}
                </div>
              }
              placement="top"
            >
              <StyledInfoTooltip>
                <i className="material-icons">help_outline</i>
              </StyledInfoTooltip>
            </Tooltip>
          )}
          {required && <Required>{" *"}</Required>}
        </Label>
      ) : null}
      <TextArea
        maxLength={settings?.options?.maxCount}
        minLength={settings?.options?.minCount}
        disabled={isReadOnly}
        value={variables[variable]}
        placeholder={placeholder}
        onChange={(e) => {
          e?.persist();
          setVars((prev) => {
            return {
              ...prev,
              [variable]: e?.target?.value,
            };
          });
        }}
      ></TextArea>
    </div>
  );
};

export default TextAreaInput;

const TextArea = styled.textarea`
  width: 100%;
  max-width: 100%;
  min-height: 150px;
  height: auto;
  max-height: 300px;
  background: #ffffff11;
  color: #ffffff;
  border-radius: 5px;
  padding: 10px;
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : ""};
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const StyledInfoTooltip = styled.div`
  display: inline-block;
  position: relative;
  margin-right: 2px;
  > i {
    display: flex;
    align-items: center;
    font-size: 16px;
    margin-left: 5px;
    color: #858faaaa;
    cursor: pointer;
    :hover {
      color: #aaaabb;
    }
  }
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
`;
