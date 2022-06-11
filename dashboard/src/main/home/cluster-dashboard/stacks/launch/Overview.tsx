import React, { useContext, useEffect, useRef, useState } from "react";
import semver from "semver";
import { StacksLaunchContext } from "./Store";
import InputRow from "components/form-components/InputRow";
import Selector from "components/Selector";
import api from "shared/api";
import { Context } from "shared/Context";
import { ClusterType, PorterTemplate } from "shared/types";
import useAuth from "shared/auth/useAuth";
import DynamicLink from "components/DynamicLink";
import styled from "styled-components";
import { useOutsideAlerter } from "shared/hooks/useOutsideAlerter";
import { capitalize } from "shared/string_utils";

const Overview = () => {
  const {
    newStack,
    clusterId,
    namespace,
    setStackName,
    setStackNamespace,
    setStackCluster,
  } = useContext(StacksLaunchContext);
  const { currentProject } = useContext(Context);
  const [isAuthorized] = useAuth();

  const [clusterOptions, setClusterOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [namespaceOptions, setNamespaceOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const getClusters = () => {
    return api
      .getClusters("<token>", {}, { id: currentProject.id })
      .then((res) => {
        if (res.data) {
          let clusterOptions: {
            label: string;
            value: string;
          }[] = res.data.map((cluster: ClusterType, i: number) => ({
            label: cluster.name,
            value: `${cluster.id}`,
          }));

          if (res.data.length > 0) {
            setClusterOptions(clusterOptions);
            console.log({ clusterId });
            if (isNaN(clusterId)) {
              const newClusterId = res.data[0].id;
              setStackCluster(newClusterId);
            }
          }
        }
      });
  };

  const updateNamespaces = (cluster_id: number) => {
    api
      .getNamespaces(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id,
        }
      )
      .then((res) => {
        if (res.data) {
          const availableNamespaces = res.data.items.filter(
            (namespace: any) => {
              return namespace.status.phase !== "Terminating";
            }
          );
          const namespaceOptions = availableNamespaces.map(
            (x: { metadata: { name: string } }) => {
              return { label: x.metadata.name, value: x.metadata.name };
            }
          );
          if (availableNamespaces.length > 0) {
            setNamespaceOptions(namespaceOptions);
          }
        }
      })
      .catch(console.log);
  };

  useEffect(() => {
    getClusters();
  }, []);

  useEffect(() => {
    if (isNaN(clusterId)) {
      return;
    }
    updateNamespaces(clusterId);
  }, [clusterId]);

  return (
    <>
      <InputRow
        type="string"
        value={newStack.name}
        setValue={(newName: string) => setStackName(newName)}
      />

      <Selector
        activeValue={`${clusterId}`}
        setActiveValue={(cluster: string) => {
          setStackCluster(Number(cluster));
        }}
        options={clusterOptions}
        width="250px"
        dropdownWidth="335px"
        closeOverlay={true}
      />

      <Selector
        key={"namespace"}
        refreshOptions={() => {
          updateNamespaces(clusterId);
        }}
        addButton={isAuthorized("namespace", "", ["get", "create"])}
        activeValue={namespace}
        setActiveValue={(val) => setStackNamespace(val)}
        options={namespaceOptions}
        width="250px"
        dropdownWidth="335px"
        closeOverlay={true}
      />

      <br />
      {newStack.app_resources.map((app) => (
        <div key={app.name}>{app.name}</div>
      ))}

      <AddResourceButton />
    </>
  );
};

export default Overview;

const AddResourceButton = () => {
  const [templates, setTemplates] = useState<PorterTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<PorterTemplate>();
  const [currentVersion, setCurrentVersion] = useState("");

  const getTemplates = async () => {
    try {
      const res = await api.getTemplates<PorterTemplate[]>(
        "<token>",
        {
          repo_url: process.env.APPLICATION_CHART_REPO_URL,
        },
        {}
      );
      let sortedVersionData = res.data
        .map((template: PorterTemplate) => {
          let versions = template.versions.reverse();

          versions = template.versions.sort(semver.rcompare);

          return {
            ...template,
            versions,
            currentVersion: versions[0],
          };
        })
        .sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });

      return sortedVersionData;
    } catch (err) {}
  };

  useEffect(() => {
    getTemplates().then((templates) => {
      setTemplates(templates);
      setCurrentTemplate(templates[0]);
      setCurrentVersion(templates[0].currentVersion);
    });
  }, []);

  return (
    <AddResourceButtonStyles.Wrapper>
      <AddResourceButtonStyles.Flex>
        Add a new{" "}
        <TemplateSelector
          options={templates}
          value={currentTemplate}
          onChange={(template) => {
            setCurrentTemplate(template);
            setCurrentVersion(template.currentVersion);
          }}
        />
        <VersionSelector
          options={currentTemplate?.versions || []}
          value={currentVersion}
          onChange={setCurrentVersion}
        />
      </AddResourceButtonStyles.Flex>

      <DynamicLink
        to={`/stacks/launch/new-app/${currentTemplate?.name}/${currentVersion}`}
      >
        Create
      </DynamicLink>
    </AddResourceButtonStyles.Wrapper>
  );
};

