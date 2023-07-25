import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import DeleteApplicationModal from "./DeleteApplicationModal";

type Props = {
    appName: string;
    githubWorkflowFilename: string;
    deleteApplication: (deleteWorkflowFile?: boolean) => void;
};

const SettingsTab: React.FC<Props> = ({
    appName,
    githubWorkflowFilename,
    deleteApplication
}) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        // Do something
    }, []);

    return (
        <StyledSettingsTab>
            <Text size={16}>Delete "{appName}"</Text>
            <Spacer y={1} />
            <Text color="helper">
                Delete this application and all of its resources.
            </Text>
            <Spacer y={1} />
            <Button
                onClick={() => {
                    setIsDeleteModalOpen(true);
                }}
                color="#b91133"
            >
                Delete
            </Button>
            {isDeleteModalOpen &&
                <DeleteApplicationModal
                    closeModal={() => setIsDeleteModalOpen(false)}
                    githubWorkflowFilename={githubWorkflowFilename}
                    deleteApplication={deleteApplication}
                />
            }
        </StyledSettingsTab>
    );
};

export default SettingsTab;

const StyledSettingsTab = styled.div`
width: 100%;
`;