import React, { Component } from "react";
import styled from "styled-components";
import close from "assets/close.png";
import key from "assets/key.svg";
import _ from "lodash";

import { ChartType, StorageType, ClusterType } from "shared/types";
import { Context } from "shared/Context";
import { isAlphanumeric } from "shared/common";
import api from "shared/api";

import SaveButton from "components/SaveButton";
import ConfirmOverlay from "components/ConfirmOverlay";
import Loading from "components/Loading";
import TabRegion from "components/TabRegion";
import EnvGroupArray, { KeyValueType } from "./EnvGroupArray";
import Heading from "components/values-form/Heading";
import Helper from "components/values-form/Helper";
import InputRow from "components/values-form/InputRow";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";

type PropsType = WithAuthProps & {
  namespace: string;
  envGroup: any;
  currentCluster: ClusterType;
  closeExpanded: () => void;
};

type StateType = {
  loading: boolean;
  currentTab: string | null;
  showDeleteOverlay: boolean;
  deleting: boolean;
  saveValuesStatus: string | null;
  envGroup: EnvGroup;
  tabOptions: { value: string; label: string }[];
  newEnvGroupName: string;
};

type EnvGroup = {
  name: string;
  timestamp: string;
  variables: KeyValueType[];
};

const tabOptions = [
  { value: "environment", label: "Environment Variables" },
  { value: "settings", label: "Settings" },
];

class ExpandedEnvGroup extends Component<PropsType, StateType> {
  state = {
    loading: true,
    currentTab: "environment",
    showDeleteOverlay: false,
    deleting: false,
    saveValuesStatus: null as string | null,
    envGroup: {
      name: null as string,
      timestamp: null as string,
      variables: [] as KeyValueType[],
    },
    tabOptions: [
      { value: "environment", label: "Environment Variables" },
      { value: "settings", label: "Settings" },
    ],
    newEnvGroupName: null as string,
  };

  populateEnvGroup = (envGroup: any) => {
    const {
      metadata: { name, creationTimestamp: timestamp },
      data,
    } = envGroup;
    // parse env group props into values type
    const variables = [] as KeyValueType[];

    for (const key in data) {
      variables.push({
        key: key,
        value: data[key],
        hidden: data[key].includes("PORTERSECRET"),
        locked: data[key].includes("PORTERSECRET"),
        deleted: false,
      });
    }

    this.setState({
      envGroup: {
        name,
        timestamp,
        variables,
      },
      newEnvGroupName: name,
    });
  };

  componentDidMount() {
    this.populateEnvGroup(this.props.envGroup);

    // Filter the settings tab options as for now it only shows the delete button.
    // In a future this should be removed and return to a constant if we want to show data
    // inside the settings tab. (This is make to avoid confussion for the user)
    this.setState((prevState) => {
      return {
        ...prevState,
        tabOptions: prevState.tabOptions.filter((option) => {
          if (option.value === "settings") {
            return this.props.isAuthorized("env_group", "", ["get", "delete"]);
          }
          return true;
        }),
      };
    });
  }

  handleRename = () => {
    const { namespace } = this.props;
    const {
      envGroup: { name },
      newEnvGroupName: newName,
    } = this.state;

    api
      .renameConfigMap(
        "<token>",
        {
          name,
          namespace,
          new_name: newName,
        },
        {
          id: this.context.currentProject.id,
          cluster_id: this.props.currentCluster.id,
        }
      )
      .then((res) => {
        this.populateEnvGroup(res.data);
      });
  };

