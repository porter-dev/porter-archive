import KeyValueArray from "components/form-components/KeyValueArray";
import EnvGroupArray from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import key from "assets/key.svg";
import TitleSection from "components/TitleSection";

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