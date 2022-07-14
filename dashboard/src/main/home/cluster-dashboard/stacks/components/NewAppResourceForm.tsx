import Loading from "components/Loading";
import { PopulatedEnvGroup } from "components/porter-form/types";
import TitleSection from "components/TitleSection";
import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import { ExpandedPorterTemplate } from "shared/types";
import styled from "styled-components";
import { BackButton, Icon, Polymer } from "../launch/components/styles";
import { CreateStackBody, SourceConfig } from "../types";
import { hardcodedIcons } from "shared/hardcodedNameDict";
import Heading from "components/form-components/Heading";
import InputRow from "components/form-components/InputRow";
import Helper from "components/form-components/Helper";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";

const parseEnvGroup = (namespace: string) => (
  envGroup: CreateStackBody["env_groups"][0]
): PopulatedEnvGroup => {
  const variables = envGroup?.variables || {};
  const secretVariables = envGroup?.secret_variables || {};

  return {
    name: envGroup.name,
    version: 1,
    namespace,
    applications: envGroup.linked_applications,
    meta_version: 2,
    variables: {
      ...variables,
      ...Object.keys(secretVariables).reduce((acc, key) => {
        acc[key] = "PORTERSECRET_" + key;
        return acc;
      }, {} as any),
    },
  };
};

const NewAppResourceForm = (props: {
  templateInfo: {
    name: string;
    version: string;
  };
  namespace: string;
  sourceConfig: Pick<
    SourceConfig,
    "build" | "image_repo_uri" | "image_tag" | "name"
  >;
  availableEnvGroups: CreateStackBody["env_groups"];
  onSubmit: (
    newApp: CreateStackBody["app_resources"][0],
    syncedEnvGroups: string[]
  ) => Promise<void>;
  onCancel: () => void;
}) => {
  const {
    availableEnvGroups,
    sourceConfig,
    templateInfo,
    namespace,
    onCancel,
    onSubmit,
  } = props;

  const { currentCluster } = useContext(Context);

  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState<ExpandedPorterTemplate>();
  const [saveButtonStatus, setSaveButtonStatus] = useState("");

  const [name, setName] = useState("");

  const { pushFiltered } = useRouting();

  const handleSubmit = async ({
    values: rawValues,
    metadata,
  }: {
    values: any;
    metadata: any;
  }) => {
    setSaveButtonStatus("loading");
    const syncedEnvGroups =
      metadata["container.env"]?.added?.map(
        ({ name }: { name: string }) => name
      ) || [];

    // Convert dotted keys to nested objects
    let values: any = {};
    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    const stackSourceConfig = sourceConfig;
    if (!stackSourceConfig) {
      return;
    }

    let url = stackSourceConfig.image_repo_uri;
    let tag = stackSourceConfig.image_tag;

    if (url?.includes(":")) {
      let splits = url.split(":");
      url = splits[0];
      tag = splits[1];
    } else if (!tag) {
      tag = "latest";
    }

    if (!_.isEmpty(stackSourceConfig.build)) {
      if (template?.metadata?.name === "job") {
        url = "public.ecr.aws/o1j4x7p4/hello-porter-job";
        tag = "latest";
      } else {
        url = "public.ecr.aws/o1j4x7p4/hello-porter";
        tag = "latest";
      }
    }

    let provider;
    switch (currentCluster.service) {
      case "eks":
        provider = "aws";
        break;
      case "gke":
        provider = "gcp";
        break;
      case "doks":
        provider = "digitalocean";
        break;
      case "aks":
        provider = "azure";
        break;
      case "vke":
        provider = "vultr";
        break;
      default:
        provider = "";
    }

    // Check the server URL to see if we can detect the cluster provider.
    // There's no standard URL format for GCP that's why it's not currently included
    if (provider === "") {
      const server = currentCluster.server;

      if (server.includes("eks")) provider = "eks";
      else if (server.includes("ondigitalocean")) provider = "digitalocean";
      else if (server.includes("azmk8s")) provider = "azure";
      else if (server.includes("vultr")) provider = "vultr";
    }

    // don't overwrite for templates that already have a source (i.e. non-Docker templates)
    if (url && tag) {
      _.set(values, "image.repository", url);
      _.set(values, "image.tag", tag);
    }

    _.set(values, "ingress.provider", provider);

    // pause jobs automatically
    if (template?.metadata?.name == "job") {
      _.set(values, "paused", true);
    }

    if (name === "") {
      setSaveButtonStatus("App name cannot be empty");
      return;
    }
    try {
      await onSubmit(
        {
          name: name,
          source_config_name: sourceConfig?.name || "",
          template_name: templateInfo.name,
          template_version: templateInfo.version,
          values,
        },
        [...syncedEnvGroups]
      );

      setSaveButtonStatus("successful");
      setTimeout(() => {
        setSaveButtonStatus("");
        setName("");
        setTemplate(undefined);
      }, 1000);
    } catch (error) {
      setSaveButtonStatus(error);
      setTimeout(() => {
        setSaveButtonStatus("");
      }, 2000);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    if (!templateInfo.name || !templateInfo.version) {
      return () => {
        isSubscribed = false;
      };
    }

    setHasError(false);

    api
      .getTemplateInfo<ExpandedPorterTemplate>(
        "<token>",
        {},
        { name: templateInfo.name, version: templateInfo.version }
      )
      .then((res) => {
        if (isSubscribed) {
          setTemplate(res.data);
        }
      })
      .catch((err) => {
        setHasError(true);
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [templateInfo]);

  if (isLoading) {
    return (
      <Wrapper>
        <Loading />
      </Wrapper>
    );
  }

  if (hasError) {
    return <>Unexpected error</>;
  }
  return (
    <>
      <TitleSection>
        <BackButton onClick={onCancel}>
          <i className="material-icons">keyboard_backspace</i>
        </BackButton>
        <Polymer>
          <Icon src={hardcodedIcons[template.metadata.name]} />
        </Polymer>
        Add{" "}
        {template.metadata.name.charAt(0).toUpperCase() +
          template.metadata.name.slice(1)}{" "}
        to Stack
      </TitleSection>
      <Heading>
        Application Name <Required>*</Required>
      </Heading>
      <InputRow
        type="string"
        value={name}
        setValue={(val: string) => setName(val)}
        placeholder="ex: perspective-vortex"
        width="470px"
      />

      <div style={{ position: "relative" }}>
        <Heading>Application Settings</Heading>
        <Helper>Configure settings for this application.</Helper>
        <PorterFormWrapper
          formData={template.form}
          onSubmit={handleSubmit}
          isLaunch
          saveValuesStatus={saveButtonStatus}
          saveButtonText="Add Application"
          valuesToOverride={{ namespace }}
          injectedProps={{
            "key-value-array": {
              availableSyncEnvGroups: availableEnvGroups.map(
                parseEnvGroup(namespace)
              ),
            },
          }}
          includeMetadata
        />
      </div>
    </>
  );
};

export default NewAppResourceForm;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Wrapper = styled.div`
  margin-top: calc(50vh - 150px);
`;

const StyledLaunchFlow = styled.div`
  min-width: 300px;
  width: calc(100% - 100px);
  margin-left: 50px;
  margin-top: ${(props: { disableMarginTop?: boolean }) =>
    props.disableMarginTop ? "inherit" : "calc(50vh - 380px)"};
  padding-bottom: 150px;
`;
