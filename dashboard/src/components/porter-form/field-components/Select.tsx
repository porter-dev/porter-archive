import React, { useContext } from "react";
import {
  CheckboxField,
  GetFinalVariablesFunction,
  SelectField,
  SelectFieldState,
} from "../types";
import Selector from "../../Selector";
import styled from "styled-components";
import useFormField from "../hooks/useFormField";
import { Context } from "../../../shared/Context";

const Select: React.FC<SelectField> = (props) => {
  const { currentCluster } = useContext(Context);
  const { variables, setVars } = useFormField<SelectFieldState>(props.id, {
    initVars: {
      [props.variable]: props.value
        ? props.value[0]
        : props.settings.default
        ? props.settings.default
        : props.settings.type == "provider"
        ? ({
            gke: "gcp",
            eks: "aws",
            doks: "do",
          } as Record<string, string>)[currentCluster.service] || "aws"
        : props.settings.options[0].value,
    },
  });

  const providerOptions = [
    { value: "aws", label: "Amazon Web Services (AWS)" },
    { value: "gcp", label: "Google Cloud Platform (GCP)" },
    { value: "do", label: "DigitalOcean" },
  ];

  return (
    <StyledSelectRow>
      <Label>{props.label}</Label>
      <SelectWrapper>
        <Selector
          activeValue={variables[props.variable]}
          setActiveValue={(val) => {
            setVars(() => {
              return {
                [props.variable]: val,
              };
            });
          }}
          options={
            props.settings.type == "provider"
              ? providerOptions
              : props.settings.options
          }
          dropdownLabel={props.dropdownLabel}
          width={props.width || "270px"}
          dropdownWidth={props.width}
          dropdownMaxHeight={props.dropdownMaxHeight}
        />
      </SelectWrapper>
    </StyledSelectRow>
  );
};

export default Select;

export const getFinalVariablesForSelect: GetFinalVariablesFunction = (
  vars,
  props: SelectField,
  state,
  context
) => {
  return vars[props.variable]
    ? {}
    : {
        [props.variable]: props.value
          ? props.value[0]
          : props.settings.default
          ? props.settings.default
          : props.settings.type == "provider"
          ? ({
              gke: "gcp",
              eks: "aws",
              doks: "do",
            } as Record<string, string>)[context.currentCluster.service] ||
            "aws"
          : props.settings.options[0].value,
      };
};

const SelectWrapper = styled.div``;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

const StyledSelectRow = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
`;
