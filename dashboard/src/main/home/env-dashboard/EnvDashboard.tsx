import React, { useContext, useEffect, useState, useMemo } from "react";
import _ from "lodash";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { withRouter, type RouteComponentProps } from "react-router";

import { Context } from "shared/Context";
import api from "shared/api";
import { search } from "shared/search";
import { readableDate } from "shared/string_utils";
import { withAuth, type WithAuthProps } from "shared/auth/AuthorizationHoc";

import grid from "assets/grid.png";
import list from "assets/list.png";
import notFound from "assets/not-found.png";
import time from "assets/time.png";
import key from "assets/key.svg";
import doppler from "assets/doppler.png";
import envGroupGrad from "assets/env-group-grad.svg";

import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Spacer from "components/porter/Spacer";
import Loading from "components/Loading";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Text from "components/porter/Text";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Image from "components/porter/Image";
import SearchBar from "components/porter/SearchBar";
import Toggle from "components/porter/Toggle";
import Fieldset from "components/porter/Fieldset";
import {envGroupPath} from "../../../shared/util";

type Props = RouteComponentProps & WithAuthProps;

const EnvDashboard: React.FC<Props> = (props) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [searchValue, setSearchValue] = useState("");
  const [envGroups, setEnvGroups] = useState<[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [hasError, setHasError] = useState<boolean>(false);

  const filteredEnvGroups = useMemo(() => {
    const filteredBySearch = search(envGroups, searchValue, {
      keys: ["name"],
      isCaseSensitive: false,
    });

    const sortedFilteredBySearch = _.sortBy(filteredBySearch, ["name"]);
    return sortedFilteredBySearch;
  }, [envGroups, searchValue]);

  const updateEnvGroups = async (): Promise<void> => {
    try {
      const res = await api.getAllEnvGroups(
        "<token>",
        {},
        {
          id: currentProject?.id || -1,
          cluster_id: currentCluster?.id || -1,
        }
      );
      setEnvGroups(res.data.environment_groups);
      setIsLoading(false);
    } catch (err) {
      setHasError(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    if ((currentProject?.id ?? -1) > -1 && (currentCluster?.id ?? -1) > -1) {
      void updateEnvGroups();
    }
  }, [currentProject, currentCluster]);

  const renderContents = (): React.ReactNode => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />
    }

    if (!isLoading && (!envGroups || envGroups.length === 0)) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>No environment groups found</Text>
          <Spacer y={0.5} />
          <Text color={"helper"}>Get started by creating an environment group.</Text>
          <Spacer y={1} />
          <Link to={envGroupPath(currentProject, "/new")}>
            <Button
              height="35px"
              alt
            >
              Create a new env group <Spacer inline x={1} />{" "}
              <i className="material-icons" style={{ fontSize: "18px" }}>
                east
              </i>
            </Button>
          </Link>
        </DashboardPlaceholder>
      )
    }

    const isAuthorizedToAdd = props.isAuthorized("env_group", "", [
      "get",
      "create",
    ]);

    return (
      <>
        <Container row spaced>
          <SearchBar
            value={searchValue}
            style={{ display: "flex", flex: 1 }}
            setValue={(x) => {
              setSearchValue(x);
            }}
            placeholder="Search environment groups . . ."
          />
          <Spacer inline x={1} />
          <Toggle
            items={[
              { 
                label: (
                  <Image 
                    src={grid}
                    size={12}
                    style={{ margin: "0 5px" }}
                  />
                ),
                value: "grid"
              },
              { 
                label: (
                  <Image
                    src={list}
                    size={12}
                    style={{ margin: "0 5px" }}
                  />
                ),
                value: "list"
              },
            ]}
            active={view}
            setActive={(x) => {
              if (x === "grid") {
                setView("grid");
              } else {
                setView("list");
              }
            }}
          />
          <Spacer inline x={1} />
          {isAuthorizedToAdd && (
            <Link to={envGroupPath(currentProject, "/new")}>
              <Button
                height="30px"
              >
                <I className="material-icons">add</I> New env group
              </Button>
            </Link>
          )}
        </Container>
        <Spacer y={1} />

        {!isLoading && filteredEnvGroups.length === 0 ? (
          <Fieldset>
            <Container row>
              <Image 
                src={notFound}
                size={13}
                opacity={0.65}
              />
              <Spacer inline x={1} />
              <Text color="helper">
                No matching environment groups were found.
              </Text>
            </Container>
          </Fieldset>
        ) : isLoading ? (
          <Loading offset="-150px" />
        ) : view === "grid" ? (
          <GridList>
            {(filteredEnvGroups ?? []).map(
              (envGroup, i: number) => {
                return (
                    <Block to={envGroupPath(currentProject, `/${envGroup.name}`)} key={i}>
                      <Container row>
                        <Image
                          src={envGroup.type === "doppler" ? doppler : key} 
                          size={20} 
                        />
                        <Spacer inline x={.7} />
                        <Text size={14}>{envGroup.name}</Text>
                      </Container>
                      <Container row>
                        <Image opacity={0.4} src={time} size={14} />
                        <Spacer inline x={.5} />
                        <Text size={13} color="#ffffff44">
                          {readableDate(envGroup.created_at)}
                        </Text>
                      </Container>
                    </Block>
                );
              }
            )}
          </GridList>
        ) : (
          <List>
            {(filteredEnvGroups ?? []).map((envGroup: any, i: number) => {
              return (
                <Row to={envGroupPath(currentProject, `/${envGroup.name}`)} key={i}>
                  <Container row>
                    <Image
                      src={envGroup.type === "doppler" ? doppler : key}
                    />
                    <Spacer inline x={.7} />
                    <Text size={14}>{envGroup.name}</Text>
                  </Container>
                  <Spacer height="15px" />
                  <Container row>
                    <Image opacity={0.4} src={time} size={14} />
                    <Spacer inline x={.5} />
                    <Text size={13} color="#ffffff44">
                      {readableDate(envGroup.created_at)}
                    </Text>
                  </Container>
                </Row>
              );
            })}
          </List>
        )}
      </>
    );
  };

  return (
    <DashboardWrapper>
      <DashboardHeader
        image={envGroupGrad}
        title="Environment groups"
        description="Groups of environment variables for storing secrets and configuration."
        disableLineBreak
        capitalize={false}
      />
      {renderContents()}
    </DashboardWrapper>
  );
};

export default withRouter(withAuth(EnvDashboard));

const Row = styled(Link) <{ isAtBottom?: boolean }>`
  cursor: pointer;
  display: block;
  padding: 15px;
  border-bottom: ${props => props.isAtBottom ? "none" : "1px solid #494b4f"};
  background: ${props => props.theme.clickable.bg};
  position: relative;
  border: 1px solid #494b4f;
  border-radius: 5px;
  margin-bottom: 15px;
  animation: fadeIn 0.3s 0s;
`;

const List = styled.div`
  overflow: hidden;
`;

const Block = styled(Link)`
  height: 110px;
  flex-direction: column;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${props => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  transition: all 0.2s;
  :hover {
    border: 1px solid #7a7b80;
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const GridList = styled.div`
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
`;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const DashboardWrapper = styled.div`
  width: 100%;
  height: 100%;

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;