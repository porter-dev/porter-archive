import Button from "components/porter/Button";
import Checkbox from "components/porter/Checkbox";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import React, { useState } from "react";
import styled from "styled-components";

type Props = {
    closeModal: () => void;
    githubWorkflowFilename: string;
    deleteApplication: (deleteWorkflowFile?: boolean) => void;
};

const GithubActionModal: React.FC<Props> = ({
    closeModal,
    githubWorkflowFilename,
    deleteApplication,
}) => {
    const [deleteGithubWorkflow, setDeleteGithubWorkflow] = useState(true);

    const renderDeleteGithubWorkflowText = () => {
        if (githubWorkflowFilename === "") {
            return null;
        }
        return (
            <>
                <Checkbox
                    checked={deleteGithubWorkflow}
                    toggleChecked={() => setDeleteGithubWorkflow(!deleteGithubWorkflow)}
                >
                    <Text color="helper">
                        Open a PR to delete this application's associated CI file (<Code>{githubWorkflowFilename}</Code>) from my repository upon deletion.
                    </Text>
                </Checkbox>
                <Spacer y={1} />
            </>
        )
    }

    return (
        <Modal closeModal={closeModal}>
            <Text size={16}>
                Confirm deletion
            </Text>
            <Spacer y={1} />
            <Text color="helper">Click the button below to confirm deletion. This action is irreversible.</Text>
            <Spacer y={1} />
            {renderDeleteGithubWorkflowText()}
            <Button
                onClick={() => deleteApplication(deleteGithubWorkflow)}
                color="#b91133"
            >
                Delete
            </Button>
        </Modal>
    );
};

export default GithubActionModal;

const Code = styled.span`
  font-family: monospace;
`;