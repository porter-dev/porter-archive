import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import github from "assets/github.png";

import { Context } from "../../../shared/Context";
import api from "../../../shared/api";
import Loading from "../../../components/Loading";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";

import TabSelector from "components/TabSelector";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import CopyToClipboard from "components/CopyToClipboard";
import copy from "assets/copy-left.svg"
import Icon from "components/porter/Icon";
import { ClusterType } from "shared/types";
import globe from "assets/globe.svg"
import infra from "assets/infra.png";
import gear from "assets/gear.svg"
type Props = {
};

const Metadata: React.FC<Props> = ({
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { currentProject } = useContext(Context);
    const [clusters, setClusters] = useState<ClusterType[]>([]);
    const [registries, setRegistries] = useState<any[]>(null);
    // Add name as a property of the component
    const IdTextWithCopy = ({ id, name, icon }: { id: number, name: string, icon: any }) => (
        <IdContainer>
            <Container>
                <Icon src={icon} height={"14px"} />
                <IconWithName>{name}</IconWithName>
                <CopyContainer>
                    <IdText>Id: {id}</IdText>
                    <CopyToClipboard text={id.toString()}>
                        <CopyIcon src={copy} alt="copy" />
                    </CopyToClipboard>
                </CopyContainer>
            </Container>
        </IdContainer>

    );


    useEffect(() => {
        if (currentProject) {
            const project_id = currentProject.id;

            api
                .getProjectRegistries("<token>", {}, { id: project_id })
                .then((res: any) => {
                    setRegistries(res.data);
                })
                .catch((err: any) => console.log(err));

            api
                .getClusters("<token>", {}, { id: currentProject?.id })
                .then((res) => {
                    if (res.data) {
                        let clusters = res.data;
                        clusters.sort((a: any, b: any) => a.id - b.id);
                        if (clusters.length > 0) {
                            let options = clusters.map((item: { name: any; vanity_name: string; }) => ({
                                label: (item.vanity_name ? item.vanity_name : item.name),
                                value: item.name
                            }));
                            setClusters(clusters);
                        }
                    }
                });
        }
    }, [currentProject]);

    return (
        <>
            <Text>Project</Text>
            <IdTextWithCopy id={currentProject?.id} name={currentProject?.name} icon={globe} /> {/* Assuming currentProject has name field */}
            <Spacer y={.5} />
            {clusters?.length > 0 && <>
                <Text>Clusters</Text>
                {clusters?.length > 0 &&
                    clusters.map((cluster, index) =>
                        <>
                            <IdTextWithCopy key={index} id={cluster.id} name={cluster.name} icon={infra} />
                        </>
                    )
                }
            </>
            }
            <Spacer y={.5} />

            {registries?.length > 0 &&
                <>
                    <Text>Registries</Text>
                    {registries?.length > 0 &&
                        registries.map((registry, index) =>
                            <>
                                <IdTextWithCopy key={index} id={registry.id} name={registry.name} icon={gear} />
                            </>
                        )
                    }
                </>}

        </>
    );
};

export default Metadata;

const IdContainer = styled.div`
    color: #aaaabb;
    border-radius: 5px;
    padding: 5px;
    display: block;
    width: 100%;
    border-radius: 5px;
    background: ${(props) => props.theme.fg};
    border: 1px solid ${({ theme }) => theme.border};
    margin-bottom: 10px;
    margin-top: 5px;
`;

// const BoxContainer = styled.div`
// color: #aaaabb;
// border-radius: 5px;
// background: ${({ theme }) => theme.fg}};
// border: 1px solid ${({ theme }) => theme.border};
// `;

const Container = styled.div`
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