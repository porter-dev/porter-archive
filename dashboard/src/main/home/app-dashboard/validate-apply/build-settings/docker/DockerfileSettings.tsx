import React, { useState } from 'react';
import Text from "components/porter/Text";
import Spacer from 'components/porter/Spacer';
import { useFormContext } from 'react-hook-form';
import { PorterAppFormData } from 'lib/porter-apps';
import Input from 'components/porter/Input';
import FileSelector from '../FileSelector';
import styled from 'styled-components';

type Props = {
    projectId: number;
    repoId: number;
    repoOwner: string;
    repoName: string;
    branch: string;
}
const DockerfileSettings: React.FC<Props> = ({
    projectId,
    repoId,
    repoOwner,
    repoName,
    branch,
}) => {
    const { setValue, watch } = useFormContext<PorterAppFormData>();
    const [showFileSelector, setShowFileSelector] = useState<boolean>(false);

    const path = watch("app.build.dockerfile", "")

    return (
        <div>
            <Text color="helper">
                Dockerfile path (absolute path)
            </Text>
            <Spacer y={0.5} />
            <InputWrapper
                onClick={(e) => {
                    e.stopPropagation();
                    if (!showFileSelector) {
                        setValue("app.build.dockerfile", "");
                        setShowFileSelector(true);
                    } else {
                        setShowFileSelector(false);
                    }
                }}
            >
                <Input
                    width="300px"
                    placeholder="ex: ./Dockerfile"
                    value={path}
                    setValue={() => ({})}
                    hideCursor={true}
                />
            </InputWrapper>
            {showFileSelector && <FileSelector 
                projectId={projectId} 
                repoId={repoId} 
                repoOwner={repoOwner} 
                repoName={repoName} 
                branch={branch}
                onFileSelect={(path: string) => setValue("app.build.dockerfile", `./${path}`)} 
                isFileSelectable={(path: string) => path.includes("Dockerfile")}
            />}
        </div>
    );
};

export default DockerfileSettings;

const InputWrapper = styled.div`
    margin-bottom: -7px;
`;
