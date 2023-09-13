import React, { useState } from "react";
import styled from "styled-components";

import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import Input from "components/porter/Input";
import Button from "components/porter/Button";

type Props = {
    close: () => void;
    setPorterYamlPath: (path: string) => void;
    porterYamlPath: string;
}

const PorterYamlModal: React.FC<Props> = ({ close, setPorterYamlPath, porterYamlPath }) => {
    const [possiblePorterYamlPath, setPossiblePorterYamlPath] = useState<string>("");
    const [showModal, setShowModal] = useState<boolean>(true);

    return showModal ? (
        <Modal closeModal={() => setShowModal(false)}>
            <div>
                <Text size={16}>No <Code>porter.yaml</Code> detected at <Code>{porterYamlPath}</Code></Text>
                <Spacer y={0.5} />
                <span>
                    <Text color="helper">
                        We were unable to find a <Code>porter.yaml</Code> file in your repository.
                    </Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                        Although not required, we
                        recommend that you add a <Code>porter.yaml</Code> file to the root of your repository,
                        or you may specify its path here.
                    </Text>
                    <Spacer y={0.5} />
                    <Link
                        to="https://docs.porter.run/standard/deploying-applications/writing-porter-yaml"
                        target="_blank"
                        hasunderline
                    >
                        Using porter.yaml
                    </Link>
                </span>
            </div>
            <Spacer y={0.5} />
            <Text color="helper">Path to <Code>porter.yaml</Code> from repository root (i.e. starting with ./):</Text>
            <Spacer y={0.5} />
            <Input
                disabled={false}
                placeholder="ex: ./subdirectory/porter.yaml"
                value={possiblePorterYamlPath}
                width="100%"
                setValue={setPossiblePorterYamlPath}
            />
            <Spacer y={1} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Button
                    onClick={close}
                    color="#ffffff11"
                >
                    Ignore
                </Button>
                <Button
                    onClick={() => {
                        setPorterYamlPath(possiblePorterYamlPath);
                        setShowModal(false);
                    }}
                    color="#616fee"
                >
                    Update path
                </Button>
            </div>
        </Modal>
    ) : null;
};

export default PorterYamlModal;

const Code = styled.span`
  font-family: monospace;
`;