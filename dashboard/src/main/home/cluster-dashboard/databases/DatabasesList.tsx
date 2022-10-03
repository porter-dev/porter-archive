import CopyToClipboard from "components/CopyToClipboard";
import Table from "components/Table";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useRouteMatch } from "react-router";
import { Link } from "react-router-dom";
import { Column, Row } from "react-table";
import api from "shared/api";
import useAuth from "shared/auth/useAuth";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import { mock_database_list } from "./mock_data";

export type DatabaseObject = {
  cluster_id: number;
  project_id: number;
  infra_id: number;
  instance_id: string;
  instance_name: string;
  status: string;
  instance_endpoint: string;
};

const DatabasesList = () => {
  const {
    currentCluster,
    currentProject,
    setCurrentError,
    setCurrentModal,
    setCurrentOverlay,
    user,
  } = useContext(Context);
  const { url } = useRouteMatch();
  const [isLoading, setIsLoading] = useState(true);
  const [databases, setDatabases] = useState<DatabaseObject[]>([]);
  const [isAuth] = useAuth();
  const { pushQueryParams } = useRouting();

  useEffect(() => {
    let isSubscribed = true;
    api
      .getDatabases(
        "<token>",
        {},
        { project_id: currentProject.id, cluster_id: currentCluster.id }
      )
      .then((res) => {
        if (isSubscribed) {
          setDatabases(res.data);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error(error);
        setCurrentError(error);
      });

    // if (isSubscribed) {
    //   setDatabases(mock_database_list);
    //   setIsLoading(false);
    // }
    return () => {
      isSubscribed = false;
    };
  }, [currentCluster, currentProject]);

  const handleDeleteDatabase = async (project_id: number, infra_id: number) => {
    try {
      await api.destroyInfra(
        "<token>",
        {},
        {
          project_id,
          infra_id,
        }
      );

      // call an endpoint for updating the database status
      await api.updateDatabaseStatus(
        "<token>",
        {
          status: "destroying",
        },
        {
          project_id,
          infra_id,
        }
      );

      setCurrentOverlay(null);
      pushQueryParams({ current_tab: "provisioner-status" });
    } catch (error) {
      console.error(error);
      setCurrentError("We couldn't delete the infra, please try again.");
    }
  };

  const columns = useMemo<Column<DatabaseObject>[]>(() => {
    let columns: Column<DatabaseObject>[] = [
      {
        Header: "Instance id",
        accessor: "instance_id",
      },
      {
        Header: "Name",
        accessor: "instance_name",
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ cell }) => {
          const status: "running" | "destroying" = cell.value as any;
          return <Status status={status}>{status}</Status>;
        },
      },
      {
        Header: "Endpoint",
        accessor: "instance_endpoint",
        Cell: ({ row }) => {
          return (
            <>
              <CopyToClipboard as={Url} text={row.original.instance_endpoint}>
                <span>{row.original.instance_endpoint}</span>
                <i className="material-icons-outlined">content_copy</i>
              </CopyToClipboard>
            </>
          );
        },
      },
      {
        id: "connect_button",
        Cell: ({ row }: any) => {
          return (
            <>
              <ConnectButton
                onClick={() =>
                  setCurrentModal("ConnectToDatabaseInstructionsModal", {
                    endpoint: row.original.instance_endpoint,
                    name: row.original.instance_name,
                  })
                }
              >
                Connect
              </ConnectButton>
            </>
          );
        },
        width: 50,
      },
    ];

    if (isAuth("cluster", "", ["get", "delete"])) {
      columns.push({
        id: "delete_button",
        Cell: ({ row }: { row: Row<DatabaseObject> }) => {
          return (
            <>
              <DeleteButton
                onClick={() =>
                  setCurrentOverlay({
                    message: `Are you sure you want to delete ${row.original.instance_name}?`,
                    onYes: () =>
                      handleDeleteDatabase(
                        row.original.project_id,
                        row.original.infra_id
                      ),
                    onNo: () => setCurrentOverlay(null),
                  })
                }
              >
                <i className="material-icons">delete</i>
              </DeleteButton>
            </>
          );
        },
        width: 50,
      });
    } else {
      columns = columns.filter((col) => col.id !== "delete_button");
    }

    return columns;
  }, [user]);

  const data = useMemo<Array<DatabaseObject>>(() => {
    return databases;
  }, [databases]);

  return (
    <DatabasesListWrapper>
      <ControlRow>
        <Button
          to={`/infrastructure/provision/RDS?origin=${encodeURIComponent(
            "/databases"
          )}`}
        >
          <i className="material-icons">add</i>
          Create database
        </Button>
      </ControlRow>
      <StyledTableWrapper>
        <Table columns={columns} data={data} isLoading={isLoading} />
      </StyledTableWrapper>
    </DatabasesListWrapper>
  );
};

export default DatabasesList;

const Status = styled.div<{ status: "running" | "destroying" }>`
  padding: 5px 10px;
  margin-right: 12px;
  background: ${(props) => {
    if (props.status === "running") return "#38a88a";
    if (props.status === "destroying") return "#cc3d42";
  }};
  font-size: 13px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 25px;
  max-width: 80px;
  text-transform: capitalize;
  font-weight: 400;
  user-select: none;
`;

const DeleteButton = styled.div`
  display: flex;
  visibility: ${(props: { invis?: boolean }) =>
    props.invis ? "hidden" : "visible"};
  align-items: center;
  justify-content: center;
  width: 30px;
  float: right;
  height: 30px;
  :hover {
    background: #ffffff11;
    border-radius: 20px;
    cursor: pointer;
  }

  > i {
    font-size: 20px;
    color: #ffffff44;
    border-radius: 20px;
  }
`;

const DatabasesListWrapper = styled.div`
  margin-top: 35px;
`;

const StyledTableWrapper = styled.div`
  padding: 14px;
  position: relative;
  border-radius: 8px;
  background: #262a30;
  border: 1px solid #494b4f;
  width: 100%;
  height: 100%;
  :not(:last-child) {
    margin-bottom: 25px;
  }
`;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const Url = styled.a`
  max-width: 300px;
  font-size: 13px;
  user-select: text;
  font-weight: 400;
  display: flex;
  align-items: center;
  > i {
    margin-left: 10px;
    font-size: 15px;
  }

  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  :hover {
    cursor: pointer;
  }
`;

const Button = styled(Link)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const ConnectButton = styled.button<{}>`
  height: 25px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: #5561c0;
  box-shadow: 0 2px 5px 0 #00000030;
  cursor: pointer;
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: brightness(120%);
  }
`;
