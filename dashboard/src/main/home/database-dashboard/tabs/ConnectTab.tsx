import React, { useState } from "react";
import styled from "styled-components";

import CopyToClipboard from "components/CopyToClipboard";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import copy from "assets/copy-left.svg";

import { useDatastoreContext } from "../DatabaseContextProvider";
import ConnectAppsModal from "../shared/ConnectAppsModal";
import ConnectionInfo from "../shared/ConnectionInfo";

const ConnectTab: React.FC = () => {
  const { datastore } = useDatastoreContext();
  const [showConnectAppsModal, setShowConnectAppsModal] = useState(false);

  return (
    <ConnectTabContainer>
      <div
        style={{
          width: "100%",
          height: "100%",
          paddingRight: "10px",
          borderRight: "1px #aaaabb55 solid",
        }}
      >
        <Container row>
          <Text size={16}>Credentials</Text>
        </Container>
        {datastore.credential.host !== "" && (
          <>
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
              credentials to create a connection.{" "}
              {datastore.template.type.name === "ELASTICACHE" && (
                <Text color="warner">
                  The datastore client must connect via SSL.
                </Text>
              )}
            </Text>
            <Spacer y={1} />
            <ConnectAppButton
              onClick={() => {
                setShowConnectAppsModal(true);
              }}
            >
              <I className="material-icons add-icon">add</I>
              Inject credentials into an app
            </ConnectAppButton>
            {showConnectAppsModal && (
              <ConnectAppsModal
                closeModal={() => {
                  setShowConnectAppsModal(false);
                }}
                apps={[]}
                onSubmit={async () => {}}
              />
            )}
          </>
        )}
      </div>
      <div style={{ width: "100%", height: "100%", paddingLeft: "10px" }}>
        <Text size={16}>Local connection</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          For local connection, you can create a temporary, secure tunnel to
          this datastore using the{" "}
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
            <CopyToClipboard
              text={`porter datastore connect ${datastore.name}`}
            >
              <CopyIcon src={copy} alt="copy" />
            </CopyToClipboard>
          </CopyContainer>
        </IdContainer>
      </div>
    </ConnectTabContainer>
  );
};

export default ConnectTab;

const ConnectTabContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
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

const ConnectAppButton = styled.div`
  color: #aaaabb;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color: white;
  }
  display: flex;
  align-items: center;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  .add-icon {
    width: 30px;
    font-size: 20px;
  }
`;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 7px;
  justify-content: center;
`;
