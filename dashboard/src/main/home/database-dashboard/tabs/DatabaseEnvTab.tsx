import React from "react";
import styled from "styled-components";

import CopyToClipboard from "components/CopyToClipboard";
import Helper from "components/form-components/Helper";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import EnvGroupArray from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import { DatastoreEnvWithSource } from "../types";
import DatabaseLinkedApp from "./DatabaseLinkedApp";

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

  const renderLinkedApplications = (): JSX.Element => {
    if (envData.linked_applications.length === 0) {
      return <InnerWrapper>
        <Text size={16}> Linked Applications</Text><Spacer y={.5} />
        <Helper>
          No applications are linked to the &quot;{envData.name}&quot; env group.
        </Helper>
      </InnerWrapper>;
    }

    return <InnerWrapper>
      <Text size={16}> Linked Applications</Text><Spacer y={.5} />
      {envData.linked_applications.map((appName, index) => <DatabaseLinkedApp appName={appName} key={index}></DatabaseLinkedApp>)}
    </InnerWrapper>;
  }

  return (
    <StyledTemplateComponent>
      <InnerWrapper>
        <Text size={16}>Environment Variables</Text>
        <Helper>
          These environment variables are available to your applications once the &quot;{envData.name}&quot; env group is linked to your app.
        </Helper>
        <EnvGroupArray
            values={setKeys()}
            setValues={(_: any) => {}}
            fileUpload={true}
            secretOption={true}
            disabled={
                true
            }
        />
      </InnerWrapper>
      {
        connectionString &&
          <InnerWrapper>
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
          </InnerWrapper>
      }

      {renderLinkedApplications()}
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

const InnerWrapper = styled.div<{ full?: boolean }>`
  width: 100%;
  height: ${(props) => (props.full ? "100%" : "calc(100% - 65px)")};
  padding: 30px;
  padding-bottom: 15px;
  position: relative;
  overflow: auto;
  margin-bottom: 30px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
`;
