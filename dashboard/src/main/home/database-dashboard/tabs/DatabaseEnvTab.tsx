import KeyValueArray from "components/form-components/KeyValueArray";
import EnvGroupArray from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import key from "assets/key.svg";
import TitleSection from "components/TitleSection";
import Spacer from "components/porter/Spacer";
import DynamicLink from "components/DynamicLink";
import Text from "components/porter/Text";
import Icon from "components/porter/Icon";

type Props = {
    envData: any;
};

export type KeyValueType = {
    key: string;
    value: string;
    hidden: boolean;
    locked: boolean;
    deleted: boolean;
};

const EnvTab: React.FC<Props> = ({ envData
}) => {
    const [keyValues, setKeyValues] = useState<KeyValueType[]>([]);

    useEffect(() => {
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

        setKeyValues(keys)
    }, []);

    return (
        <StyledTemplateComponent>


            <TabWrapper>
                <InnerWrapper>
                    <Icon src={key} />
                    <Text size={16}> {envData?.name}</Text>
                    <EnvGroupArray
                        values={keyValues}
                        setValues={(x: any) => {
                            setKeyValues(x);
                        }}
                        fileUpload={true}
                        secretOption={true}
                        disabled={
                            true
                        }
                    />

                </InnerWrapper>
            </TabWrapper>
            {envData?.linked_applications.map((appName: string) => {
                return (
                    <StyledCard>
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

export default EnvTab;

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

const TabWrapper = styled.div`
height: 100%;
width: 100%;
padding-bottom: 65px;
overflow: hidden;
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