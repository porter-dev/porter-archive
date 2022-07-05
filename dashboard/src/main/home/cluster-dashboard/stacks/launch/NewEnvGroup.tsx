import DynamicLink from "components/DynamicLink";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import TitleSection from "components/TitleSection";
import React, { useContext, useMemo, useState } from "react";
import { isAlphanumeric } from "shared/common";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import EnvGroupArray, { KeyValueType } from "../../env-groups/EnvGroupArray";
import { BackButton, Icon, Polymer, SubmitButton } from "./components/styles";
import { StacksLaunchContext } from "./Store";
import sliders from "assets/sliders.svg";

const envArrayToObject = (variables: KeyValueType[]) => {
  return variables.reduce<{ [key: string]: string }>((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
};

const NewEnvGroup = () => {
  const { addEnvGroup } = useContext(StacksLaunchContext);
  const [name, setName] = useState("");
  const [envVariables, setEnvVariables] = useState<KeyValueType[]>([]);

  const { pushFiltered } = useRouting();

  const handleOnSubmit = () => {
    const variables = envVariables.filter(
      (variable) => !variable.locked && !variable.hidden
    );
    const secret_variables = envVariables.filter(
      (variable) => variable.locked || variable.hidden
    );

    addEnvGroup({
      name,
      variables: envArrayToObject(variables),
      secret_variables: envArrayToObject(secret_variables),
      linked_applications: [],
    });
    setName("");
    setEnvVariables([]);
    pushFiltered("/stacks/launch/overview", []);
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
        <DynamicLink to={`/stacks/launch/overview`}>
          <BackButton>
            <i className="material-icons">keyboard_backspace</i>
          </BackButton>
        </DynamicLink>
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
        status={hasError?.message || ""}
      />
    </>
  );
};

export default NewEnvGroup;

export const SliderIcon = styled.img`
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
