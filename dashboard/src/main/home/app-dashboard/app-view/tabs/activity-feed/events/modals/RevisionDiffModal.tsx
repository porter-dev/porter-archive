import React, { useEffect, useState } from "react";
import Modal from "components/porter/Modal";
import Loading from "components/Loading";
import DiffViewer, { DiffMethod } from "react-diff-viewer";
import Spacer from "components/porter/Spacer";
import api from "shared/api";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

type Props = {
    close: () => void;
    base: {
        revisionId: string;
        revisionNumber: number;
    };
    changed: {
        revisionId: string;
        revisionNumber: number;
    };
    projectId: number;
    clusterId: number;
    appName: string;
};

const RevisionDiffModal: React.FC<Props> = ({
    base,
    changed,
    close,
    projectId,
    clusterId,
    appName,
}) => {
    const [baseYamlString, setBaseYamlString] = useState("");
    const [changedYamlString, setChangedYamlString] = useState("");

    const { data, isLoading } = useQuery(
        ["getRevisionYaml", JSON.stringify(base), JSON.stringify(changed)],
        async () => {
            const baseRes = await api.porterYamlFromRevision(
                "<token>",
                {},
                {
                    project_id: projectId,
                    cluster_id: clusterId,
                    revision_id: base.revisionId,
                    porter_app_name: appName,
                }
            );

            const changedRes = await api.porterYamlFromRevision(
                "<token>",
                {},
                {
                    project_id: projectId,
                    cluster_id: clusterId,
                    revision_id: changed.revisionId,
                    porter_app_name: appName,
                }
            );

            const parsedBase = z.object({ b64_porter_yaml: z.string() }).parse(baseRes.data);
            const decodedBase = atob(parsedBase.b64_porter_yaml);
            const parsedChanged = z.object({ b64_porter_yaml: z.string() }).parse(changedRes.data);
            const decodedChanged = atob(parsedChanged.b64_porter_yaml);
            return { base: decodedBase, changed: decodedChanged };
        },
        {
            refetchOnWindowFocus: false,
        }
    );
    useEffect(() => {
        if (data) {
            setBaseYamlString(data.base);
            setChangedYamlString(data.changed);
        }
    }, [data]);

    return (
        <>
            <Modal closeModal={close} width={"800px"}>
                <Spacer y={1} />
                {isLoading ? (
                    <Loading />
                ) : (
                    <>
                        {baseYamlString === changedYamlString && (
                            <div style={{ textAlign: "center" }}>
                                <h3>No changes found</h3>
                            </div>
                        )}
                        <DiffViewer
                            leftTitle={`Revision No. ${base.revisionNumber}`}
                            rightTitle={`Revision No. ${changed.revisionNumber}`}
                            oldValue={baseYamlString}
                            newValue={changedYamlString}
                            splitView={true}
                            hideLineNumbers={false}
                            useDarkTheme={true}
                            compareMethod={DiffMethod.TRIMMED_LINES}
                        />
                    </>
                )}
            </Modal>
        </>
    );
};

export default RevisionDiffModal;