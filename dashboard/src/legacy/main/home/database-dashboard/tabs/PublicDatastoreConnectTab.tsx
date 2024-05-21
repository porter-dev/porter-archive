import React from "react";
import Banner from "legacy/components/porter/Banner";
import Container from "legacy/components/porter/Container";
import ShowIntercomButton from "legacy/components/porter/ShowIntercomButton";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import styled from "styled-components";

import { useDatastoreContext } from "../DatabaseContextProvider";
import ConnectionInfo from "../shared/ConnectionInfo";

// use this for external datastores that are publicly exposed like neon, upstash, etc.
const PublicDatastoreConnectTab: React.FC = () => {
  const { datastore } = useDatastoreContext();

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
