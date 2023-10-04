import React, { useContext, useState } from "react";
import Spacer from "components/porter/Spacer";
import Button from "components/porter/Button";
import Error from "components/porter/Error";
import styled from "styled-components";
import copy from "assets/copy-left.svg"
import CopyToClipboard from "components/CopyToClipboard";
import Link from "components/porter/Link";
import Text from "components/porter/Text";
import ImageSettings from "../image-settings/ImageSettings";
import { Context } from "shared/Context";
import { CreateUpdatePorterAppOptions } from "shared/types";
import { PorterApp } from "../types/porterApp";

type Props = {
    porterApp: PorterApp;
    updatePorterApp: (options: Partial<CreateUpdatePorterAppOptions>) => Promise<void>;
    setTempPorterApp: (app: PorterApp) => void;
}
const ImageSettingsTab: React.FC<Props> = ({
    porterApp,
    updatePorterApp,
    setTempPorterApp,
}) => {
    const { currentProject } = useContext(Context);

    const [buttonStatus, setButtonStatus] = useState<
        "loading" | "success" | string
    >("");

    const saveConfig = async () => {
        try {
            await updatePorterApp({});
        } catch (err) {
            console.log(err);
        }
    };

    const handleSave = async () => {
        setButtonStatus("loading");

        try {
            await saveConfig();
            setButtonStatus("success");
        } catch (error) {
            setButtonStatus("Something went wrong");
            console.log(error);
        }
    };

    return (
        <>
            <ImageSettings
                projectId={currentProject?.id ?? 0}
                imageUri={porterApp.image_info?.repository ?? ""}
                setImageUri={(uri: string) => setTempPorterApp({ ...porterApp, image_info: { ...porterApp.image_info, repository: uri } })}
                imageTag={porterApp.image_info?.tag ?? ""}
                setImageTag={(tag: string) => setTempPorterApp({ ...porterApp, image_info: { ...porterApp.image_info, tag: tag } })}
                resetImageInfo={() => setTempPorterApp({ ...porterApp, image_info: { ...porterApp.image_info, repository: "", tag: "" } })}
            />
            <Spacer y={1} />
            <Button
                type="button"
                status={buttonStatus}
                disabled={!porterApp.image_info?.repository || !porterApp.image_info?.tag}
                onClick={handleSave}
            >
                Save image settings
            </Button>
            <Spacer y={1} />
            <Text size={16}>Update command</Text>
            <Spacer y={0.5} />
            <Text color="helper">If you have the <Link to="https://docs.porter.run/standard/cli/command-reference/porter-update" target="_blank"><Text>Porter CLI</Text></Link> installed, you can update your application image tag by running the following command: </Text>
            <Spacer y={0.5} />
            <IdContainer>
                <Code>{`$ porter app update-tag ${porterApp.name} --tag latest`}</Code>
                <CopyContainer>
                    <CopyToClipboard text={`porter app update-tag ${porterApp.name} --tag latest`}>
                        <CopyIcon src={copy} alt="copy" />
                    </CopyToClipboard>
                </CopyContainer>
            </IdContainer>
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