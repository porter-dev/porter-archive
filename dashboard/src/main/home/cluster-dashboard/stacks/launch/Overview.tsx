import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
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
import SaveButton from "components/SaveButton";
import { useRouting } from "shared/routing";

const Overview = () => {
  const {
    newStack,
    clusterId,
    namespace,
    setStackName,
    setStackNamespace,
    setStackCluster,
    submit,
  } = useContext(StacksLaunchContext);
  const { currentProject } = useContext(Context);
  const [isAuthorized] = useAuth();

  const [clusterOptions, setClusterOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [namespaceOptions, setNamespaceOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [submitButtonStatus, setSubmitButtonStatus] = useState("");

  const { pushFiltered } = useRouting();

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

  const handleSubmit = () => {
    setSubmitButtonStatus("loading");

    submit().then(() => {
      console.log("submit");
      setTimeout(() => {
        setSubmitButtonStatus("");
        pushFiltered("/stacks", []);
      }, 1000);
    });
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

  const isValid = useMemo(() => {
    if (namespace === "") {
      return false;
    }
    if (isNaN(clusterId)) {
      return false;
    }
    if (newStack.name === "") {
      return false;
    }
    return true;
  }, [namespace, clusterId, newStack.name]);

  return (
    <div style={{ position: "relative" }}>
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
      <CardGrid>
        {newStack.app_resources.map((app) => (
          <Card key={app.name}>{app.name}</Card>
        ))}

        <AddResourceButton />
      </CardGrid>

      <SubmitButton
        disabled={!isValid || submitButtonStatus !== ""}
        text="Create Stack"
        onClick={handleSubmit}
        clearPosition
        statusPosition="left"
        status={submitButtonStatus}
      >
        Create stack
      </SubmitButton>
    </div>
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

const CardGrid = styled.div`
  margin-top: 32px;
  margin-bottom: 32px;
  display: grid;
  grid-row-gap: 25px;
`;

const Card = styled.div`
  display: flex;
  color: #ffffff;
  background: #2b2e3699;
  justify-content: space-between;
  border-radius: 5px;
  cursor: pointer;
  height: 75px;
  padding: 12px;
  padding-left: 14px;
  border: 1px solid #ffffff0f;

  :hover {
    border: 1px solid #ffffff3c;
  }
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const SubmitButton = styled(SaveButton)`
  width: 100%;
  display: flex;
  justify-content: flex-end;
`;

const AddResourceButtonStyles = {
  Wrapper: styled(Card)`
    align-items: center;
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
