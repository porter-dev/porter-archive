import React, { useMemo } from "react";
import ClickToCopy from "legacy/components/porter/ClickToCopy";
import Container from "legacy/components/porter/Container";
import Fieldset from "legacy/components/porter/Fieldset";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import {
  DATASTORE_TYPE_ELASTICACHE,
  DATASTORE_TYPE_MANAGED_POSTGRES,
  DATASTORE_TYPE_MANAGED_REDIS,
  DATASTORE_TYPE_NEON,
  DATASTORE_TYPE_RDS,
  DATASTORE_TYPE_UPSTASH,
  type DatastoreConnectionInfo,
  type DatastoreTemplate,
} from "legacy/lib/databases/types";
import styled from "styled-components";
import { match } from "ts-pattern";

import {
  DATASTORE_ENGINE_POSTGRES,
  DATASTORE_ENGINE_REDIS,
} from "../constants";

type Props = {
  connectionInfo: DatastoreConnectionInfo;
  template: DatastoreTemplate;
};
const ConnectionInfo: React.FC<Props> = ({ connectionInfo, template }) => {
  const [isPasswordHidden, setIsPasswordHidden] = React.useState<boolean>(true);

  const connectionString = useMemo(() => {
    return match(template)
      .returnType<string>()
      .with({ highLevelType: DATASTORE_ENGINE_REDIS }, () =>
        match(template)
          .with(
            { type: DATASTORE_TYPE_ELASTICACHE },
            () =>
              `rediss://:${connectionInfo.password}@${connectionInfo.host}:${connectionInfo.port}/0?ssl_cert_reqs=CERT_REQUIRED`
          )
          .with(
            { type: DATASTORE_TYPE_UPSTASH },
            () =>
              `rediss://default:${connectionInfo.password}@${connectionInfo.host}:${connectionInfo.port}/0`
          )
          .with(
            { type: DATASTORE_TYPE_MANAGED_REDIS },
            () =>
              `redis://:${connectionInfo.password}@${connectionInfo.host}:${connectionInfo.port}/0`
          )
          .otherwise(() => "")
      )
      .with({ highLevelType: DATASTORE_ENGINE_POSTGRES }, () =>
        match(template)
          .with(
            { type: DATASTORE_TYPE_RDS },
            { type: DATASTORE_TYPE_NEON },
            () =>
              `postgres://${connectionInfo.username}:${connectionInfo.password}@${connectionInfo.host}:${connectionInfo.port}/${connectionInfo.database_name}?sslmode=require`
          )
          .with(
            { type: DATASTORE_TYPE_MANAGED_POSTGRES },
            () =>
              `postgres://${connectionInfo.username}:${connectionInfo.password}@${connectionInfo.host}:${connectionInfo.port}/${connectionInfo.database_name}`
          )
          .otherwise(() => "")
      )
      .otherwise(() => "");
  }, [template]);

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
          {template.highLevelType === DATASTORE_ENGINE_REDIS ? (
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
          {connectionString !== "" && (
            <tr>
              <td>
                <Text>Connection string</Text>
              </td>
              <td>
                {isPasswordHidden ? (
                  <Container row>
                    <Blur>{connectionString}</Blur>
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
                    <ClickToCopy color="helper">{connectionString}</ClickToCopy>
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
          )}
        </tbody>
      </table>
    </Fieldset>
  );
};

export default ConnectionInfo;

const RevealButton = styled.div`
  background: ${(props) => props.theme.fg};
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid #494b4f;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    filter: brightness(120%);
  }
`;

const Blur = styled.div`
  filter: blur(5px);
  -webkit-filter: blur(5px);
  position: relative;
  margin-left: -5px;
  font-family: monospace;
`;
