import SelectRow from "components/form-components/SelectRow";
import SearchSelector from "components/SearchSelector";
import Selector from "components/Selector";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { proxy, useSnapshot } from "valtio";
import { SourceConfig } from "../../types";

const SourceEditorDocker = ({
  sourceConfig,
  onChange,
}: {
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
    const newSourceConfig: SourceConfig = {
      ...sourceConfig,
      image_repo_uri: image,
      image_tag: tag,
    };

    onChange(newSourceConfig);
  }, [image, tag]);

  return (
    <>
      <_DockerRepositorySelector
        currentImageUrl={sourceConfig.image_repo_uri}
        value={registry}
        onChange={setRegistry}
      />
      {registry && (
        <_ImageSelector registry={registry} value={image} onChange={setImage} />
      )}
      {registry && imageName && (
        <_TagSelector
          registry={registry}
          imageName={imageName}
          value={tag}
          onChange={setTag}
        />
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
}: {
  currentImageUrl: string;
  value: DockerRegistry;
  onChange: (newRegistry: DockerRegistry) => void;
}) => {
  const { currentProject } = useContext(Context);

  const [registries, setRegistries] = useState<DockerRegistry[]>([]);

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
      });
  }, []);

  const registryOptions = registries.map((registry) => {
    return {
      value: registry.url,
      label: registry.name,
    };
  });

  const handleChange = (registryUrl: string) => {
    const registry = registries.find(
      (registry) => registry.url === registryUrl
    );

    onChange(registry);
  };

  return (
    <SelectRow
      value={value?.url}
      options={registryOptions}
      setActiveValue={handleChange}
      width="100%"
      label="Docker Registry"
    />
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
}: {
  registry: DockerRegistry;
  value: string;
  onChange: (newValue: string) => void;
}) => {
  const { currentProject } = useContext(Context);

  const [images, setImages] = useState<ImageRepo[]>([]);

  useEffect(() => {
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
      });
  }, []);

  const imageOptions = images.map((image) => {
    return {
      value: image.uri,
      label: image.name,
    };
  });

  const handleChange = (image: string) => {
    onChange(image);
  };

  return (
    <SelectRow
      label="Image"
      value={value}
      options={imageOptions}
      setActiveValue={handleChange}
      width="100%"
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
}: {
  registry: DockerRegistry;
  imageName: string;
  value: string;
  onChange: (newTag: string) => void;
}) => {
  const { currentProject } = useContext(Context);
  const [imageTags, setImageTags] = useState<string[]>([]);

  useEffect(() => {
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
        const sortedTags = data.sort((a, b) => {
          const aDate = new Date(a.pushed_at);
          const bDate = new Date(b.pushed_at);
          return bDate.getTime() - aDate.getTime();
        });
        setImageTags(sortedTags.map((tag) => tag.tag));

        if (!value) {
          onChange(sortedTags[0].tag);
        }
      });
  }, [registry, imageName]);

  const tagOptions = imageTags.map((tag) => {
    return {
      value: tag,
      label: tag,
    };
  });

  const handleChange = (tag: string) => {
    onChange(tag);
  };

  return (
    <SelectRow
      label="Tag"
      value={value}
      options={tagOptions}
      setActiveValue={handleChange}
      width="100%"
    />
  );
};

export default SourceEditorDocker;
