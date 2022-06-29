import SelectRow from "components/form-components/SelectRow";
import SearchSelector from "components/SearchSelector";
import Selector from "components/Selector";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { useOutsideAlerter } from "shared/hooks/useOutsideAlerter";
import styled from "styled-components";
import { proxy, useSnapshot } from "valtio";
import { SourceConfig } from "../../types";
import Select from "./Select";

const SourceEditorDocker = ({
  sourceConfig,
  onChange,
  readOnly = false,
}: {
  readOnly: boolean;
  sourceConfig: SourceConfig;
  onChange: (sourceConfig: SourceConfig) => void;
}) => {
  const [registry, setRegistry] = useState<DockerRegistry | null>(null);
  const [image, setImage] = useState<string | null>(
    () => sourceConfig.image_repo_uri
  );
  const [tag, setTag] = useState<string | null>(() => sourceConfig.image_tag);

  const imageName = useMemo(() => {
    if (!registry) {
      return "";
    }

    if (!image) {
      return "";
    }

    return image.replace(registry.url + "/", "");
  }, [image, registry]);

  useEffect(() => {
    if (sourceConfig.image_repo_uri) {
      setImage(sourceConfig.image_repo_uri);
      setTag(sourceConfig.image_tag);
    }
  }, [sourceConfig]);

  useEffect(() => {
    const newSourceConfig: SourceConfig = {
      ...sourceConfig,
      image_repo_uri: image,
      image_tag: tag,
    };

    onChange(newSourceConfig);
  }, [image, tag]);

  return (
    <>
      <SourceEditorDockerStlyes.RegistryWrapper>
        <_DockerRepositorySelector
          currentImageUrl={sourceConfig.image_repo_uri}
          value={registry}
          onChange={setRegistry}
          readOnly={readOnly}
        />
      </SourceEditorDockerStlyes.RegistryWrapper>
      {registry && (
        <SourceEditorDockerStlyes.ImageAndTagWrapper>
          <_ImageSelector
            registry={registry}
            value={image}
            onChange={setImage}
            readOnly={readOnly}
          />

          {registry && imageName && (
            <_TagSelector
              registry={registry}
              imageName={imageName}
              value={tag}
              onChange={setTag}
              readOnly={readOnly}
            />
          )}
        </SourceEditorDockerStlyes.ImageAndTagWrapper>
      )}
    </>
  );
};

type DockerRegistry = {
  id: number;
  project_id: number;
  name: string;
  url: string;
  service: string;
  infra_id: number;
  aws_integration_id: number;
};

const _DockerRepositorySelector = ({
  currentImageUrl,
  value,
  onChange,
  readOnly,
}: {
  currentImageUrl: string;
  value: DockerRegistry;
  onChange: (newRegistry: DockerRegistry) => void;
  readOnly: boolean;
}) => {
  const { currentProject } = useContext(Context);

  const [registries, setRegistries] = useState<DockerRegistry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getProjectRegistries<DockerRegistry[]>(
        "<token>",
        {},
        {
          id: currentProject.id,
        }
      )
      .then(({ data }) => {
        setRegistries(data);
        if (!value) {
          const currentRegistry = data.find((r) =>
            currentImageUrl.includes(r.url)
          );
          onChange(currentRegistry);
        }
        setIsLoading(false);
      });
  }, [currentImageUrl]);

  const handleChange = (newRegistry: DockerRegistry) => {
    onChange(newRegistry);
  };

  return (
    <>
      <Select
        value={value}
        options={registries}
        onChange={handleChange}
        accessor={(val) => val.name}
        label="Docker Registry"
        placeholder="Select a registry"
        isOptionEqualToValue={(a, b) => a?.url === b?.url}
        readOnly={readOnly}
        isLoading={isLoading}
        dropdown={{
          maxH: "200px",
        }}
      />
    </>
  );
};

type ImageRepo = {
  name: string;
  created_at: string;
  uri: string;
};

const _ImageSelector = ({
  registry,
  value,
  onChange,
  readOnly,
}: {
  registry: DockerRegistry;
  value: string;
  onChange: (newValue: string) => void;
  readOnly: boolean;
}) => {
  const { currentProject } = useContext(Context);

  const [images, setImages] = useState<ImageRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .getImageRepos<ImageRepo[]>(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          registry_id: registry.id,
        }
      )
      .then(({ data }) => {
        setImages(data);

        if (!value) {
          onChange(data[0].uri);
        }
        setIsLoading(false);
      });
  }, []);

  const handleChange = (image: string) => {
    onChange(image);
  };

  const displayName = (imageUrl: string) => {
    const image = images.find((i) => i.uri === imageUrl);
    if (!image) {
      return imageUrl;
    }
    return image.name;
  };

  return (
    <Select
      value={value}
      options={images.map((image) => image.uri)}
      accessor={displayName}
      label="Image"
      placeholder="Select an image"
      onChange={handleChange}
      isOptionEqualToValue={(a, b) => a === b}
      readOnly={readOnly}
      isLoading={isLoading}
      dropdown={{
        maxH: "200px",
      }}
    />
  );
};

type DockerImageTag = {
  digest: string;
  tag: string;
  manifest: string;
  repository_name: string;
  pushed_at: string;
};

const _TagSelector = ({
  registry,
  imageName,
  value,
  onChange,
  readOnly,
}: {
  registry: DockerRegistry;
  imageName: string;
  value: string;
  onChange: (newTag: string) => void;
  readOnly: boolean;
}) => {
  const { currentProject } = useContext(Context);
  const [imageTags, setImageTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .getImageTags<DockerImageTag[]>(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          registry_id: registry?.id,
          repo_name: imageName,
        }
      )
      .then(({ data }) => {
        if (!data?.length) {
          setImageTags([]);
          onChange("");
          setIsLoading(false);
          return;
        }

        const sortedTags = data.sort((a, b) => {
          const aDate = new Date(a.pushed_at);
          const bDate = new Date(b.pushed_at);
          return bDate.getTime() - aDate.getTime();
        });
        setImageTags(sortedTags.map((tag) => tag.tag));

        if (sortedTags.map((tag) => tag.tag).includes(value)) {
          onChange(value);
        } else {
          onChange(sortedTags[0].tag);
        }

        setIsLoading(false);
      });
  }, [registry, imageName]);

  const handleChange = (tag: string) => {
    onChange(tag);
  };

  return (
    <Select
      value={value}
      options={imageTags}
      accessor={(tag) => tag}
      label="Tag"
      placeholder="Select a tag"
      onChange={handleChange}
      readOnly={readOnly}
      isLoading={isLoading}
      dropdown={{
        maxH: "200px",
      }}
    />
  );
};

export default SourceEditorDocker;

const SourceEditorDockerStlyes = {
  RegistryWrapper: styled.div``,
  ImageAndTagWrapper: styled.div`
    display: grid;
    grid-template-columns: 3fr 1fr;
    grid-gap: 10px;
    align-items: center;
  `,
};
