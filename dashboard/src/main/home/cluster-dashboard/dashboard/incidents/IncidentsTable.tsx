import Table from "components/Table";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Column } from "react-table";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import { Incident } from "./IncidentPage";

export type IncidentsWithoutEvents = Omit<
  Incident,
  "events" | "incident_id"
> & {
  id: string;
};

const IncidentsTable = () => {
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );
  const { pushFiltered } = useRouting();

  const [incidents, setIncidents] = useState<IncidentsWithoutEvents[]>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    setIncidents(null);
    setHasError(false);

    api
      .getIncidents<{ incidents: IncidentsWithoutEvents[] }>(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        if (!isSubscribed) {
          return;
        }

        setIncidents(res.data?.incidents || []);
      })
      .catch((err) => {
        setHasError(true);
        setCurrentError(err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentCluster, currentProject]);

  const columns = useMemo(() => {
    return [
      {
        Header: "Release name",
        accessor: "release_name",
      },
      {
        Header: "Latest state",
        accessor: "latest_state",
      },
      {
        Header: "Message",
        accessor: "latest_message",
      },
    ] as Column<IncidentsWithoutEvents>[];
  }, []);

  const data = useMemo(() => {
    if (!incidents) {
      return [];
    }
    return incidents;
  }, [incidents]);

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={incidents === null}
      onRowClick={(row: any) => {
        pushFiltered(`/cluster-dashboard/incidents/${row?.original?.id}`, []);
      }}
      hasError={hasError}
    />
  );
};

export default IncidentsTable;
