import React, { useMemo } from "react";
import styled from "styled-components";

import CopyToClipboard from "components/CopyToClipboard";
import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import copy from "assets/copy-left.svg";

import { useDatastoreContext } from "../DatabaseContextProvider";

const CredentialsTab: React.FC = () => {
  const { datastore } = useDatastoreContext();

  const keyValues = useMemo(() => {
    const datastoreEnvEntries = Object.entries(datastore.env?.variables ?? {});
    const datastoreSecretEntries = Object.entries(
      datastore.env?.secret_variables ?? {}
    );
    const keyValues = [
      ...datastoreEnvEntries.map(([key, value]) => ({
        key,
        value,
        secret: false,
      })),
      ...datastoreSecretEntries.map(([key, value]) => ({
        key,
        value,
        secret: true,
      })),
    ];

    return keyValues;
  }, [datastore]);
  return (
    <CredentialsTabContainer>
      <Container row>
        <Text size={16}>Credentials</Text>
      </Container>
      {keyValues.length !== 0 && (
        <>
          <Spacer y={0.5} />
          <Text color="helper">
            Once an app is connected to this datastore, it has access to its
            credentials through the following environment variables:
          </Text>
          <StyledInputArray>
            {keyValues.map(
              (
                entry: { key: string; value: string; secret: boolean },
                i: number
              ) => {
                return (
                  <InputWrapper key={i}>
                    <Input
                      placeholder="ex: key"
                      width="120px"
                      value={entry.key}
                      setValue={() => ({})}
                      disabled={entry.secret}
                      disabledTooltip={"Stored as a secret on your cluster"}
                    />
                    <Spacer x={0.5} inline />
                    <Input
                      placeholder="ex: key"
                      width="500px"
                      value={entry.value}
                      setValue={() => ({})}
                      disabled={entry.secret}
                      disabledTooltip={"Stored as a secret on your cluster"}
                    />
                    {!entry.secret && (
                      <>
                        <Spacer x={0.5} inline />
                        <CopyToClipboard text={entry.value}>
                          <CopyIcon src={copy} alt="copy" />
                        </CopyToClipboard>
                      </>
                    )}
                  </InputWrapper>
                );
              }
            )}
          </StyledInputArray>
        </>
      )}
      <Spacer y={0.5} />
      <Text size={16}>Connect</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        If you have the{" "}
        <Link to="https://docs.porter.run/cli/installation" target="_blank">
          <Text>Porter CLI</Text>
        </Link>{" "}
        installed, you can connect to this datastore locally by running the
        following command:
      </Text>
      <Spacer y={0.5} />
      <IdContainer>
        <Code>{`$ porter datastore connect ${datastore.name}`}</Code>
        <CopyContainer>
          <CopyToClipboard text={`porter datastore connect ${datastore.name}`}>
            <CopyIcon src={copy} alt="copy" />
          </CopyToClipboard>
        </CopyContainer>
      </IdContainer>
    </CredentialsTabContainer>
  );
};

export default CredentialsTab;

const CredentialsTabContainer = styled.div`
  width: 100%;
`;

const IdContainer = styled.div`
  width: fit-content;
  background: #000000;
  border-radius: 5px;
  padding: 10px;
  display: flex;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.border};
  align-items: center;
`;

const CopyContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;

const CopyIcon = styled.img`
  cursor: pointer;
  margin-left: 5px;
  margin-right: 5px;
  width: 15px;
  height: 15px;
  :hover {
    opacity: 0.8;
  }
`;

const Code = styled.span`
  font-family: monospace;
`;

const StyledInputArray = styled.div`
  margin-bottom: 15px;
  margin-top: 22px;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
`;
