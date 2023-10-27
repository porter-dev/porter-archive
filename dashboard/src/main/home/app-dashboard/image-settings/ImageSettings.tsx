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
import { ImageType, imageValidator } from "./types";

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
    const resp = useQuery(
        ["getImages", projectId],
        async () => {
            const res = await api.images("<token>", {}, { project_id: projectId });
            return await z.object({ images: z.array(imageValidator) }).parseAsync(res.data);
        },
        {
            refetchOnWindowFocus: false,
        }
    );
    
    useEffect(() => {
        if (resp.isSuccess) {
            const images = resp.data.images;
            setImages(images);
            if (imageUri) {
                setSelectedImage(images.find((image) => image.uri === imageUri));
            }
        }
    }, [resp]);

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
                            loading={resp.isLoading}
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
                    {imageTag ? (
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
                    ) : (
                        <>
                            <Text color="helper">Specify your image tag.</Text>
                            <Spacer y={0.5} />
                            <ExpandedWrapper>
                                <TagList
                                    selectedImage={selectedImage}
                                    setSelectedTag={setImageTag}
                                />
                            </ExpandedWrapper>
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
