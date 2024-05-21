import React, { useContext, useEffect, useMemo, useState } from "react";
import yaml from "js-yaml";
import key from "legacy/assets/key.svg";
import leftArrow from "legacy/assets/left-arrow.svg";
import loading from "legacy/assets/loading.gif";
import DocsHelper from "legacy/components/DocsHelper";
import DynamicLink from "legacy/components/DynamicLink";
import Heading from "legacy/components/form-components/Heading";
import Helper from "legacy/components/form-components/Helper";
import InputRow from "legacy/components/form-components/InputRow";
import {
  type NewPopulatedEnvGroup,
  type PopulatedEnvGroup,
} from "legacy/components/porter-form/types";
import Spacer from "legacy/components/porter/Spacer";
import SaveButton from "legacy/components/SaveButton";
import TabRegion from "legacy/components/TabRegion";
import TitleSection from "legacy/components/TitleSection";
import api from "legacy/shared/api";
import { type ClusterType } from "legacy/shared/types";
import _, { remove } from "lodash";
import styled, { keyframes } from "styled-components";

import { type WithAuthProps } from "shared/auth/AuthorizationHoc";
import useAuth from "shared/auth/useAuth";
import { Context } from "shared/Context";

import EnvGroupArray, { type KeyValueType } from "./EnvGroupArray";

type PropsType = WithAuthProps & {
  namespace: string;
  envGroup: any;
  currentCluster: ClusterType;
  closeExpanded: () => void;
  allEnvGroups?: NewPopulatedEnvGroup[];
};

type StateType = {
  loading: boolean;
  currentTab: string | null;
  deleting: boolean;
  saveValuesStatus: string | null;
  envGroup: EnvGroup;
  tabOptions: Array<{ value: string; label: string }>;
  newEnvGroupName: string;
};

type EnvGroup = {
  name: string;
  // timestamp: string;
  variables: KeyValueType[];
  version: number;
};

// export default withAuth(ExpandedEnvGroup);

type EditableEnvGroup = Omit<PopulatedEnvGroup, "variables"> & {
  variables: KeyValueType[];
  linked_applications?: string[];
  secret_variables?: KeyValueType[];
};

