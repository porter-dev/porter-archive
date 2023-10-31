
import React from "react";
import Modal from "components/porter/Modal";

import Text from "components/porter/Text";

import Spacer from "components/porter/Spacer";
import Step from "components/porter/Step";
import Link from "components/porter/Link";

type Props = {
    setModalVisible: (x: boolean) => void;
};

const SmartOptModal: React.FC<Props> = ({
    setModalVisible,
}) => {
    return (
        <Modal closeModal={() => setModalVisible(false)} width={"800px"}>
            <Text size={16}>Resource Optimization on Porter</Text>
            <Spacer y={1} />
            <Text color="helper">
                Smart Optimization ensures that your app runs smoothly while minimizing costs. Smart Optimization performs the following:
            </Text>
            <Spacer y={1} />
            <Step number={1}>
                Maintains a consistent ratio between RAM and CPU based on the instance type.
            </Step>
            <Spacer y={1} />
            <Step number={2}>
                Enforces limits so that your app does not consume resources beyond the instance type's limits.
            </Step>
            <Spacer y={1} />
            <Step number={3}> Determines an optimal resource threshold to save cost.</Step>
            <Spacer y={1} />

            <Text color="helper">
                Turning off Smart Optimization will allow you to specify your own resource values. This is not recommended unless you are familiar with Kubernetes resource management.
            </Text>
            <Spacer y={1} />
            <Text color="helper">
                <Link to="https://docs.porter.run/other/kubernetes-101" target="_blank">
                    For more information about Kubernetes resource management, visit our docs.
                </Link>
            </Text>

        </Modal>
    );
};
export default SmartOptModal;
