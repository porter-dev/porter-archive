import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import React, { useContext, useState } from "react";
import { isAlphanumeric } from "shared/common";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import EnvGroupArray, { KeyValueType } from "../../env-groups/EnvGroupArray";
import { SubmitButton } from "./components/styles";
import { StacksLaunchContext } from "./Store";

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

  const isDisabled = () =>
    !isAlphanumeric(name) || name === "" || !envVariables.length;

  const handleOnSubmit = () => {
    const variables = envVariables.filter((variable) => !variable.locked);
    const secret_variables = envVariables.filter((variable) => variable.locked);

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

  return (
    <>
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
        disabled={isDisabled()}
      />
    </>
  );
};

export default NewEnvGroup;

const Subtitle = styled.div`
  padding: 11px 0px 16px;
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
