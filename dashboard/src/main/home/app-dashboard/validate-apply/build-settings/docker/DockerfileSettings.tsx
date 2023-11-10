import React, { useState } from 'react';
import Text from "components/porter/Text";
import Spacer from 'components/porter/Spacer';
import { Controller, useFormContext } from 'react-hook-form';
import { PorterAppFormData } from 'lib/porter-apps';
import Input from 'components/porter/Input';
import FileSelector from '../FileSelector';
import styled from 'styled-components';
import Button from 'components/porter/Button';

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
    const { control, watch } = useFormContext<PorterAppFormData>();
    const [showFileSelector, setShowFileSelector] = useState<boolean>(false);

    const path = watch("app.build.dockerfile", "")

    return (
        <Controller
            name="app.build.dockerfile"
            control={control}
            render={({ field: { onChange } }) => (
                <div>
                    <Text>
                        Dockerfile path
                    </Text>
                    <Spacer y={0.5} />
                    <InputWrapper
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!showFileSelector) {
                                onChange("");
                                setShowFileSelector(true);
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
                        {showFileSelector &&
                            <Button
                                disabled={path === ""}
                                onClick={() => setShowFileSelector(false)}
                                color="#b91133"
                            >
                                Close
                            </Button>
                        }
                    </InputWrapper>
                    {showFileSelector && <div>
                        <Spacer y={0.5} />
                        <FileSelector 
                            projectId={projectId} 
                            repoId={repoId} 
                            repoOwner={repoOwner} 
                            repoName={repoName} 
                            branch={branch}
                            onFileSelect={(path: string) => onChange(`./${path}`)} 
                            isFileSelectable={(path: string) => path.includes("Dockerfile")}
                            headerText={"Select your Dockerfile:"}
                        />
                    </div>}
                </div>
            )}
        />
    );
};

export default DockerfileSettings;

const InputWrapper = styled.div`
    margin-bottom: -7px;
    width: 500px;
    display: flex;
    justify-content: space-between;
`;