export const ExpandedEnvGroupFC = ({
  envGroup,
  namespace,
  closeExpanded,
  allEnvGroups,
}: PropsType) => {
  const { currentProject, currentCluster, setCurrentOverlay, setCurrentError } =
    useContext(Context);
  const [isAuthorized] = useAuth();

  const [currentTab, setCurrentTab] = useState("variables-editor");
  const [isDeleting, setIsDeleting] = useState(false);
  const [buttonStatus, setButtonStatus] = useState("");

  const [currentEnvGroup, setCurrentEnvGroup] =
    useState<EditableEnvGroup>(null);
  const [originalEnvVars, setOriginalEnvVars] = useState<
    Array<{
      key: string;
      value: string;
    }>
  >();

  const tabOptions = useMemo(() => {
    if (!isAuthorized("env_group", "", ["get", "delete"])) {
      return [{ value: "variables-editor", label: "Environment variables" }];
    }
    if (
      !isAuthorized("env_group", "", ["get", "delete"]) &&
      (currentProject?.simplified_view_enabled
        ? currentEnvGroup?.linked_applications?.length
        : currentEnvGroup?.applications?.length)
    ) {
      return [
        { value: "variables-editor", label: "Environment variables" },
        { value: "applications", label: "Linked applications" },
      ];
    }

    if (
      currentProject?.simplified_view_enabled
        ? currentEnvGroup?.linked_applications?.length
        : currentEnvGroup?.applications?.length
    ) {
      return [
        { value: "variables-editor", label: "Environment variables" },
        { value: "applications", label: "Linked applications" },
        { value: "settings", label: "Settings" },
      ];
    }

    return [
      { value: "variables-editor", label: "Environment variables" },
      { value: "settings", label: "Settings" },
    ];
  }, [currentEnvGroup]);
  const populateEnvGroup = async () => {
    if (currentProject?.simplified_view_enabled) {
      try {
        const populatedEnvGroup = await api
          .getAllEnvGroups(
            "<token>",
            {},
            {
              id: currentProject.id,
              cluster_id: currentCluster.id,
            }
          )
          .then((res) => res.data.environment_groups);
        updateEnvGroup(
          populatedEnvGroup.find((i: any) => i.name === envGroup.name)
        );
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        const populatedEnvGroup = await api
          .getEnvGroup<NewPopulatedEnvGroup>(
            "<token>",
            {},
            {
              name: envGroup.name,
              id: currentProject.id,
              namespace,
              cluster_id: currentCluster.id,
            }
          )
          .then((res) => res.data);
        updateEnvGroup(populatedEnvGroup);
      } catch (error) {
        console.log(error);
      }
    }
  };

  const updateEnvGroup = (populatedEnvGroup: NewPopulatedEnvGroup) => {
    if (currentProject?.simplified_view_enabled) {
      const normal_variables: KeyValueType[] = Object.entries(
        populatedEnvGroup.variables || {}
      ).map(([key, value]) => ({
        key,
        value,
        hidden: value.includes("PORTERSECRET"),
        locked: value.includes("PORTERSECRET"),
        deleted: false,
      }));
      const secret_variables: KeyValueType[] = Object.entries(
        populatedEnvGroup.secret_variables || {}
      ).map(([key, value]) => ({
        key,
        value,
        hidden: true,
        locked: true,
        deleted: false,
      }));
      const variables = [...normal_variables, ...secret_variables];

      setOriginalEnvVars(
        Object.entries({
          ...(populatedEnvGroup?.variables || {}),
          ...(populatedEnvGroup.secret_variables || {}),
        }).map(([key, value]) => ({
          key,
          value,
        }))
      );

      setCurrentEnvGroup({
        ...populatedEnvGroup,
        variables,
      });
    } else {
      const variables: KeyValueType[] = Object.entries(
        populatedEnvGroup.variables || {}
      ).map(([key, value]) => ({
        key,
        value,
        hidden: value.includes("PORTERSECRET"),
        locked: value.includes("PORTERSECRET"),
        deleted: false,
      }));

      setOriginalEnvVars(
        Object.entries(populatedEnvGroup?.variables || {}).map(
          ([key, value]) => ({
            key,
            value,
          })
        )
      );

      setCurrentEnvGroup({
        ...populatedEnvGroup,
        variables,
      });
    }
  };

  const deleteEnvGroup = async () => {
    const { name, stack_id, type } = currentEnvGroup;
    if (currentProject?.simplified_view_enabled) {
      return await api.deleteNewEnvGroup(
        "<token>",
        {
          name,
          type,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
    }

    if (stack_id?.length) {
      return await api.removeStackEnvGroup(
        "<stack>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace,
          stack_id,
          env_group_name: name,
        }
      );
    }

    return await api.deleteEnvGroup(
      "<token>",
      {
        name,
      },
      {
        id: currentProject.id,
        cluster_id: currentCluster.id,
        namespace,
      }
    );
  };

  const handleDeleteEnvGroup = () => {
    setIsDeleting(true);
    setCurrentOverlay(null);

    deleteEnvGroup()
      .then(() => {
        closeExpanded();
        setIsDeleting(true);
      })
      .catch(() => {
        setIsDeleting(true);
      });
  };

  const handleUpdateValues = async () => {
    setButtonStatus("loading");
    const name = currentEnvGroup.name;
    const variables = currentEnvGroup?.variables;
    if (
      currentEnvGroup.meta_version === 2 ||
      currentProject?.simplified_view_enabled
    ) {
      const secretVariables = remove(variables, (envVar) => {
        return !envVar.value.includes("PORTERSECRET") && envVar.hidden;
      }).reduce(
        (acc, variable) => ({
          ...acc,
          [variable.key]: variable?.value,
        }),
        {}
      );

      const normalVariables = variables?.reduce(
        (acc, variable) => ({
          ...acc,
          [variable.key]: variable?.value,
        }),
        {}
      );

      if (currentProject?.simplified_view_enabled) {
        try {
          const normal_variables: KeyValueType[] = Object.entries(
            normalVariables || {}
          ).map(([key, value]) => ({
            key,
            value,
            hidden: value.includes("PORTERSECRET"),
            locked: value.includes("PORTERSECRET"),
            deleted: false,
          }));

          const secret_variables: KeyValueType[] = Object.entries(
            secretVariables || {}
          ).map(([key, value]) => ({
            key,
            value,
            hidden: true,
            locked: true,
            deleted: false,
          }));
          const variables = [...normal_variables, ...secret_variables];

          setCurrentEnvGroup({
            ...currentEnvGroup,
            variables,
          });

          const linkedApp: string[] = currentEnvGroup?.linked_applications;
          // doppler env groups update themselves, and we don't want to increment the version
          if (
            currentEnvGroup?.type !== "doppler" &&
            currentEnvGroup.type !== "infisical"
          ) {
            await api.createEnvironmentGroups(
              "<token>",
              {
                name,
                variables: normalVariables,
                secret_variables: secretVariables,
              },
              {
                id: currentProject.id,
                cluster_id: currentCluster.id,
              }
            );
          }

          try {
            const res = await api.updateAppsLinkedToEnvironmentGroup(
              "<token>",
              {
                name: currentEnvGroup?.name,
              },
              {
                id: currentProject.id,
                cluster_id: currentCluster.id,
              }
            );
          } catch (error) {
            setCurrentError(error);
          }

          const populatedEnvGroup = await api
            .getAllEnvGroups(
              "<token>",
              {},
              {
                id: currentProject.id,
                cluster_id: currentCluster.id,
              }
            )
            .then((res) => res.data.environment_groups);

          const newEnvGroup = populatedEnvGroup.find(
            (i: any) => i.name === name
          );

          updateEnvGroup(newEnvGroup);
          setButtonStatus("successful");
        } catch (error) {
          setButtonStatus("Couldn't update successfully");
          setCurrentError(error);
          setTimeout(() => {
            setButtonStatus("");
          }, 1000);
        }
      } else {
        try {
          const updatedEnvGroup = await api
            .updateEnvGroup<PopulatedEnvGroup>(
              "<token>",
              {
                name,
                variables: normalVariables,
                secret_variables: secretVariables,
              },
              {
                project_id: currentProject.id,
                cluster_id: currentCluster.id,
                namespace,
              }
            )
            .then((res) => res.data);
          if (!currentProject?.simplified_view_enabled) {
            setButtonStatus("successful");
          }
          updateEnvGroup(updatedEnvGroup);

          setTimeout(() => {
            setButtonStatus("");
          }, 1000);
        } catch (error) {
          setButtonStatus("Couldn't update successfully");
          setCurrentError(error);
          setTimeout(() => {
            setButtonStatus("");
          }, 1000);
        }
      }
    } else {
      // SEPARATE THE TWO KINDS OF VARIABLES
      let secret = variables.filter(
        (variable) =>
          variable.hidden && !variable.value.includes("PORTERSECRET")
      );

      let normal = variables.filter(
        (variable) =>
          !variable.hidden && !variable.value.includes("PORTERSECRET")
      );

      // Filter variables that weren't updated
      normal = normal.reduce((acc, variable) => {
        const originalVar = originalEnvVars.find(
          (orgVar) => orgVar.key === variable.key
        );

        // Remove variables that weren't updated
        if (variable.value === originalVar?.value) {
          return acc;
        }

        // add the variable that's going to be updated
        return [...acc, variable];
      }, []);

      secret = secret.reduce((acc, variable) => {
        const originalVar = originalEnvVars.find(
          (orgVar) => orgVar.key === variable.key
        );

        // Remove variables that weren't updated
        if (variable.value === originalVar?.value) {
          return acc;
        }

        // add the variable that's going to be updated
        return [...acc, variable];
      }, []);

      // Check through the original env vars to see if there's a missing variable, if it is, then means it was removed
      const removedNormal = originalEnvVars.reduce((acc, orgVar) => {
        if (orgVar.value.includes("PORTERSECRET")) {
          return acc;
        }

        const variableFound = variables.find(
          (variable) => orgVar.key === variable.key
        );
        if (variableFound) {
          return acc;
        }
        return [
          ...acc,
          {
            key: orgVar.key,
            value: null,
          },
        ];
      }, []);

      const removedSecret = originalEnvVars.reduce((acc, orgVar) => {
        if (!orgVar.value.includes("PORTERSECRET")) {
          return acc;
        }

        const variableFound = variables.find(
          (variable) => orgVar.key === variable.key
        );
        if (variableFound) {
          return acc;
        }
        return [
          ...acc,
          {
            key: orgVar.key,
            value: null,
          },
        ];
      }, []);

      normal = [...normal, ...removedNormal];
      secret = [...secret, ...removedSecret];

      const normalObject = normal.reduce((acc, val) => {
        return {
          ...acc,
          [val.key]: val.value,
        };
      }, {});

      const secretObject = secret.reduce((acc, val) => {
        return {
          ...acc,
          [val.key]: val.value,
        };
      }, {});

      try {
        const updatedEnvGroup = await api
          .updateConfigMap(
            "<token>",
            {
              name,
              variables: normalObject,
              secret_variables: secretObject,
            },
            {
              id: currentProject.id,
              cluster_id: currentCluster.id,
              namespace,
            }
          )
          .then((res) => res.data);
        setButtonStatus("successful");
        updateEnvGroup(updatedEnvGroup);
        setTimeout(() => {
          setButtonStatus("");
        }, 1000);
      } catch (error) {
        setButtonStatus("Couldn't update successfully");
        setCurrentError(error);
        setTimeout(() => {
          setButtonStatus("");
        }, 1000);
      }
    }
  };

  const renderTabContents = () => {
    const { variables, secret_variables } = currentEnvGroup;

    // const mergeVar = variables.concat(secret_variables);

    switch (currentTab) {
      case "variables-editor":
        return (
          <EnvGroupVariablesEditor
            onChange={(x) => {
              setCurrentEnvGroup((prev) => ({ ...prev, variables: x }));
            }}
            handleUpdateValues={handleUpdateValues}
            variables={variables}
            buttonStatus={buttonStatus}
            setButtonStatus={setButtonStatus}
          />
        );
      case "applications":
        return <ApplicationsList envGroup={currentEnvGroup} />;
      default:
        return (
          <EnvGroupSettings
            namespace={namespace}
            envGroup={currentEnvGroup}
            handleDeleteEnvGroup={handleDeleteEnvGroup}
          />
        );
    }
  };

  useEffect(() => {
    populateEnvGroup();
  }, [envGroup]);

  if (!currentEnvGroup) {
    return null;
  }

  return (
    <StyledExpandedChart>
      <BreadcrumbRow>
        <Breadcrumb onClick={closeExpanded}>
          <ArrowIcon src={leftArrow} />
          <Wrap>Back</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <HeaderWrapper>
        <TitleSection icon={key} iconWidth="33px">
          {envGroup.name}
          {!currentProject?.simplified_view_enabled && (
            <TagWrapper>
              Namespace{" "}
              <NamespaceTag>
                {currentProject?.capi_provisioner_enabled &&
                namespace.startsWith("porter-stack-")
                  ? namespace.replace("porter-stack-", "")
                  : namespace}
              </NamespaceTag>
            </TagWrapper>
          )}
        </TitleSection>
      </HeaderWrapper>

      <Spacer y={1} />

      {isDeleting ? (
        <>
          <LineBreak />
          <Placeholder>
            <TextWrap>
              <Header>
                <Spinner src={loading} /> Deleting "{currentEnvGroup.name}"
              </Header>
              You will be automatically redirected after deletion is complete.
            </TextWrap>
          </Placeholder>
        </>
      ) : (
        <TabRegion
          currentTab={currentTab}
          setCurrentTab={(x: string) => {
            setCurrentTab(x);
          }}
          options={tabOptions}
          color={null}
        >
          {renderTabContents()}
        </TabRegion>
      )}
    </StyledExpandedChart>
  );
};

export default ExpandedEnvGroupFC;

const EnvGroupVariablesEditor = ({
  onChange,
  handleUpdateValues,
  variables,
  buttonStatus,
  setButtonStatus,
}: {
  variables: KeyValueType[];
  buttonStatus: any;
  onChange: (newValues: any) => void;
  handleUpdateValues: () => void;
  setButtonStatus: (status: string) => void;
}) => {
  const [isAuthorized] = useAuth();
  const [buttonDisabled, setButtonDisabled] = useState(false);

  return (
    <TabWrapper>
      <InnerWrapper>
        <Heading isAtTop>Environment variables</Heading>
        <Helper>
          Set environment variables for your secrets and environment-specific
          configuration.
        </Helper>
        <EnvGroupArray
          setButtonDisabled={setButtonDisabled}
          values={variables}
          setValues={(x: any) => {
            onChange(x);
          }}
          fileUpload={true}
          secretOption={true}
          disabled={
            !isAuthorized("env_group", "", [
              "get",
              "create",
              "delete",
              "update",
            ])
          }
        />
      </InnerWrapper>
      {isAuthorized("env_group", "", ["get", "update"]) && (
        <SaveButton
          text="Update"
          onClick={() => {
            handleUpdateValues();
          }}
          status={buttonStatus}
          disabled={buttonStatus == "loading" || buttonDisabled}
          makeFlush={true}
          clearPosition={true}
          statusPosition="right"
        />
      )}
    </TabWrapper>
  );
};

const EnvGroupSettings = ({
  envGroup,
  handleDeleteEnvGroup,
  namespace,
}: {
  envGroup: EditableEnvGroup;
  handleDeleteEnvGroup: () => void;
  namespace?: string;
}) => {
  const { setCurrentOverlay, currentProject, currentCluster, setCurrentError } =
    useContext(Context);
  const [isAuthorized] = useAuth();

  // When cloning an env group, append "-2" for the default name
  // (i.e. my-env-group-2)
  const [name, setName] = useState<string>(envGroup.name + "-2");
  const [cloneNamespace, setCloneNamespace] = useState<string>("default");
  const [cloneSuccess, setCloneSuccess] = useState(false);

  const canDelete = useMemo(() => {
    // add a case for when applications is null - in this case this is a deprecated env group version
    if (currentProject?.simplified_view_enabled) {
      if (!envGroup?.linked_applications) {
        return true;
      }

      return envGroup?.linked_applications?.length === 0;
    } else {
      if (!envGroup?.applications) {
        return true;
      }

      return envGroup?.applications?.length === 0;
    }
  }, [envGroup]);

  const cloneEnvGroup = async () => {
    setCloneSuccess(false);
    try {
      await api.cloneEnvGroup(
        "<token>",
        {
          name: envGroup.name,
          namespace: cloneNamespace,
          clone_name: name,
          version: envGroup.version,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace,
        }
      );
      setCloneSuccess(true);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <TabWrapper>
      {isAuthorized("env_group", "", ["get", "delete"]) && (
        <InnerWrapper full={true}>
          <Heading isAtTop>Manage environment group</Heading>
          <Helper>
            Permanently delete this set of environment variables. This action
            cannot be undone.
          </Helper>
          {!canDelete && (
            <Helper color="#f5cb42">
              Applications are still synced to this env group. Navigate to
              "Linked applications" and remove this env group from all
              applications to delete.
            </Helper>
          )}
          <Button
            color="#b91133"
            onClick={() => {
              setCurrentOverlay({
                message: `Are you sure you want to delete ${envGroup.name}?`,
                onYes: handleDeleteEnvGroup,
                onNo: () => {
                  setCurrentOverlay(null);
                },
              });
            }}
            disabled={!canDelete}
          >
            Delete {envGroup.name}
          </Button>
          {!currentProject?.simplified_view_enabled && (
            <>
              <DarkMatter />
              <Heading>Clone environment group</Heading>
              <Helper>
                Clone this set of environment variables into a new env group.
              </Helper>
              <InputRow
                type="string"
                value={name}
                setValue={(x: string) => {
                  setName(x);
                }}
                label="New env group name"
                placeholder="ex: my-cloned-env-group"
              />
              <InputRow
                type="string"
                value={cloneNamespace}
                setValue={(x: string) => {
                  setCloneNamespace(x);
                }}
                label="New env group namespace"
                placeholder="ex: default"
              />
              <FlexAlt>
                <Button onClick={cloneEnvGroup}>Clone {envGroup.name}</Button>
                {cloneSuccess && (
                  <StatusWrapper position="right" successful={true}>
                    <i className="material-icons">done</i>
                    <StatusTextWrapper>Successfully cloned</StatusTextWrapper>
                  </StatusWrapper>
                )}
              </FlexAlt>
            </>
          )}
        </InnerWrapper>
      )}
    </TabWrapper>
  );
};

const ApplicationsList = ({ envGroup }: { envGroup: EditableEnvGroup }) => {
  const { currentCluster, currentProject } = useContext(Context);

  return (
    <>
      <HeadingWrapper>
        <Heading isAtTop>Linked applications:</Heading>
        <DocsHelper
          link="https://docs.porter.run/deploying-applications/environment-groups#syncing-environment-groups-to-applications"
          tooltipText="When env group sync is enabled, the applications are automatically restarted when the env groups are updated."
          placement="top-start"
          disableMargin
        />
      </HeadingWrapper>
      {currentProject?.simplified_view_enabled
        ? envGroup.linked_applications.map((appName) => {
            return (
              <StyledCard>
                <Flex>
                  <ContentContainer>
                    <EventInformation>
                      <EventName>{appName}</EventName>
                    </EventInformation>
                  </ContentContainer>
                  <ActionContainer>
                    {currentProject?.simplified_view_enabled ? (
                      <ActionButton to={`/apps/${appName}`} target="_blank">
                        <span className="material-icons-outlined">
                          open_in_new
                        </span>
                      </ActionButton>
                    ) : (
                      <ActionButton
                        to={`/applications/${currentCluster.name}/${envGroup.namespace}/${appName}`}
                        target="_blank"
                      >
                        <span className="material-icons-outlined">
                          open_in_new
                        </span>
                      </ActionButton>
                    )}
                  </ActionContainer>
                </Flex>
              </StyledCard>
            );
          })
        : envGroup.applications.map((appName) => {
            return (
              <StyledCard>
                <Flex>
                  <ContentContainer>
                    <EventInformation>
                      <EventName>{appName}</EventName>
                    </EventInformation>
                  </ContentContainer>
                  <ActionContainer>
                    {currentProject?.simplified_view_enabled ? (
                      <ActionButton to={`/apps/${appName}`} target="_blank">
                        <span className="material-icons-outlined">
                          open_in_new
                        </span>
                      </ActionButton>
                    ) : (
                      <ActionButton
                        to={`/applications/${currentCluster.name}/${envGroup.namespace}/${appName}`}
                        target="_blank"
                      >
                        <span className="material-icons-outlined">
                          open_in_new
                        </span>
                      </ActionButton>
                    )}
                  </ActionContainer>
                </Flex>
              </StyledCard>
            );
          })}
    </>
  );
};

const FlexAlt = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
`;

const StatusTextWrapper = styled.p`
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 19px;
  margin: 0;
`;

const StatusWrapper = styled.div<{
  successful: boolean;
  position: "right" | "left";
}>`
  display: flex;
  align-items: center;
  max-width: 170px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 5px;
  margin-bottom: 30px;
  height: 35px;
  margin-left: 15px;

  > i {
    font-size: 18px;
    margin-right: 10px;
    float: left;
    color: ${(props) => (props.successful ? "#4797ff" : "#fcba03")};
  }

  animation-fill-mode: forwards;

  @keyframes statusFloatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const DarkMatter = styled.div`
  width: 100%;
  height: 1px;
  margin-top: -20px;
`;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
`;

const Breadcrumb = styled.div`
  color: #aaaabb88;
  font-size: 13px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  margin-top: -10px;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const Wrap = styled.div`
  z-index: 999;
`;

const HeadingWrapper = styled.div`
  display: flex;
  margin-bottom: 15px;
`;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;

const Placeholder = styled.div`
  min-height: 400px;
  height: 50vh;
  padding: 30px;
  padding-bottom: 90px;
  font-size: 13px;
  color: #ffffff44;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;

const TextWrap = styled.div``;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 1px;
  background: #494b4f;
  margin: 15px 0px 55px;
`;

const HeaderWrapper = styled.div`
  position: relative;
`;

const BackButton = styled.div`
  position: absolute;
  top: 0px;
  right: 0px;
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;

const Button = styled.button`
  height: 35px;
  font-size: 13px;
  margin-top: 5px;
  margin-bottom: 30px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
`;

const CloneButton = styled(Button)`
  display: flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  background-color: #ffffff11;
  :hover {
    background-color: #ffffff18;
  }
`;

const InnerWrapper = styled.div<{ full?: boolean }>`
  width: 100%;
  height: ${(props) => (props.full ? "100%" : "calc(100% - 65px)")};
  padding: 30px;
  padding-bottom: 15px;
  position: relative;
  overflow: auto;
  margin-bottom: 30px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
`;

const TabWrapper = styled.div`
  height: 100%;
  width: 100%;
  padding-bottom: 65px;
  overflow: hidden;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin: 10px 0px 17px 0px;
  height: 20px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 0;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  margin-left: 20px;
  margin-bottom: -3px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
  background: #26282e;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #43454a;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
`;

const StyledExpandedChart = styled.div`
  width: 100%;
  z-index: 0;
  animation: fadeIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  display: flex;
  overflow-y: auto;
  padding-bottom: 120px;
  flex-direction: column;
  overflow: visible;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Warning = styled.span<{ highlight: boolean; makeFlush?: boolean }>`
  color: ${(props) => (props.highlight ? "#f5cb42" : "")};
  margin-left: ${(props) => (props.makeFlush ? "" : "5px")};
`;

const Subtitle = styled.div`
  padding: 11px 0px 16px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  line-height: 1.6em;
  display: flex;
  align-items: center;
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StyledCard = styled.div`
  border-radius: 8px;
  padding: 10px 18px;
  overflow: hidden;
  font-size: 13px;
  animation: ${fadeIn} 0.5s;

  background: #2b2e3699;
  margin-bottom: 15px;
  overflow: hidden;
  border: 1px solid #ffffff0a;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const ActionButton = styled(DynamicLink)`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  border: 1px solid #ffffff00;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff44;
  }

  > span {
    font-size: 20px;
  }
`;
