import { ok } from "assert";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Container from "./Container";
import Text from "./Text";
import Spacer from "./Spacer";

type Props = {
  value: any;
  onChange: any;
};

const DictionaryEditor: React.FC<Props> = ({
  value,
  onChange,
}) => {
  const [rawEditor, setRawEditor] = useState<boolean>(true);
  const [savedValue, setSavedValue] = useState<any>(JSON.stringify(value, null, 2));
  const [rawValue, setRawValue] = useState<string>(JSON.stringify(value, null, 2));
  const [changesNotSaved, setChangesNotSaved] = useState<boolean>(false);
  const [isValidJSON, setIsValidJSON] = useState<boolean>(true);

  useEffect(() => {
    setSavedValue(JSON.stringify(value, null, 2));
  }, [value]);

  useEffect(() => {
    if (rawValue !== savedValue) {
      setChangesNotSaved(true);
    } else {
      setChangesNotSaved(false);
      setIsValidJSON(true);
    }
  }, [rawValue]);

  return (
    <>
      {rawEditor ? (
        <Div>
          <TextArea
            color={
              !isValidJSON ? "#ff385d" : (
                changesNotSaved ? "#f5cb42" : "#494b4f"
              )
            }
            value={rawValue}
            onChange={(e) => {
              setRawValue(e.target.value);
            }}
          />
          {changesNotSaved && (
            <Flex>
              <SaveButton onClick={() => {
                try {
                  const parsedValue = JSON.parse(rawValue);
                  setIsValidJSON(true);
                  onChange(parsedValue);
                  setChangesNotSaved(false);
                } catch (e) {
                  setIsValidJSON(false);
                }
              }}>
                Update
              </SaveButton>
              <Spacer width="10px" inline />
              {isValidJSON ? (
                <Text color="#f5cb42">Existing changes have not been saved.</Text>
              ) : (
                <Text color="#ff385d">Object is not valid.</Text>
              )}
            </Flex>
          )}
        </Div>
      ) : (
        <>
          {Object.keys(value).map((key: string, i: number) => {
            return <Block>{key}</Block>
          })}
        </>
      )}
    </>
  );
};

export default DictionaryEditor;

const Flex = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
`;

const Div = styled.div`
  display: flex;
  overflow: hidden;
  flex-direction: column;
  margin-bottom: 15px;
  max-width: calc(100% - 30px);
  width: 400px;
  background: #ffffff11;
  border: 1px solid ${props => props.color || "#494b4f"};
  border-radius: 5px;
`;

const SaveButton = styled.div`
  width: 60px;
  border-radius: 3px;
  height: 25px;
  background: #616FEEcc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TextArea = styled.textarea<{ color: string }>`
  height: 200px;
  background: #26292e;
  border: 0;
  color: #ffffff;
  padding: 10px;
  outline: none;
  resize: none;
  font-family: monospace;
`;

const Block = styled.div`
  width: 100%;
  padding: 10px;
  background: #26292e;
  border: 1px solid #494b4f;
  border-radius: 5px;
  margin-bottom: 5px;
`;

const StyledInput = styled.input<{
  width: string;
  height: string;
  hasError: boolean;
  disabled: boolean;
}>`
  height: ${(props) => props.height || "35px"};
  padding: 5px 10px;
  width: ${(props) => props.width || "200px"};
  color: ${(props) => (props.disabled ? "#aaaabb" : "#ffffff")};
  font-size: 13px;
  outline: none;
  border-radius: 5px;
  background: #26292e;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "")};

  border: 1px solid ${(props) => (props.hasError ? "#ff3b62" : "#494b4f")};
  ${(props) =>
    !props.disabled &&
    `
    :hover {
      border: 1px solid ${props.hasError ? "#ff3b62" : "#7a7b80"};
    }
  `}
`;
