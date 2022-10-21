import DynamicLink from "components/DynamicLink";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { useHistory, useLocation } from "react-router";
import { pushFiltered } from "shared/routing";

import { Column } from "react-table";
import styled from "styled-components";
import Table from "components/OldTable";

import Loading from "components/Loading";

import _ from "lodash";
import { integrationList } from "shared/common";
import { Infrastructure, KindMap } from "shared/types";
import { capitalize, readableDate } from "shared/string_utils";
import Placeholder from "components/OldPlaceholder";
import SaveButton from "components/SaveButton";
import { useRouting } from "shared/routing";
import Description from "components/Description";

const InfrastructureList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [infraList, setInfraList] = useState<Infrastructure[]>([]);
  const { currentProject, setCurrentError } = useContext(Context);
  const { pushFiltered } = useRouting();

  useEffect(() => {
    if (currentProject) {
      let isSubscribed = true;

      api
        .getInfra(
          "<token>",
          {
            version: "v2",
          },
          {
            project_id: currentProject.id,
          }
        )
        .then(({ data }) => {
          if (!isSubscribed) {
            return;
          }

          if (!Array.isArray(data)) {
            throw Error("Data is not an array");
          }

          setInfraList(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);

          setHasError(true);
          setCurrentError(err.response?.data?.error);
          setIsLoading(false);
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [currentProject]);

  const columns = useMemo<Array<Column<Infrastructure>>>(() => {
    if (infraList.length == 0) {
      return [];
    }

    return [
      {
        Header: "Kind",
        accessor: "kind",
        Cell: ({ row }) => {
          let original = row.original as Infrastructure;

          return (
            <KindContainer>
              <Icon
                src={
                  integrationList[original.kind]?.icon ||
                  integrationList["dockerhub"].icon
                }
              />
              <Kind>{integrationList[original.kind]?.label}</Kind>
            </KindContainer>
          );
        },
      },
      {
        Header: "Name",
        accessor: "name",
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ row }) => {
          let original = row.original as Infrastructure;

          return (
            <Status>
              <StatusDot status={original.status} />
              {capitalize(original.status)}
            </Status>
          );
        },
      },
      {
        Header: "Resource",
        accessor: "aws_integration_id",
        Cell: ({ row }) => {
          let original = row.original as Infrastructure;

          return (
            <ResourceLink
              to={KindMap[original.kind].resource_link}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              {KindMap[original.kind].resource_name}
              <i className="material-icons">open_in_new</i>
            </ResourceLink>
          );
        },
      },
      {
        Header: "Last Updated",
        accessor: "updated_at",
        Cell: ({ row }) => {
          return readableDate(row.original.updated_at);
        },
      },
      {
        Header: "Version",
        accessor: "source_version",
      },
    ];
  }, [infraList]);

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (hasError) {
    return <Placeholder>Error</Placeholder>;
  }

  const renderTable = () => {
    if (infraList.length == 0) {
      return <Placeholder>No infrastructure found.</Placeholder>;
    }

    return (
      <Table
        columns={columns}
        data={infraList}
        isLoading={isLoading}
        onRowClick={(row) => {
          let original = row.original as Infrastructure;
          pushFiltered(`/infrastructure/${original.id}`, ["project_id"]);
        }}
      />
    );
  };

  return (
    <DatabasesListWrapper>
      <StyledTitleSection>
        <DashboardIcon>
          <i className="material-icons">build_circle</i>
        </DashboardIcon>
        Managed Infrastructure
      </StyledTitleSection>
      <InfoSection>
        <Description>
          Managed infrastructure is infrastructure controlled and updated
          through Porter.
        </Description>
      </InfoSection>
      <LineBreak />
      <ControlRow>
        <SaveButtonContainer>
          <SaveButton
            makeFlush={true}
            clearPosition={true}
            onClick={() =>
              pushFiltered(`/infrastructure/provision`, ["project_id"])
            }
          >
            <i className="material-icons">add</i>
            Create Infrastructure
          </SaveButton>
        </SaveButtonContainer>
      </ControlRow>
      <StyledTableWrapper>{renderTable()}</StyledTableWrapper>
    </DatabasesListWrapper>
  );
};

export default InfrastructureList;

const KindContainer = styled.div`
  display: flex;
  align-items: center;
  min-width: 250px;
`;

const Kind = styled.div`
  margin-left: 8px;
`;

const DatabasesListWrapper = styled.div`
  margin-top: 35px;
`;

const StyledTableWrapper = styled.div`
  padding: 14px;
  position: relative;
  border-radius: 8px;
  background: #26292e;
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

const Icon = styled.img`
  height: 20px;
`;

const DashboardIcon = styled.div`
  height: 45px;
  min-width: 45px;
  width: 45px;
  border-radius: 5px;
  margin-right: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;
  > i {
    font-size: 22px;
  }
`;

const InfoSection = styled.div`
  margin-top: 36px;
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
  margin-bottom: 35px;
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 1px;
  background: #494b4f;
  margin: 10px 0px 35px;
`;

const StyledTitleSection = styled.div`
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: start;
  font-size: 24px;
  font-weight: 600;
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
    props.status === "created"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
  margin-left: 3px;
  margin-right: 15px;
`;

const ResourceLink = styled(DynamicLink)`
  font-size: 13px;
  font-weight: 400;
  margin-left: 7px;
  color: #aaaabb;
  display: flex;
  align-items: center;

  :hover {
    text-decoration: underline;
    color: white;
  }

  > i {
    margin-left: 7px;
    font-size: 17px;
  }
`;

const SaveButtonContainer = styled.div`
  position: relative;
  width: 100%;
`;
