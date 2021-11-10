import React, { useEffect, useState } from "react";
import Helper from "components/form-components/Helper";
import api from "shared/api";
import styled from "styled-components";
import { integrationList } from "shared/common";

const RegistryImageList: React.FC<{
  project: {
    id: number;
    name: string;
  };
  registryType?: string;
  registry_id: number;
}> = ({ project, registry_id, registryType }) => {
  const [imageList, setImageList] = useState([]);

  useEffect(() => {
    api
      .getImageRepos(
        "<token>",
        {},
        {
          project_id: project.id,
          registry_id,
        }
      )
      .then((res) => {
        if (!res?.data) {
          throw new Error("No data found");
        }
        console.log(res.data);
        setImageList(res.data);
      })
      .catch(console.error);
    return () => {};
  }, []);

  const getIcon = () => {
    if (registryType) {
      return (
        integrationList[registryType] && integrationList[registryType].icon
      );
    } else {
      return integrationList["dockerhub"].icon;
    }
  };

  return (
    <>
      <Helper>Porter was able to successfully connect to your registry:</Helper>
      <ImageList>
        {imageList.length > 0 ? (
          imageList.map((data, i) => (
            <ImageRow isLast={i === imageList.length - 1}>
              <img src={getIcon()} />
              {data.uri}
            </ImageRow>
          ))
        ) : (
          <Placeholder>No container images found.</Placeholder>
        )}
      </ImageList>
      <Br />
    </>
  );
};

export default RegistryImageList;

const Placeholder = styled.div`
  width: 100%;
  height: 80px;
  color: #aaaabb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
`;

const Br = styled.div`
  width: 100%;
  height: 15px;
`;

const ImageRow = styled.div<{ isLast?: boolean }>`
  width: 100%;
  height: 40px;
  border-bottom: ${(props) => (props.isLast ? "" : "1px solid #aaaabb")};
  display: flex;
  align-items: center;
  font-size: 13px;
  padding: 12px;

  > img {
    width: 20px;
    filter: grayscale(100%);
    margin-right: 9px;
  }
`;

const ImageList = styled.div`
  border-radius: 5px;
  border: 1px solid #aaaabb;
  max-height: 300px;
  overflow-y: auto;
  background: #ffffff11;
  margin: 20px 0 20px;
`;
