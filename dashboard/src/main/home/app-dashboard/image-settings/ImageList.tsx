import React, { useState } from "react";
import styled from "styled-components";

import { integrationList } from "shared/common";
import addCircle from "assets/add-circle.png";
import Loading from "components/Loading";
import { ImageType } from "./types";
import SearchBar from "components/SearchBar";
import Link from "components/porter/Link";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";

type Props = {
  loading: boolean;
  images: ImageType[];
  setSelectedImage: (x: ImageType) => void;
};

const ImageList: React.FC<Props> = ({
  setSelectedImage,
  loading,
  images,
}) => {
  const [error, setError] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");

  const renderImageList = () => {
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (error) {
      return <LoadingWrapper>Error loading images</LoadingWrapper>;
    } else if (images.length === 0 && !searchFilter) {
      return <LoadingWrapper>
        <Text color="helper">No linked images found.</Text>
        <Spacer y={0.5} />
        <div>
          <Link to={"/integrations/registry"}>Configure linked image registries</Link>, or provide the URL of a public image (e.g. "nginx") to continue.
        </div>
      </LoadingWrapper>;
    }

    const sortedImages = searchFilter
      ? images
        .filter((img) =>
          img.uri.toLowerCase().includes(searchFilter.toLowerCase())
        )
        .sort((a, b) => {
          const aIndex = a.uri.toLowerCase().indexOf(searchFilter.toLowerCase());
          const bIndex = b.uri.toLowerCase().indexOf(searchFilter.toLowerCase());
          return aIndex - bIndex;
        })
      : images.sort((a, b) => {
        return (
          new Date(b.created_at ?? "").getTime() -
          new Date(a.created_at ?? "").getTime()
        );
      });

    const imageCards = sortedImages.map((image: ImageType, i: number) => {
      return (
        <ImageItem
          key={i}
          onClick={() => {
            setSelectedImage(image);
          }}
        >
          <img src={integrationList["dockerhub"].icon} />
          {image.uri}
        </ImageItem>
      );
    });
    if (searchFilter !== "" && !images.some((image) => image.uri === searchFilter)) {
      imageCards.push(
        <ImageItem
          key={images.length}
          onClick={() => {
            setSelectedImage({
              uri: searchFilter,
              name: searchFilter,
              registry_id: 0,
            });
          }}
        >
          <img src={addCircle} />
          {`Use image URL: \"${searchFilter}\"`}
        </ImageItem>
      );
    }
    return imageCards;
  };

  return (
    <>
      <SearchBar
        setSearchFilter={setSearchFilter}
        disabled={error || loading}
        prompt={"Search images..."}
      />
      <ExpandedWrapper>
        {renderImageList()}
      </ExpandedWrapper>
    </>
  );
};

export default ImageList;

const ImageItem = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid #606166;
  color: #ffffff;
  align-items: center;
  padding: 10px 0px;
  user-select: text;
  cursor: text;
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 13px;
  justify-content: center;
  user-select: text;
  color: #aaaabb;
  cursor: text;
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  background: #ffffff11;
  overflow-y: auto;
`;


