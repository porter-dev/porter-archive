import React, { Component } from "react";
import styled from "styled-components";
import backArrow from "assets/back_arrow.png";
import key from "assets/key.svg";
import loading from "assets/loading.gif";

import { ClusterType } from "shared/types";
import { Context } from "shared/Context";
import { isAlphanumeric } from "shared/common";
import api from "shared/api";

import TitleSection from "components/TitleSection";
import SaveButton from "components/SaveButton";
import TabRegion from "components/TabRegion";
import EnvGroupArray, { KeyValueType } from "./EnvGroupArray";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
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
  deleting: boolean;
  saveValuesStatus: string | null;
  envGroup: EnvGroup;
  tabOptions: { value: string; label: string }[];
  newEnvGroupName: string;
};

type EnvGroup = {
  name: string;
  // timestamp: string;
  variables: KeyValueType[];
  version: number;
};

const tabOptions = [
  { value: "environment", label: "Environment Variables" },
  { value: "settings", label: "Settings" },
];

class ExpandedEnvGroup extends Component<PropsType, StateType> {
  state = {
    loading: true,
    currentTab: "environment",
    deleting: false,
    saveValuesStatus: null as string | null,
    envGroup: {
      name: null as string,
      // timestamp: null as string,
      variables: [] as KeyValueType[],
      number: 0,
    },
    tabOptions: [
      { value: "environment", label: "Environment Variables" },
      { value: "settings", label: "Settings" },
    ],
    newEnvGroupName: null as string,
  };

  populateEnvGroup = (envGroup: any) => {
    api
      .getEnvGroup(
        "<token>",
        {},
        {
          name: envGroup.name,
          id: this.context.currentProject.id,
          namespace: this.props.namespace,
          cluster_id: this.props.currentCluster.id,
        }
      )
      .then((res) => {
        console.log("yolo");
        const variables = [] as KeyValueType[];

        for (const key in res.data.variables) {
          variables.push({
            key: key,
            value: res.data.variables[key],
            hidden: res.data.variables[key].includes("PORTERSECRET"),
            locked: res.data.variables[key].includes("PORTERSECRET"),
            deleted: false,
          });
        }

        this.setState({
          envGroup: {
            name: envGroup.name,
            variables,
            version: envGroup.version,
          },
          newEnvGroupName: envGroup.name,
        });
      })
      .catch((err) => {
        console.log(err);
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
          new_name: newName,
        },
        {
          id: this.context.currentProject.id,
          cluster_id: this.props.currentCluster.id,
          namespace,
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

    Object.keys(apiEnvVariables).forEach((key) => {
      if (!apiEnvVariables[key]) {
        delete apiEnvVariables[key];
      }
    });
    api
      .createEnvGroup(
        "<token>",
        {
          name,
          variables: apiEnvVariables,
          secret_variables: secretEnvVariables,
        },
        {
          id: this.context.currentProject.id,
          cluster_id: this.props.currentCluster.id,
          namespace,
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

                <DarkMatter />

                <Heading>Manage Environment Group</Heading>
                <Helper>
                  Permanently delete this set of environment variables. This
                  action cannot be undone.
                </Helper>
                <Button
                  color="#b91133"
                  onClick={() => {
                    this.context.setCurrentOverlay({
                      message: `Are you sure you want to delete ${this.state.envGroup.name}?`,
                      onYes: this.handleDeleteEnvGroup,
                      onNo: () => this.context.setCurrentOverlay(null),
                    });
                  }}
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
    this.context.setCurrentOverlay(null);
    api
      .deleteEnvGroup(
        "<token>",
        {
          name,
        },
        {
          id: this.context.currentProject.id,
          cluster_id: this.props.currentCluster.id,
          namespace,
        }
      )
      .then((res) => {
        this.props.closeExpanded();
        this.setState({ deleting: false });
      })
      .catch((err) => {
        this.setState({ deleting: false });
      });
  };

  render() {
    const { namespace, closeExpanded } = this.props;
    const {
      envGroup: { name, timestamp },
    } = this.state;

    return (
      <>
        <StyledExpandedChart>
          <HeaderWrapper>
            <BackButton onClick={closeExpanded}>
              <BackButtonImg src={backArrow} />
            </BackButton>
            <TitleSection icon={key} iconWidth="33px">
              {name}
              <TagWrapper>
                Namespace <NamespaceTag>{namespace}</NamespaceTag>
              </TagWrapper>
            </TitleSection>
          </HeaderWrapper>

          {/*
          <InfoWrapper>
            <LastDeployed>
              Last updated {this.readableDate(timestamp)}
            </LastDeployed>
          </InfoWrapper>
          */}

          {this.state.deleting ? (
            <>
              <LineBreak />
              <Placeholder>
                <TextWrap>
                  <Header>
                    <Spinner src={loading} /> Deleting "
                    {this.state.envGroup.name}"
                  </Header>
                  You will be automatically redirected after deletion is
                  complete.
                </TextWrap>
              </Placeholder>
            </>
          ) : (
            <TabRegion
              currentTab={this.state.currentTab}
              setCurrentTab={(x: string) => this.setState({ currentTab: x })}
              options={this.state.tabOptions}
              color={null}
            >
              {this.renderTabContents()}
            </TabRegion>
          )}
        </StyledExpandedChart>
      </>
    );
  }
}

ExpandedEnvGroup.contextType = Context;

export default withAuth(ExpandedEnvGroup);

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
  height: 2px;
  background: #ffffff20;
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
  padding-bottom: 15px;
  position: relative;
  border-radius: 8px;
  overflow: auto;
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
