import React, { useEffect, useState } from "react";
import { Autocomplete as MaterialAutocomplete } from "@material-ui/lab";
import styled from "styled-components";

type Props = {
  options: any[];
  defaultValue: any[];
  onChange: (values: any[]) => void;
};

const Autocomplete = ({ options, defaultValue, onChange }: Props) => {
  const [values, setValues] = useState(() => defaultValue || []);

  useEffect(() => {
    onChange(values);
  }, [values]);

  return (
    <MaterialAutocomplete
      multiple
      filterSelectedOptions
      options={options}
      onChange={(_, value, type, details) => {
        if (type === "create-option") {
          value.splice(value.length - 1, 1);
          setValues([...value, { name: details.option }]);
          return;
        }
        setValues(value);
      }}
      value={values}
      getOptionLabel={(option) => option.name}
      renderTags={(values, getChipProps) => {
        return values.map((val, index) => {
          // @ts-ignore
          const { onDelete, ...chipProps } = getChipProps({ index });

          return (
            <Tag {...chipProps} color={val.color}>
              <TagText>{val.name}</TagText>
              <i
                aria-role={"button"}
                className="material-icons"
                onClick={onDelete}
              >
                delete
              </i>
            </Tag>
          );
        });
      }}
      renderInput={(params) => {
        console.log(params);
        return (
          <>
            <InputWrapper ref={params.InputProps.ref}>
              <Input {...params.inputProps} />
            </InputWrapper>
            {params.InputProps.startAdornment}
          </>
        );
      }}
    ></MaterialAutocomplete>
  );
};

export default Autocomplete;

const Tag = styled.div<{ color: string }>`
  color: ${(props) => props.color || "inherit"};
  user-select: none;
  border: 1px solid black;
  border-radius: 15px;
  padding: 5px 10px;
  text-align: center;
  display: flex;
  align-items: center;
  font-size: 14px;
  background-color: ${(props) => props.color || "inherit"};
  margin-left: 10px;
  margin-top: 5px;
  margin-bottom: 5px;

  > .material-icons {
    font-size: 20px;
    margin-left: 5px;
    filter: invert(1);
    :hover {
      cursor: pointer;
    }
  }
`;

const TagText = styled.span`
  filter: invert(1);
`;

const InputWrapper = styled.div`
  display: flex;
  margin-bottom: -1px;
  align-items: center;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  background: #ffffff11;

  ${Tag} {
  }
`;

const Input = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  color: #ffffff;
  padding: 5px 10px;
  min-height: 35px;
  max-height: 45px;
`;