  handleUpdateValues = () => {
    const { namespace } = this.props;
    const {
      envGroup: { name, variables: envVariables },
    } = this.state;

    const apiEnvVariables: Record<string, string> = {};
    const secretEnvVariables: Record<string, string> = {};

    envVariables
      .filter((envVar: KeyValueType, index: number, self: KeyValueType[]) => {
        // remove any collisions that are marked as deleted and are duplicates, unless they are
        // all delete collisions
        const numDeleteCollisions = self.reduce((n, _envVar: KeyValueType) => {
          return n + (_envVar.key === envVar.key && envVar.deleted ? 1 : 0);
        }, 0);

        const numCollisions = self.reduce((n, _envVar: KeyValueType) => {
          return n + (_envVar.key === envVar.key ? 1 : 0);
        }, 0);

        if (numCollisions == numDeleteCollisions) {
          // if all collisions are delete collisions, just remove duplicates
          return (
            index ===
            self.findIndex(
              (_envVar: KeyValueType) => _envVar.key === envVar.key
            )
          );
        } else if (numCollisions == 1) {
          // if there's just one collision (self), keep the object
          return true;
        } else {
          // if there are more collisions than delete collisions, remove all duplicates that
          // are deletions
          return (
            index ===
            self.findIndex(
              (_envVar: KeyValueType) =>
                _envVar.key === envVar.key && !_envVar.deleted
            )
          );
        }
      })
      .forEach((envVar: KeyValueType) => {
        if (envVar.hidden) {
          if (envVar.deleted) {
            secretEnvVariables[envVar.key] = null;
          } else if (!envVar.value.includes("PORTERSECRET")) {
            secretEnvVariables[envVar.key] = envVar.value;
          }
        } else {
          if (envVar.deleted) {
            apiEnvVariables[envVar.key] = null;
          } else {
            apiEnvVariables[envVar.key] = envVar.value;
          }
        }
      });

    this.setState({ saveValuesStatus: "loading" });
    api
      .updateConfigMap(
        "<token>",
        {
          name,
          namespace,
          variables: apiEnvVariables,
          secret_variables: secretEnvVariables,
        },
        {
          id: this.context.currentProject.id,
          cluster_id: this.props.currentCluster.id,
        }
      )
      .then((res) => {
        this.setState({ saveValuesStatus: "successful" });
      })
      .catch((err) => {
        this.setState({ saveValuesStatus: "error" });
      });
  };

  renderTabContents = () => {
    const { namespace } = this.props;
    const {
      envGroup: { name, variables },
      newEnvGroupName: newName,
      currentTab,
    } = this.state;

    const isEnvGroupNameValid = isAlphanumeric(newName) && newName !== "";
    const isEnvGroupNameDifferent = newName !== name;

    switch (currentTab) {
      case "environment":
        return (
          <TabWrapper>
            <InnerWrapper>
              <Heading>Environment Variables</Heading>
              <Helper>
                Set environment variables for your secrets and
                environment-specific configuration.
              </Helper>
              <EnvGroupArray
                namespace={namespace}
                values={variables}
                setValues={(x: any) =>
                  this.setState((prevState) => ({
                    envGroup: { ...prevState.envGroup, variables: x },
                  }))
                }
                fileUpload={true}
                secretOption={true}
                disabled={
                  !this.props.isAuthorized("env_group", "", [
                    "get",
                    "create",
                    "delete",
                    "update",
                  ])
                }
              />
            </InnerWrapper>
            {this.props.isAuthorized("env_group", "", ["get", "update"]) && (
              <SaveButton
                text="Update"
                onClick={() => this.handleUpdateValues()}
                status={this.state.saveValuesStatus}
                makeFlush={true}
              />
            )}
          </TabWrapper>
        );
      default:
        return (
          <TabWrapper>
            {this.props.isAuthorized("env_group", "", ["get", "delete"]) && (
              <InnerWrapper full={true}>
                <Heading>Name</Heading>
                <Subtitle>
                  <Warning makeFlush={true} highlight={!isEnvGroupNameValid}>
                    Lowercase letters, numbers, and "-" only.
                  </Warning>
                </Subtitle>
                <DarkMatter antiHeight="-29px" />
                <InputRow
                  type="text"
                  value={newName}
                  setValue={(x: string) =>
                    this.setState({ newEnvGroupName: x })
                  }
                  placeholder="ex: doctor-scientist"
                  width="100%"
                />
                <Button
                  color="#616FEEcc"
                  disabled={!(isEnvGroupNameDifferent && isEnvGroupNameValid)}
                  onClick={this.handleRename}
                >
                  Rename {name}
                </Button>
                <Heading>Manage Environment Group</Heading>
                <Helper>
                  Permanently delete this set of environment variables. This
                  action cannot be undone.
                </Helper>
                <Button
                  color="#b91133"
                  onClick={() => this.setState({ showDeleteOverlay: true })}
                >
                  Delete {name}
                </Button>
              </InnerWrapper>
            )}
          </TabWrapper>
        );
    }
  };

  readableDate = (s: string) => {
    const ts = new Date(s);
    const date = ts.toLocaleDateString();
    const time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };

