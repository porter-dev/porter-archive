import React, { useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import database from "legacy/assets/database.svg";
import doppler from "legacy/assets/doppler.png";
import envGroupGrad from "legacy/assets/env-group-grad.svg";
import grid from "legacy/assets/grid.png";
import infisical from "legacy/assets/infisical.svg";
import key from "legacy/assets/key.svg";
import list from "legacy/assets/list.png";
import notFound from "legacy/assets/not-found.png";
import time from "legacy/assets/time.png";
import ClusterProvisioningPlaceholder from "legacy/components/ClusterProvisioningPlaceholder";
import Loading from "legacy/components/Loading";
import Button from "legacy/components/porter/Button";
import Container from "legacy/components/porter/Container";
import DashboardPlaceholder from "legacy/components/porter/DashboardPlaceholder";
import Fieldset from "legacy/components/porter/Fieldset";
import Image from "legacy/components/porter/Image";
import PorterLink from "legacy/components/porter/Link";
import SearchBar from "legacy/components/porter/SearchBar";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import Toggle from "legacy/components/porter/Toggle";
import {
  envGroupValidator,
  type ClientEnvGroup,
} from "legacy/lib/env-groups/types";
import api from "legacy/shared/api";
import { search } from "legacy/shared/search";
import { readableDate } from "legacy/shared/string_utils";
import _ from "lodash";
import { withRouter, type RouteComponentProps } from "react-router";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { z } from "zod";

import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";

import { withAuth, type WithAuthProps } from "shared/auth/AuthorizationHoc";
import { Context } from "shared/Context";

import { envGroupPath } from "../../../shared/util";

type Props = RouteComponentProps & WithAuthProps;

const EnvDashboard: React.FC<Props> = (props) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data: { environment_groups: envGroups = [] } = {}, status } =
    useQuery(
      ["envGroups", currentProject?.id, currentCluster?.id],
      async () => {
        if (!currentProject || !currentCluster) {
          return { environment_groups: [] };
        }
        const res = await api.getAllEnvGroups(
          "<token>",
          {},
          {
            id: currentProject?.id || -1,
            cluster_id: currentCluster?.id || -1,
          }
        );

        const data = await z
          .object({
            environment_groups: z.array(envGroupValidator).default([]),
          })
          .parseAsync(res.data);
        return data;
      }
    );

  const filteredEnvGroups = useMemo(() => {
    const filteredBySearch = search(envGroups, searchValue, {
      keys: ["name"],
      isCaseSensitive: false,
    });

    const sortedFilteredBySearch = _.sortBy(filteredBySearch, ["name"]);
    return sortedFilteredBySearch;
  }, [envGroups, searchValue]);

  const getIconFromType = (type: ClientEnvGroup["type"]): string => {
    if (type === "doppler") {
      return doppler;
    } else if (type === "datastore") {
      return database;
    } else if (type === "infisical") {
      return infisical;
    } else {
      return key;
    }
  };

  const renderContents = (): React.ReactNode => {
    if (currentProject?.sandbox_enabled) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>
            Environment groups are not enabled on the Porter Cloud
          </Text>
          <Spacer y={0.5} />
          <Text color={"helper"}>
            Eject to your own cloud account to enable environment groups.
          </Text>
          <Spacer y={1} />
          <PorterLink to="https://docs.porter.run/other/eject">
            <Button alt height="35px">
              Request ejection
            </Button>
          </PorterLink>
        </DashboardPlaceholder>
      );
    }

    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />;
    }

    if (status === "loading") {
      return <Loading offset="-150px" />;
    }

    if (envGroups.length === 0) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>No environment groups found</Text>
          <Spacer y={0.5} />
          <Text color={"helper"}>
            Get started by creating an environment group.
          </Text>
          <Spacer y={1} />
          <Link to={envGroupPath(currentProject, "/new")}>
            <Button height="35px" alt>
              Create a new env group <Spacer inline x={1} />{" "}
              <i className="material-icons" style={{ fontSize: "18px" }}>
                east
              </i>
            </Button>
          </Link>
        </DashboardPlaceholder>
      );
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
                  <Image src={grid} size={12} style={{ margin: "0 5px" }} />
                ),
                value: "grid",
              },
              {
                label: (
                  <Image src={list} size={12} style={{ margin: "0 5px" }} />
                ),
                value: "list",
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
              <Button height="30px">
                <I className="material-icons">add</I> New env group
              </Button>
            </Link>
          )}
        </Container>
        <Spacer y={1} />

        {status === "success" && filteredEnvGroups.length === 0 ? (
          <Fieldset>
            <Container row>
              <Image src={notFound} size={13} opacity={0.65} />
              <Spacer inline x={1} />
              <Text color="helper">
                No matching environment groups were found.
              </Text>
            </Container>
          </Fieldset>
        ) : view === "grid" ? (
          <GridList>
            {(filteredEnvGroups ?? []).map((envGroup, i: number) => {
              return (
                <Block
                  to={envGroupPath(currentProject, `/${envGroup.name}`)}
                  key={i}
                >
                  <Container row>
                    <Image src={getIconFromType(envGroup.type)} size={20} />
                    <Spacer inline x={0.7} />
                    <Text size={14}>{envGroup.name}</Text>
                  </Container>
                  <Container row>
                    <Image opacity={0.4} src={time} size={14} />
                    <Spacer inline x={0.5} />
                    <Text size={13} color="#ffffff44">
                      {readableDate(envGroup.created_at)}
                    </Text>
                  </Container>
                </Block>
              );
            })}
          </GridList>
        ) : (
          <List>
            {(filteredEnvGroups ?? []).map((envGroup, i) => {
              return (
                <Row
                  to={envGroupPath(currentProject, `/${envGroup.name}`)}
                  key={i}
                >
                  <Container row>
                    <Image src={getIconFromType(envGroup.type)} />
                    <Spacer inline x={0.7} />
                    <Text size={14}>{envGroup.name}</Text>
                  </Container>
                  <Spacer height="15px" />
                  <Container row>
                    <Image opacity={0.4} src={time} size={14} />
                    <Spacer inline x={0.5} />
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

const Row = styled(Link)<{ isAtBottom?: boolean }>`
  cursor: pointer;
  display: block;
  padding: 15px;
  border-bottom: ${(props) =>
    props.isAtBottom ? "none" : "1px solid #494b4f"};
  background: ${(props) => props.theme.clickable.bg};
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
  color: ${(props) => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
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
