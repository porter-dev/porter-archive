import React, { useEffect, useState } from "react";
import api from "shared/api";
import styled from "styled-components";

const RegistryImageList: React.FC<{
  project: {
    id: number;
    name: string;
  };
  registry_id: number;
}> = ({ project, registry_id }) => {
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

        setImageList(res.data);
      })
      .catch(console.error);
    return () => {};
  }, []);
  return (
    <ImageList>
      {imageList.map((data, i) => (
        <ImageRow isLast={i === imageList.length - 1}>
          Name{data.name}, timestamp: {data.created_at}, URI: {data.uri}
        </ImageRow>
      ))}
    </ImageList>
  );
};

export default RegistryImageList;

const ImageRow = styled.div<{ isLast?: boolean }>`
  width: 100%;
  height: 30px;
  border-bottom: ${props => props.isLast ? "" : "1px solid #aaaabb"};
`;

const ImageList = styled.div`
  border-radius: 5px;
  border: 1px solid #aaaabb;
  background: #ffffff11;
  margin: 25px 0 30px;
`;