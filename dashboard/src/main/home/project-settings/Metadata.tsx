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

type Props = {
};

const Metadata: React.FC<Props> = ({
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { currentProject } = useContext(Context);
    const [clusters, setClusters] = useState<ClusterType[]>([]);
    const [registries, setRegistries] = useState<any[]>(null);
    // Add name as a property of the component
    const IdTextWithCopy = ({ id, name }: { id: number, name: string }) => (
        <IdContainer>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8em', marginRight: '10px' }}> {name}</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8em', marginRight: '5px' }}>Id: {id}</span>
                    <CopyToClipboard text={id.toString()}>
                        <img src={copy} alt="copy" style={{ cursor: "pointer", marginLeft: "5px", marginRight: "5px", width: "10px", height: "10px" }} />
                    </CopyToClipboard>
                </div>
            </div>
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
            <Text>Project Id: </Text>
            <IdTextWithCopy id={currentProject?.id} name={currentProject?.name} /> {/* Assuming currentProject has name field */}
            <Spacer y={1} />
            {clusters?.length > 0 && <>
                <Text>Cluster Ids:</Text>
                {clusters?.length > 0 &&
                    clusters.map((cluster, index) =>
                        <IdTextWithCopy key={index} id={cluster.id} name={cluster.name} />
                    )
                }
            </>
            }
            <Spacer y={1} />

            {registries?.length > 0 &&
                <>
                    <Text>Registry Ids:</Text>
                    {registries?.length > 0 &&
                        registries.map((registry, index) =>
                            <IdTextWithCopy key={index} id={registry.id} name={registry.name} />
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