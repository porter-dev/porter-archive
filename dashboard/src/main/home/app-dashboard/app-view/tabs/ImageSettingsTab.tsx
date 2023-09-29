import React, { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import { useLatestRevision } from "../LatestRevisionContext";
import Spacer from "components/porter/Spacer";
import Button from "components/porter/Button";
import Error from "components/porter/Error";
import { match } from "ts-pattern";
import styled from "styled-components";
import copy from "assets/copy-left.svg"
import CopyToClipboard from "components/CopyToClipboard";
import Link from "components/porter/Link";
import Text from "components/porter/Text";
import ImageSettings from "../../image-settings/ImageSettings";

const ImageSettingsTab: React.FC = () => {
    const {
        watch,
        formState: { isSubmitting, errors },
    } = useFormContext<PorterAppFormData>();
    const { projectId, latestRevision, latestProto } = useLatestRevision();

    const source = watch("source");

    const buttonStatus = useMemo(() => {
        if (isSubmitting) {
            return "loading";
        }

        if (Object.keys(errors).length > 0) {
            return <Error message="Unable to update app" />;
        }

        return "";
    }, [isSubmitting, errors]);

    return (
        <>
            {match(source)
                .with({ type: "docker-registry" }, (source) => (
                    <>
                        <ImageSettings
                            projectId={projectId}
                            source={source}
                        />
                        <Spacer y={1} />
                        <Button
                            type="submit"
                            status={buttonStatus}
                            disabled={
                                isSubmitting ||
                                latestRevision.status === "CREATED" ||
                                latestRevision.status === "AWAITING_BUILD_ARTIFACT"
                            }
                        >
                            Save image settings
                        </Button>
                        <Spacer y={1} />
                        <Text size={16}>Update command</Text>
                        <Spacer y={0.5} />
                        <Text color="helper">If you have the <Link to="https://docs.porter.run/standard/cli/command-reference/porter-update" target="_blank"><Text>Porter CLI</Text></Link> installed, you can update your application image tag by running the following command: </Text>
                        <Spacer y={0.5} />
                        <IdContainer>
                            <Code>{`$ porter app update-tag ${latestProto.name} --tag latest`}</Code>
                            <CopyContainer>
                                <CopyToClipboard text={`porter app update-tag ${latestProto.name} --tag latest`}>
                                    <CopyIcon src={copy} alt="copy" />
                                </CopyToClipboard>
                            </CopyContainer>
                        </IdContainer>
                    </>
                ))
                .otherwise(() => null)
            }
        </>
    );
};

export default ImageSettingsTab;

const Code = styled.span`
  font-family: monospace;
`;

const IdContainer = styled.div`
    background: #000000;  
    border-radius: 5px;
    padding: 10px;
    display: flex;
    width: 100%;
    border-radius: 5px;
    border: 1px solid ${({ theme }) => theme.border};
    align-items: center;
`;

const CopyContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;

const CopyIcon = styled.img`
  cursor: pointer;
  margin-left: 5px;
  margin-right: 5px;
  width: 15px;
  height: 15px;
  :hover {
    opacity: 0.8;
  }
`;