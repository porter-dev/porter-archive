import React from "react";

import ClickToCopy from "components/porter/ClickToCopy";
import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  DATASTORE_TYPE_ELASTICACHE,
  type DatastoreConnectionInfo,
  type DatastoreType,
} from "lib/databases/types";

import { Blur, RevealButton } from "../forms/DatabaseForm";

type Props = {
  connectionInfo: DatastoreConnectionInfo;
  type: DatastoreType;
};
const ConnectionInfo: React.FC<Props> = ({ connectionInfo, type }) => {
  const [isPasswordHidden, setIsPasswordHidden] = React.useState<boolean>(true);

  return (
    <Fieldset>
      <Text>Host</Text>
      <Spacer y={0.2} />
      <ClickToCopy color="helper">{connectionInfo.host}</ClickToCopy>
      <Spacer y={0.5} />
      <Text>Port</Text>
      <Spacer y={0.2} />
      <ClickToCopy color="helper">{connectionInfo.port.toString()}</ClickToCopy>
      <Spacer y={0.5} />
      {type === DATASTORE_TYPE_ELASTICACHE ? (
        <>
          <Text>Auth token</Text>
          <Spacer y={0.2} />
          <Container row>
            {isPasswordHidden ? (
              <>
                <Blur>{connectionInfo.password}</Blur>
                <Spacer inline width="10px" />
                <RevealButton
                  onClick={() => {
                    setIsPasswordHidden(false);
                  }}
                >
                  Reveal
                </RevealButton>
              </>
            ) : (
              <>
                <ClickToCopy color="helper">
                  {connectionInfo.password}
                </ClickToCopy>
                <Spacer inline width="10px" />
                <RevealButton
                  onClick={() => {
                    setIsPasswordHidden(true);
                  }}
                >
                  Hide
                </RevealButton>
              </>
            )}
          </Container>
        </>
      ) : (
        <>
          <Text>Database name</Text>
          <Spacer y={0.2} />
          <ClickToCopy color="helper">
            {connectionInfo.database_name}
          </ClickToCopy>
          <Spacer y={0.5} />
          <Text>Username</Text>
          <Spacer y={0.2} />
          <ClickToCopy color="helper">{connectionInfo.username}</ClickToCopy>
          <Spacer y={0.5} />
          <Text>Password</Text>
          <Spacer y={0.2} />
          <Container row>
            {isPasswordHidden ? (
              <>
                <Blur>{connectionInfo.password}</Blur>
                <Spacer inline width="10px" />
                <RevealButton
                  onClick={() => {
                    setIsPasswordHidden(false);
                  }}
                >
                  Reveal
                </RevealButton>
              </>
            ) : (
              <>
                <ClickToCopy color="helper">
                  {connectionInfo.password}
                </ClickToCopy>
                <Spacer inline width="10px" />
                <RevealButton
                  onClick={() => {
                    setIsPasswordHidden(true);
                  }}
                >
                  Hide
                </RevealButton>
              </>
            )}
          </Container>
        </>
      )}
    </Fieldset>
  );
};

export default ConnectionInfo;
