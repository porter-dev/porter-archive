
import Icon from "components/porter/Icon";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { ClusterType } from "shared/types";
import styled from "styled-components";
import infra from "assets/infra.png";
import Text from "components/porter/Text";

type Props = {
    // clusters: ClusterType[];
    // setClusters: (x: ClusterType[]) => void;
    // options: any[];
};

const ClusterSelector: React.FC<Props> = ({
    // clusters,
    // setClusters,
    // options
}) => {


    const [options, setOptions] = useState<any[]>([]);
    //const [isExpanded, setIsExpanded] = useState(false);
    const context = useContext(Context);
    const [clusters, setClusters] = useState<ClusterType[]>([])
    const renderClusterSelector = () => {
        context.currentCluster?.vanity_name
        console.log("HERE")
        api
            .getClusters("<token>", {}, { id: context.currentProject?.id })
            .then((res) => {
                // TODO: handle uninitialized kubeconfig
                if (res.data) {
                    let clusters = res.data;
                    clusters.sort((a: any, b: any) => a.id - b.id);
                    if (clusters.length > 0) {
                        // Set cluster from URL if in path or param
                        let options = clusters.map((item: { name: any; vanity_name: string; }) => ({
                            label: (item.vanity_name ? item.vanity_name : item.name),
                            value: item.name
                        }));
                        setClusters(clusters)
                        setOptions(options)
                        // Set initial cluster as the first one

                    }
                }

            })
    }
    useEffect(() => {
        renderClusterSelector()
    }, []);
    return (
        <>
            {clusters?.length > 1 && (
                <>
                    <Spacer y={1} />
                    <div style={{ display: 'flex', alignItems: 'top', gap: '10px' }}>
                        {/* <Icon src={infra} height={"18px"} /> */}


                        {/* <Text size={12}>Toggle Cluster: </Text> */}
                        <Select
                            label={<>
                                <Text size={13}>Select Cluster:</Text>
                            </>}
                            options={options}
                            value={context.currentCluster?.name}
                            setValue={(name) => {
                                const cluster = clusters.find(c => c.name === name);
                                context.setCurrentCluster(cluster);
                            }}
                            width={"500px"}>
                        </Select>
                    </div>
                </>
            )
            }
        </>
    );
};

export default ClusterSelector;