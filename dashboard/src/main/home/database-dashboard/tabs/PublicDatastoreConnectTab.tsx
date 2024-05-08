import React, { useContext, useState } from "react";
import styled from "styled-components";

import Banner from "components/porter/Banner";
import Container from "components/porter/Container";
import ShowIntercomButton from "components/porter/ShowIntercomButton";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { Context } from "shared/Context";

import { useDatastoreContext } from "../DatabaseContextProvider";
import ConnectAppsModal from "../shared/ConnectAppsModal";
import ConnectionInfo from "../shared/ConnectionInfo";

// use this for external datastores that are publicly exposed like neon, upstash, etc.
const PublicDatastoreConnectTab: React.FC = () => {
  const { datastore } = useDatastoreContext();
  const { currentProject } = useContext(Context);
  const [showConnectAppsModal, setShowConnectAppsModal] = useState(false);

  if (datastore.credential.host === "") {
    return (
      <Banner
        type="error"
        suffix={
          <>
            <ShowIntercomButton
              message={"I need help retrieving credentials for my datastore."}
            >
              Talk to support
            </ShowIntercomButton>
          </>
        }
      >
        Error reaching your datastore for credentials. Please contact support.
        <Spacer inline width="5px" />
      </Banner>
    );
  }
  return (
    <ConnectTabContainer>
      <div
        style={{
          width: "100%",
          height: "100%",
          paddingRight: "10px",
        }}
      >
        <Container row>
          <Text size={16}>Connection info</Text>
        </Container>
        <Spacer y={0.5} />
        <ConnectionInfo
          connectionInfo={datastore.credential}
          template={datastore.template}
        />
        <Spacer y={0.5} />
        <Text color="helper">
          The datastore client of your application should use these credentials
          to create a connection.{" "}
        </Text>
        {!currentProject?.sandbox_enabled && (
          <>
            <Spacer y={1} />
            <ConnectAppButton
              onClick={() => {
                setShowConnectAppsModal(true);
              }}
            >
              <I className="material-icons add-icon">add</I>
              Inject these credentials into an app
            </ConnectAppButton>
            {showConnectAppsModal && (
              <ConnectAppsModal
                closeModal={() => {
                  setShowConnectAppsModal(false);
                }}
              />
            )}
          </>
        )}
      </div>
    </ConnectTabContainer>
  );
};

export default PublicDatastoreConnectTab;

const ConnectTabContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
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
