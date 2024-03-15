import React from "react";
import styled from "styled-components";

import CopyToClipboard from "components/CopyToClipboard";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import copy from "assets/copy-left.svg";

import { useDatastoreContext } from "../DatabaseContextProvider";
import ConnectionInfo from "../shared/ConnectionInfo";

const ConnectTab: React.FC = () => {
  const { datastore } = useDatastoreContext();

  return (
    <CredentialsTabContainer>
      <Container row>
        <Text size={16}>Application connection</Text>
      </Container>
      {datastore.credential.host !== "" && (
        <>
          <Spacer y={0.5} />
          <Text color="helper">
            All apps deployed in your cluster can access the datastore using the
            following credentials:
          </Text>
          <Spacer y={0.5} />
          <ConnectionInfo
            connectionInfo={datastore.credential}
            type={datastore.template.type}
          />
          <Spacer y={0.5} />
          <Text color="warner">
            For security, access to the datastore is restricted - connection
            attempts from outside the cluster will not succeed.
          </Text>
          <Spacer y={0.5} />
          <Text color="helper">
            The datastore client of your application should use these
            credentials to create a connection.
          </Text>
          {datastore.template.type.name === "ELASTICACHE" && (
            <>
              <Spacer y={0.5} />
              <Text color="warner">
                Your datastore client must connect via SSL.
              </Text>
            </>
          )}
        </>
      )}
      <Spacer y={1} />
      <Text size={16}>Local connection</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        For local connection, you can create a temporary, secure tunnel to this
        datastore using the{" "}
        <Link
          to="https://docs.porter.run/standard/cli/command-reference/porter-datastore-connect"
          target="_blank"
        >
          <Text>Porter CLI</Text>
        </Link>
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

export default ConnectTab;

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