const TemplateSelector = ({
  value,
  options,
  onChange,
}: {
  value: PorterTemplate;
  options: PorterTemplate[];
  onChange: (newValue: PorterTemplate) => void;
}) => {
  const wrapperRef = useRef();

  const [isExpanded, setIsExpanded] = useState(false);

  useOutsideAlerter(wrapperRef, () => setIsExpanded(false));

  const getName = (template: PorterTemplate) => {
    if (template?.name === "web") {
      return "Web Application";
    }
    return capitalize(template?.name || "");
  };

  return (
    <>
      <SelectorStyles.Wrapper ref={wrapperRef}>
        <SelectorStyles.Button
          expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {getName(value)}
          <i className="material-icons">arrow_drop_down</i>
        </SelectorStyles.Button>

        {isExpanded ? (
          <SelectorStyles.Dropdown>
            {options.map((template) => (
              <SelectorStyles.Option
                className={template.name === value.name ? "active" : ""}
                onClick={() => {
                  onChange(template);
                  setIsExpanded(false);
                }}
              >
                <SelectorStyles.OptionText>
                  {getName(template)}
                </SelectorStyles.OptionText>
              </SelectorStyles.Option>
            ))}
          </SelectorStyles.Dropdown>
        ) : null}
      </SelectorStyles.Wrapper>
    </>
  );
};

const VersionSelector = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (newValue: string) => void;
}) => {
  const wrapperRef = useRef();

  const [isExpanded, setIsExpanded] = useState(false);

  useOutsideAlerter(wrapperRef, () => setIsExpanded(false));

  return (
    <>
      <SelectorStyles.Wrapper ref={wrapperRef}>
        <SelectorStyles.Button
          expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {capitalize(value)}
          <i className="material-icons">arrow_drop_down</i>
        </SelectorStyles.Button>

        {isExpanded ? (
          <SelectorStyles.Dropdown>
            {options.map((version) => (
              <SelectorStyles.Option
                className={version === value ? "active" : ""}
                onClick={() => {
                  onChange(version);
                  setIsExpanded(false);
                }}
              >
                {capitalize(version)}
              </SelectorStyles.Option>
            ))}
          </SelectorStyles.Dropdown>
        ) : null}
      </SelectorStyles.Wrapper>
    </>
  );
};

const AddResourceButtonStyles = {
  Wrapper: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  Text: styled.span`
    font-size: 20px;
  `,
  Flex: styled.div`
    display: flex;
    align-items: center;
  `,
};

const SelectorStyles = {
  Wrapper: styled.div`
    max-width: 200px;
    position: relative;
    font-size: 13px;

    margin-left: 10px;
  `,
  Button: styled.div`
    background-color: #ffffff11;
    border: 1px solid #ffffff22;
    border-radius: 5px;
    min-width: 115px;
    min-height: 30px;
    padding: 0 15px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    white-space: nowrap;
    overflow-y: hidden;
    text-overflow: ellipsis;
    cursor: pointer;

    > i {
      font-size: 20px;
      transform: ${(props: { expanded: boolean }) =>
        props.expanded ? "rotate(180deg)" : ""};
    }
  `,
  Dropdown: styled.div`
    position: absolute;
    background-color: #26282f;
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
  `,
  Option: styled.div`
    min-height: 35px;
    padding: 0 15px;

    display: flex;
    align-items: center;

    cursor: pointer;

    &.active {
      background-color: #32343c;
    }

    :hover {
      background-color: #32343c;
    }

    :not(:last-child) {
      border-bottom: 1px solid #ffffff15;
    }
  `,
  OptionText: styled.span`
    max-width: 115px;
    overflow-x: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `,
};
