import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "shared/api";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import styled from "styled-components";
import Input from "components/porter/Input";
import { z } from "zod";
import ImageList from "./ImageList";
import TagList from "./TagList";
import { ImageType } from "./types";

type Props = {
    projectId: number;
    imageUri: string;
    imageTag: string;
    setImageUri: (uri: string) => void;
    setImageTag: (tag: string) => void;
    resetImageInfo: () => void;
};

const ImageSettings: React.FC<Props> = ({
    projectId,
    imageUri,
    imageTag,
    setImageUri,
    setImageTag,
    resetImageInfo,
}) => {
    const [images, setImages] = useState<ImageType[]>([]);
    const [selectedImage, setSelectedImage] = useState<ImageType | undefined>(undefined);
    const { data: registries, isLoading: isLoadingRegistries } = useQuery(
        ["getProjectRegistries", projectId],
        async () => {
            const res = await api.getProjectRegistries("<token>", {}, { id: projectId });
            return await z.array(z.object({ id: z.number() })).parseAsync(res.data);
        },
        {
            refetchOnWindowFocus: false,
        }
    )

    const { data: imageResp, isLoading: isLoadingImages } = useQuery(
        ["getImages", projectId, imageTag, imageUri],
        async () => {
            if (registries == null) {
                return [];
            }
            return (await Promise.all(registries.map(async ({ id: registry_id }: { id: number }) => {
                const res = await api.getImageRepos("<token>", {}, {
                    project_id: projectId,
                    registry_id,
                });
                const parsed = await z.array(z.object({
                    uri: z.string(),
                    name: z.string(),
                })).parseAsync(res.data);
                return parsed.map(p => ({ ...p, registry_id }))
            }))).flat();
        },
        {
            enabled: !!registries,
            refetchOnWindowFocus: false,
        }
    );

    useEffect(() => {
        if (imageResp) {
            setImages(imageResp);
            if (imageUri) {
                setSelectedImage(imageResp.find((image) => image.uri === imageUri));
            }
        }
    }, [imageResp]);

    return (
        <div>
            <Text size={16}>Image settings</Text>
            <Spacer y={0.5} />
            {!imageUri && (
                <>
                    <Text color="helper">Specify your image URL.</Text>
                    <Spacer y={0.5} />
                    <ExpandedWrapper>
                        <ImageList
                            setSelectedImage={(image: ImageType) => {
                                setSelectedImage(image);
                                setImageUri(image.uri);
                            }}
                            images={images}
                            loading={isLoadingImages || isLoadingRegistries}
                        />
                    </ExpandedWrapper>
                    <DarkMatter antiHeight="-4px" />
                    <Spacer y={0.3} />
                </>
            )}

            {imageUri && (
                <>
                    <Input
                        disabled={true}
                        label="Image URL:"
                        width="100%"
                        value={selectedImage?.uri ?? imageUri}
                        setValue={() => { }}
                        placeholder=""
                    />
                    <BackButton
                        width="170px"
                        onClick={resetImageInfo}
                    >
                        <i className="material-icons">keyboard_backspace</i>
                        Select image URL
                    </BackButton>
                    <Spacer y={1} />
                    {!imageTag && (
                        <>
                            <Text color="helper">Specify your image tag.</Text>
                            <Spacer y={0.5} />
                            <ExpandedWrapper>
                                <TagList
                                    selectedImage={selectedImage}
                                    projectId={projectId}
                                    setSelectedTag={
                                        (tag: string) => {
                                            setImageTag(tag);
                                        }
                                    }
                                />
                            </ExpandedWrapper>
                        </>
                    )}
                    {imageTag && (
                        <>
                            <Input
                                disabled={true}
                                label="Image tag:"
                                type="text"
                                width="100%"
                                value={imageTag}
                                setValue={() => { }}
                                placeholder=""
                            />
                            <BackButton
                                width="170px"
                                onClick={() => {
                                    setImageTag("")
                                }}
                            >
                                <i className="material-icons">keyboard_backspace</i>
                                Select image tag
                            </BackButton>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default ImageSettings;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  max-height: 275px;
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22px;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  margin-bottom: -7px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
  }
  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
  }
`;

const StyledAdvancedBuildSettings = styled.div`
  color: ${({ showSettings }) => (showSettings ? "white" : "#aaaabb")};
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color: white;
  }
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  border-bottom-left-radius: ${({ showSettings }) => showSettings && "0px"};
  border-bottom-right-radius: ${({ showSettings }) => showSettings && "0px"};
  .dropdown {
    margin-right: 8px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: ${(props: { showSettings: boolean; isCurrent: boolean }) =>
        props.showSettings ? "" : "rotate(-90deg)"};
  }
`;

const AdvancedBuildTitle = styled.div`
  display: flex;
  align-items: center;
`;

const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 25px 35px 25px;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  border-top: 0px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
`;
