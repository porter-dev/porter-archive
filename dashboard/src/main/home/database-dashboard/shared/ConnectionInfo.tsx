import React from "react";

import ClickToCopy from "components/porter/ClickToCopy";
import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  type DatastoreConnectionInfo,
  type DatastoreEngine,
} from "lib/databases/types";

import { DATASTORE_ENGINE_REDIS } from "../constants";
import { Blur, RevealButton } from "../forms/DatabaseForm";

type Props = {
  connectionInfo: DatastoreConnectionInfo;
  engine: DatastoreEngine;
};
const ConnectionInfo: React.FC<Props> = ({ connectionInfo, engine }) => {
  const [isPasswordHidden, setIsPasswordHidden] = React.useState<boolean>(true);

  return (
    <Fieldset>
      <table style={{ borderSpacing: "5px" }}>
        <tbody>
          <tr>
            <td>
              <Text>Host</Text>
            </td>
            <td>
              <ClickToCopy color="helper">{connectionInfo.host}</ClickToCopy>
            </td>
          </tr>
          <tr>
            <td>
              <Text>Port</Text>
            </td>
            <td>
              <ClickToCopy color="helper">
                {connectionInfo.port.toString()}
              </ClickToCopy>
            </td>
          </tr>
          {engine === DATASTORE_ENGINE_REDIS ? (
            <tr>
              <td>
                <Text>Auth token</Text>
              </td>
              <td>
                {isPasswordHidden ? (
                  <Container row>
                    <Blur>{connectionInfo.password}</Blur>
                    <Spacer inline width="10px" />
                    <RevealButton
                      onClick={() => {
                        setIsPasswordHidden(false);
                      }}
                    >
                      Reveal
                    </RevealButton>
                  </Container>
                ) : (
                  <Container row>
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
                  </Container>
                )}
              </td>
            </tr>
          ) : (
            <>
              <tr>
                <td>
                  <Text>Database name</Text>
                </td>
                <td>
                  <ClickToCopy color="helper">
                    {connectionInfo.database_name}
                  </ClickToCopy>
                </td>
              </tr>
              <tr>
                <td>
                  <Text>Username</Text>
                </td>
                <td>
                  <ClickToCopy color="helper">
                    {connectionInfo.username}
                  </ClickToCopy>
                </td>
              </tr>
              <tr>
                <td>
                  <Text>Password</Text>
                </td>
                <td>
                  {isPasswordHidden ? (
                    <Container row>
                      <Blur>{connectionInfo.password}</Blur>
                      <Spacer inline width="10px" />
                      <RevealButton
                        onClick={() => {
                          setIsPasswordHidden(false);
                        }}
                      >
                        Reveal
                      </RevealButton>
                    </Container>
                  ) : (
                    <Container row>
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
                    </Container>
                  )}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </Fieldset>
  );
};

export default ConnectionInfo;
