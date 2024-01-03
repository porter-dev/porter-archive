import React from "react";
import styled, { keyframes } from "styled-components";

import CopyToClipboard from "components/CopyToClipboard";
import DynamicLink from "components/DynamicLink";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import EnvGroupArray from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import { DatastoreEnvWithSource } from "../types";

import copy from "assets/copy-left.svg";

type Props = {
    envData: DatastoreEnvWithSource;
    connectionString?: string;
};

export type KeyValueType = {
    key: string;
    value: string;
    hidden: boolean;
    locked: boolean;
    deleted: boolean;
};

const DatabaseEnvTab: React.FC<Props> = ({ envData, connectionString
}) => {

    const setKeys = (): KeyValueType[] => {
        // Do something
        // Adding normal variables
        const keys: KeyValueType[] = [];
        if (envData != null) {
            Object.entries(envData?.variables).forEach(([key, value]) => {
                keys.push({ key, value, hidden: false, locked: false, deleted: false });
            });

            // Adding secret variables with locked set to true
            Object.entries(envData?.secret_variables).forEach(([key, value]) => {
                keys.push({ key, value, hidden: false, locked: true, deleted: false });
            });
        }

        return (keys)

    }

    return (
        <StyledTemplateComponent>
            <Text size={16}> Env Group </Text>
            <Spacer y={.5} />
            <Text size={14} color="helper"> {envData?.name}</Text>
            <EnvGroupArray
                values={setKeys()}
                setValues={(x: any) => {
                    setKeyValues(x);
                }}
                fileUpload={true}
                secretOption={true}
                disabled={
                    true
                }
            />
            <Spacer y={1} />
            {
                connectionString &&
                <>
                    <Text size={16}>Connection String</Text>
                    <Spacer y={.5} />
                    <IdContainer>
                        <ConnectionContainer>

                            <IconWithName>Connection String: </IconWithName>
                            <CopyContainer>
                                <IdText> {connectionString}</IdText>
                                <CopyToClipboard text={connectionString.toString()}>
                                    <CopyIcon src={copy} alt="copy" />
                                </CopyToClipboard>
                            </CopyContainer>
                        </ConnectionContainer>
                    </IdContainer>
                    <Spacer y={1} />
                </>

            }

            {envData?.linked_applications &&
                <><Text size={16}> Linked Applications</Text><Spacer y={.5} /></>
            }

            {envData?.linked_applications.map((appName: string, i: number) => {
                return (
                    <StyledCard key={i}>
                        <Flex>
                            <ContentContainer>
                                <EventInformation>
                                    <EventName>{appName}</EventName>
                                </EventInformation>
                            </ContentContainer>
                            <ActionContainer>

                                <ActionButton
                                    to={`/apps/${appName}`}
                                    target="_blank"
                                >
                                    <span className="material-icons-outlined">open_in_new</span>
                                </ActionButton>

                            </ActionContainer>
                        </Flex>
                    </StyledCard>)
            }
            )}
        </StyledTemplateComponent>
    );
};

export default DatabaseEnvTab;

const StyledTemplateComponent = styled.div`
width: 100%;
animation: fadeIn 0.3s 0s;
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StyledCard = styled.div`
  border-radius: 8px;
  padding: 10px 18px;
  overflow: hidden;
  font-size: 13px;
  animation: ${fadeIn} 0.5s;

  background: #2b2e3699;
  margin-bottom: 15px;
  overflow: hidden;
  border: 1px solid #ffffff0a;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const ActionButton = styled(DynamicLink)`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  border: 1px solid #ffffff00;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff44;
  }

  > span {
    font-size: 20px;
  }
`;

const IdContainer = styled.div`
    color: #aaaabb;
    border-radius: 5px;
    padding: 5px;
    padding-left: 10px;
    display: block;
    width: 100%;
    border-radius: 5px;
    background: ${(props) => props.theme.fg};
    border: 1px solid ${({ theme }) => theme.border};
    margin-bottom: 10px;
`;

const ConnectionContainer = styled.div`
  padding: 5px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const IconWithName = styled.span`
  font-size: 0.8em;
  margin-left: 10px;
`;

const CopyContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;

const IdText = styled.span`
  font-size: 0.8em;
  margin-right: 5px;
`;

const CopyIcon = styled.img`
  cursor: pointer;
  margin-left: 5px;
  margin-right: 5px;
  width: 10px;
  height: 10px;
`;