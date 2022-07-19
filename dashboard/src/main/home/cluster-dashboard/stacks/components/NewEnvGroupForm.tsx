import DynamicLink from "components/DynamicLink";
import TitleSection from "components/TitleSection";
import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { BackButton, Polymer, SubmitButton } from "../launch/components/styles";
import sliders from "assets/sliders.svg";
import EnvGroupArray, { KeyValueType } from "../../env-groups/EnvGroupArray";
import Heading from "components/form-components/Heading";
import { isAlphanumeric } from "shared/common";
import InputRow from "components/form-components/InputRow";
import Helper from "components/form-components/Helper";

const envArrayToObject = (variables: KeyValueType[]) => {
  return variables.reduce<{ [key: string]: string }>((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
};

type ProcessedEnvVariables = ReturnType<typeof envArrayToObject>;

const NewEnvGroupForm = (props: {
  onSubmit: (newEnvGroup: {
    name: string;
    variables: ProcessedEnvVariables;
    secret_variables: ProcessedEnvVariables;
  }) => Promise<void>;
  onCancel: () => void;
}) => {
  const { onSubmit, onCancel } = props;

  const [name, setName] = useState("");
  const [envVariables, setEnvVariables] = useState<KeyValueType[]>([]);
  const [submitError, setSubmitError] = useState("");

  const handleOnSubmit = async () => {
    const variables = envVariables.filter(
      (variable) => !variable.locked && !variable.hidden
    );
    const secret_variables = envVariables.filter(
      (variable) => variable.locked || variable.hidden
    );

    try {
      await onSubmit({
        name: name,
        variables: envArrayToObject(variables),
        secret_variables: envArrayToObject(secret_variables),
      });
    } catch (error) {
      setSubmitError(error);
      return;
    }

    setName("");
    setEnvVariables([]);
    return;
  };

  const hasError = useMemo(() => {
    if (!isAlphanumeric(name) || name === "") {
      return { message: "Name cannot be empty." };
    }

    if (!envVariables.length) {
      return { message: "Please add at least one environment variable." };
    }

    if (envVariables.some((variable) => !variable.value || !variable.key)) {
      return { message: "Please fill in all environment variables." };
    }

    return null;
  }, [name, envVariables]);

  return (
    <>
      <TitleSection>
        <BackButton onClick={onCancel}>
          <i className="material-icons">keyboard_backspace</i>
        </BackButton>
        <Polymer>
          <SliderIcon src={sliders} />
        </Polymer>
        Add a Env Group to Stack
      </TitleSection>
      <Heading isAtTop={true}>Name</Heading>
      <Subtitle>
        <Warning
          makeFlush={true}
          highlight={!isAlphanumeric(name) && name !== ""}
        >
          Lowercase letters, numbers, and "-" only.
        </Warning>
      </Subtitle>
      <InputRow
        type="text"
        value={name}
        setValue={(x: string) => {
          setName(x);
        }}
        placeholder="ex: doctor-scientist"
        width="100%"
      />

      <Heading>Environment Variables</Heading>
      <Helper>
        Set environment variables for your secrets and environment-specific
        configuration.
      </Helper>
      <EnvGroupArray
        values={envVariables}
        setValues={(x: any) => setEnvVariables((prev) => [...x])}
        fileUpload={true}
        secretOption={true}
      />

      <SubmitButton
        onClick={handleOnSubmit}
        makeFlush
        clearPosition
        text="Save env group"
        disabled={!!hasError}
        statusPosition="left"
        status={hasError?.message || submitError || ""}
      />
    </>
  );
};

export default NewEnvGroupForm;

const SliderIcon = styled.img`
  width: 25px;
  margin-right: 16px;

  opacity: 0;
  animation: floatIn 0.5s 0.2s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const Subtitle = styled.div`
  padding: 11px 0px 0px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  line-height: 1.6em;
  display: flex;
  align-items: center;
`;

const Warning = styled.span<{ highlight: boolean; makeFlush?: boolean }>`
  color: ${(props) => (props.highlight ? "#f5cb42" : "")};
  margin-left: ${(props) => (props.makeFlush ? "" : "5px")};
`;
