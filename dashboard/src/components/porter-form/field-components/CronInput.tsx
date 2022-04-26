import InputRow from "components/form-components/InputRow";
import React from "react";
import useFormField from "../hooks/useFormField";
import { CronField } from "../types";
import { hasSetValue } from "../utils";
import { isValidCron } from "cron-validator";
import CronParser from "cronstrue";
import styled from "styled-components";
import DocsHelper from "components/DocsHelper";
import DynamicLink from "components/DynamicLink";

const CronInput: React.FC<CronField> = (props) => {
  const { id, variable, label, placeholder, value, isReadOnly } = props;

  const { state, variables, setVars, setValidation, validation } = useFormField(
    id,
    {
      initValidation: {
        validated: hasSetValue(props) ? isValidCron(value[0]) : true,
      },
      initVars: {
        [variable]: hasSetValue(props) ? value[0] : undefined,
      },
    }
  );

  if (!state || validation[id]?.validated === undefined) {
    return null;
  }

  return (
    <>
      <InputRow
        type="text"
        label={label}
        placeholder={placeholder}
        value={variables[variable]}
        disabled={isReadOnly}
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
        hasError={!validation[id]?.validated}
      />
      <Label error={!validation[id]?.validated}>
        {!validation[id]?.validated ? (
          <>
            The expresion is not valid, to learn more about cron jobs please
            click{" "}
            <DynamicLink
              style={{ color: "red", textDecoration: "underline" }}
              to="https://docs.porter.run/running-jobs/deploying-jobs#deploying-a-cron-job"
            >
              here
            </DynamicLink>
          </>
        ) : (
          <>
            {CronParser.toString(variables[variable], {
              throwExceptionOnParseError: false,
              verbose: true,
            })}{" "}
            UTC
          </>
        )}
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
