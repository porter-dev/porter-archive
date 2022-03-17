import Table from "components/Table";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Column } from "react-table";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import styled from "styled-components";
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
        Header: "Incident ID",
        accessor: "id",
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
    <TableWrapper>
      <StyledCard>
        <Table
          columns={columns}
          data={data}
          isLoading={incidents === null}
          onRowClick={(row: any) => {
            pushFiltered(
              `/cluster-dashboard/incidents/${row?.original?.id}`,
              []
            );
          }}
          hasError={hasError}
        />
      </StyledCard>
    </TableWrapper>
  );
};

export default IncidentsTable;

const TableWrapper = styled.div`
  margin-top: 35px;
`;

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
