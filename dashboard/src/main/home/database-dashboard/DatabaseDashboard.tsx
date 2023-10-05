import React, { useState, useContext } from "react";
import styled from "styled-components";
import _ from "lodash";

import grid from "assets/grid.png";
import list from "assets/list.png";
import letter from "assets/vector.svg";
import calendar from "assets/calendar-number.svg";
import database from "assets/database.svg";

import { Context } from "shared/Context";
import api from "shared/api";

import Container from "components/porter/Container";
import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import SearchBar from "components/porter/SearchBar";
import Toggle from "components/porter/Toggle";
import PorterLink from "components/porter/Link";
import Loading from "components/Loading";
import Fieldset from "components/porter/Fieldset";

import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";

type Props = {};

const Apps: React.FC<Props> = ({ 
}) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"calendar" | "letter">("calendar");

  // Placeholder (replace w useQuery)
  const [databases, setApps] = useState([]);
  const [status, setStatus] = useState("");

  const renderContents = () => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />;
    }

    if (status === "loading") {
      return <Loading offset="-150px" />;
    }

    if (databases.length === 0) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>No databases have been created yet</Text>
          <Spacer y={0.5} />

          <Text color={"helper"}>Get started by creating a database.</Text>
          <Spacer y={1} />
          <PorterLink to="/databases/new/database">
            <Button
              onClick={async () =>
                console.log() // TODO: add analytics
              }
              height="35px"
              alt
            >
              Create database <Spacer inline x={1} />{" "}
              <i className="material-icons" style={{ fontSize: "18px" }}>
                east
              </i>
            </Button>
          </PorterLink>
        </DashboardPlaceholder>
      );
    }

    return (
      <>
        <Container row spaced>
          <SearchBar
            value={searchValue}
            setValue={(x) => {
              setSearchValue(x);
            }}
            placeholder="Search applications . . ."
            width="100%"
          />
          <Spacer inline x={2} />
          <Toggle
            items={[
              { label: <ToggleIcon src={calendar} />, value: "calendar" },
              { label: <ToggleIcon src={letter} />, value: "letter" },
            ]}
            active={sort}
            setActive={(x) => {
              if (x === "calendar") {
                setSort("calendar");
              } else {
                setSort("letter");
              }
            }}
          />
          <Spacer inline x={1} />

          <Toggle
            items={[
              { label: <ToggleIcon src={grid} />, value: "grid" },
              { label: <ToggleIcon src={list} />, value: "list" },
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

          <Spacer inline x={2} />
          <PorterLink to="/apps/new/app">
            <Button
              onClick={async () =>
                console.log() // TODO: add analytics
              }
              height="30px"
              width="160px"
            >
              <I className="material-icons">add</I> New application
            </Button>
          </PorterLink>
        </Container>
        <Spacer y={1} />
        <div>DB grid</div>
      </>
    );
  };

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={database}
        title="Databases"
        description="Storage, caches, and stateful workloads for this project."
        disableLineBreak
      />
      {renderContents()}
      <Spacer y={5} />
    </StyledAppDashboard>
  );
};

export default Apps;

const ToggleIcon = styled.img`
  height: 12px;
  margin: 0 5px;
  min-width: 12px;
`;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const StyledAppDashboard = styled.div`
  width: 100%;
  height: 100%;
`;

const CentralContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: left;
`;
