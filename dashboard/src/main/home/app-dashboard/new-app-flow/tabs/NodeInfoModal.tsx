
import React, { useEffect, useRef, useState } from "react";
import Modal from "components/porter/Modal";

import Text from "components/porter/Text";

import Spacer from "components/porter/Spacer";
import Step from "components/porter/Step";
import Link from "components/porter/Link";

type Props = {
    setModalVisible: (x: boolean) => void;
};

const NodeInfoModal: React.FC<Props> = ({
    setModalVisible,
}) => {
    return (
        <Modal closeModal={() => setModalVisible(false)} width={"800px"}>
            <Text size={16}>Resource Optimization on Porter</Text>
            <Spacer y={1} />
            <Text color="helper">
                The marks represent values for your applications to run cost-efficiently on Porter.
            </Text>
            <Spacer y={1} />
            <Text color="helper">
                <Link to="https://docs.porter.run/other/kubernetes-101" target="_blank">
                    For more information about Kubernetes resource management visit our docs.
                </Link>
            </Text>

        </Modal>
    );
};
export default NodeInfoModal;
