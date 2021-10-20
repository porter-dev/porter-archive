import React, { useEffect, useState } from "react";
import api from "shared/api";

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
    <div>
      {imageList.map((data) => (
        <div>
          Name{data.name}, timestamp: {data.created_at}, URI: {data.uri}
        </div>
      ))}
    </div>
  );
};

export default RegistryImageList;
