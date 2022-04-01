import InputRow from "components/form-components/InputRow";
import React from "react";
import useFormField from "../hooks/useFormField";
import { CronField } from "../types";
import { hasSetValue } from "../utils";
import { isValidCron } from "cron-validator";
import CronParser from "cronstrue";
import styled from "styled-components";

const CronInput: React.FC<CronField> = (props) => {
  const { id, variable } = props;

  const { state, variables, setVars, setValidation, validation } = useFormField(
    id,
    {
      initValidation: {
        validated: hasSetValue(props),
      },
    }
  );

  console.log(validation[id]);

  return (
    <>
      <InputRow
        type="text"
        value={variables[variable]}
        setValue={(x: string) => {
          setVars((vars) => {
            return {
              ...vars,
              [variable]: x,
            };
          });
          setValidation((prev) => {
            return {
              ...prev,
              validated: isValidCron(x),
            };
          });
        }}
        width={"100%"}
        hasError={!validation[id].validated}
      />
      <Label error={!validation[id].validated}>
        {CronParser.toString(variables[variable], {
          throwExceptionOnParseError: false,
          verbose: true,
        })}
      </Label>
    </>
  );
};

const Label = styled.label`
  ${(props: { error: boolean }) => {
    if (props.error) {
      return "color: red;";
    }
  }}
`;

export default CronInput;