  handleDeleteEnvGroup = () => {
    const { namespace } = this.props;
    const {
      envGroup: { name },
    } = this.state;

    this.setState({ deleting: true });
    api
      .deleteConfigMap(
        "<token>",
        {
          name,
          namespace,
          cluster_id: this.props.currentCluster.id,
        },
        { id: this.context.currentProject.id }
      )
      .then((res) => {
        this.props.closeExpanded();
        this.setState({ deleting: false });
      })
      .catch((err) => {
        this.setState({ deleting: false, showDeleteOverlay: false });
      });
  };

  renderDeleteOverlay = () => {
    if (this.state.deleting) {
      return (
        <DeleteOverlay>
          <Loading />
        </DeleteOverlay>
      );
    }
  };

  render() {
    const { namespace, closeExpanded } = this.props;
    const {
      envGroup: { name, timestamp },
    } = this.state;

    return (
      <>
        <CloseOverlay onClick={closeExpanded} />
        <StyledExpandedChart>
          <ConfirmOverlay
            show={this.state.showDeleteOverlay}
            message={`Are you sure you want to delete ${name}?`}
            onYes={this.handleDeleteEnvGroup}
            onNo={() => this.setState({ showDeleteOverlay: false })}
          />
          {this.renderDeleteOverlay()}

          <HeaderWrapper>
            <TitleSection>
              <Title>
                <IconWrapper>
                  <Icon src={key} />
                </IconWrapper>
                {name}
              </Title>
              <InfoWrapper>
                <LastDeployed>
                  Last updated {this.readableDate(timestamp)}
                </LastDeployed>
              </InfoWrapper>

              <TagWrapper>
                Namespace <NamespaceTag>{namespace}</NamespaceTag>
              </TagWrapper>
            </TitleSection>

            <CloseButton onClick={closeExpanded}>
              <CloseButtonImg src={close} />
            </CloseButton>
          </HeaderWrapper>

          <TabRegion
            currentTab={this.state.currentTab}
            setCurrentTab={(x: string) => this.setState({ currentTab: x })}
            options={this.state.tabOptions}
            color={null}
          >
            {this.renderTabContents()}
          </TabRegion>
        </StyledExpandedChart>
      </>
    );
  }
}

ExpandedEnvGroup.contextType = Context;

export default withAuth(ExpandedEnvGroup);

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
  box-shadow: ${(props) =>
    !props.disabled ? "0 2px 5px 0 #00000030" : "none"};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
`;

const InnerWrapper = styled.div<{ full?: boolean }>`
  width: 100%;
  height: ${(props) => (props.full ? "100%" : "calc(100% - 65px)")};
  background: #ffffff11;
  padding: 0 35px;
  padding-bottom: 50px;
  position: relative;
  border-radius: 5px;
  overflow: auto;
`;

const TabWrapper = styled.div`
  height: 100%;
  width: 100%;
  overflow: hidden;
`;

const DeleteOverlay = styled.div`
  position: absolute;
  top: 0px;
  opacity: 100%;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 999;
  display: flex;
  padding-bottom: 30px;
  align-items: center;
  justify-content: center;
  font-family: "Work Sans", sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: white;
  flex-direction: column;
  background: rgb(0, 0, 0, 0.73);
  opacity: 0;
  animation: lindEnter 0.2s;
  animation-fill-mode: forwards;

  @keyframes lindEnter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const CloseOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #202227;
  animation: fadeIn 0.2s 0s;
  opacity: 0;
  animation-fill-mode: forwards;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const HeaderWrapper = styled.div``;

const Dot = styled.div`
  margin-right: 9px;
  margin-left: 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin: 24px 0px 17px 0px;
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
  position: absolute;
  right: 0px;
  bottom: 0px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
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

const Icon = styled.img`
  width: 100%;
`;

const IconWrapper = styled.div`
  color: #efefef;
  font-size: 16px;
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 3px;
  margin-right: 12px;

  > i {
    font-size: 20px;
  }
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
`;

const TitleSection = styled.div`
  width: 100%;
  position: relative;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledExpandedChart = styled.div`
  width: calc(100% - 50px);
  height: calc(100% - 50px);
  z-index: 0;
  position: absolute;
  top: 25px;
  left: 25px;
  overflow: hidden;
  border-radius: 10px;
  background: #26272f;
  box-shadow: 0 5px 12px 4px #00000033;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  padding: 25px;
  display: flex;
  flex-direction: column;

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
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
