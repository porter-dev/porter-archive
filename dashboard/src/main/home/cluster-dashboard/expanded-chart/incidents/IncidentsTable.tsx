import Table from "components/Table";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { Column } from "react-table";
import api from "shared/api";
import { Context } from "shared/Context";
import { hardcodedIcons } from "shared/hardcodedNameDict";
import { useRouting } from "shared/routing";
import { capitalize } from "shared/string_utils";
import styled from "styled-components";
import { dateFormatter } from "../../chart/JobRunTable";
import { IncidentsWithoutEvents } from "../../dashboard/incidents/IncidentsTable";

const IncidentsTable = ({
  releaseName,
  namespace,
}: {
  releaseName: string;
  namespace: string;
}) => {
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );
  const { pushFiltered } = useRouting();
  const location = useLocation();

  const [incidents, setIncidents] = useState<IncidentsWithoutEvents[]>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    setIncidents(null);
    setHasError(false);

    api
      .getIncidentsByReleaseName<{ incidents: IncidentsWithoutEvents[] }>(
        "<token>",
        {
          namespace: namespace,
          release_name: releaseName,
        },
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
        Header: "Status",
        accessor: "latest_state",
        Cell: ({ row }) => {
          let original = row.original;

          return (
            <Status>
              <StatusDot status={original.latest_state} />
              {capitalize(original.latest_state)}
            </Status>
          );
        },
      },
      {
        Header: "Message",
        accessor: "latest_message",
        Cell: ({ row }) => {
          let original = row.original;

          return <Message>{original.latest_message}</Message>;
        },
      },
      {
        Header: "Started",
        accessor: "created_at",
        Cell: ({ row }) => {
          let original = row.original;

          return dateFormatter(original.created_at * 1000);
        },
      },
      {
        Header: "Last Updated",
        accessor: "updated_at",
        Cell: ({ row }) => {
          let original = row.original;

          return dateFormatter(original.updated_at * 1000);
        },
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
        pushFiltered(`/cluster-dashboard/incidents/${row?.original?.id}/`, [], {
          redirect_url: location.pathname,
        });
      }}
      hasError={hasError}
    />
  );
};

export default IncidentsTable;

const TableWrapper = styled.div``;

const StyledCard = styled.div`
  background: #26282f;
  padding: 14px;
  border-radius: 8px;
  box-shadow: 0 4px 15px 0px #00000055;
  position: relative;
  border: 2px solid #9eb4ff00;
  width: 100%;
  height: 100%;
  :not(:last-child) {
    margin-bottom: 25px;
  }
`;

const KindContainer = styled.div`
  display: flex;
  align-items: center;
  min-width: 200px;
`;

const Kind = styled.div`
  margin-left: 8px;
`;

const Icon = styled.img`
  height: 20px;
`;

const Status = styled.span`
  font-size: 13px;
  display: flex;
  align-items: center;
  margin-left: 1px;
  min-height: 17px;
  color: #a7a6bb;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "ONGOING" ? "#ed5f85" : "#4797ff"};
  border-radius: 20px;
  margin-left: 3px;
  margin-right: 15px;
`;

const Message = styled.div`
  white-space: nowrap;
  overflow-x: hidden;
  text-overflow: ellipsis;
  max-width: 500px;
`;
