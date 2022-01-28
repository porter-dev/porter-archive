import DynamicLink from "components/DynamicLink";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { useHistory, useLocation, useRouteMatch } from "react-router";
import { getQueryParam, pushFiltered } from "shared/routing";
import { Link } from "react-router-dom";
import TitleSection from "components/TitleSection";

import { Column } from "react-table";
import styled from "styled-components";
import Table from "components/Table";
import Selector from "components/Selector";

import Loading from "components/Loading";

import _, { flatMapDepth } from "lodash";
import { integrationList } from "shared/common";
import DocsHelper from "components/DocsHelper";

type InfraKind =
  | "ecr"
  | "eks"
  | "rds"
  | "gke"
  | "gcr"
  | "doks"
  | "docr"
  | "test";

export type Infrastructure = {
  id: number;
  created_at: string;
  updated_at: string;
  project_id: number;
  kind: InfraKind;
  status: string;
  aws_integration_id: number;
  do_integration_id: number;
  gcp_integration_id: number;
  latest_operation: Operation;
  source_link: string;
  source_version: string;
};

export type Operation = {
  id: string;
  infra_id: number;
  type: string;
  status: string;
  errored: boolean;
  error: string;
  last_applied: any;
};

type ProviderInfoMap = {
  [key in InfraKind]: {
    provider: string;
    source: string;
    resource_name: string;
    resource_link: string;
  };
};

const kindMap: ProviderInfoMap = {
  ecr: {
    provider: "aws",
    source: "porter/aws/ecr",
    resource_name: "Registry",
    resource_link: "/integrations/registry",
  },
  eks: {
    provider: "aws",
    source: "porter/aws/eks",
    resource_name: "Cluster",
    resource_link: "/dashboard",
  },
  rds: {
    provider: "aws",
    source: "porter/aws/rds",
    resource_name: "Database",
    resource_link: "/databases",
  },
  gcr: {
    provider: "gcp",
    source: "porter/gcp/gcr",
    resource_name: "Registry",
    resource_link: "/integrations/registry",
  },
  gke: {
    provider: "gcp",
    source: "porter/gcp/gke",
    resource_name: "Cluster",
    resource_link: "/dashboard",
  },
  docr: {
    provider: "aws",
    source: "porter/do/docr",
    resource_name: "Registry",
    resource_link: "/integrations/registry",
  },
  doks: {
    provider: "aws",
    source: "porter/do/doks",
    resource_name: "Cluster",
    resource_link: "/dashboard",
  },
  test: {
    provider: "aws",
    source: "porter/test",
    resource_name: "Test",
    resource_link: "/dashboard",
  },
};

const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase();
};

const readableDate = (s: string) => {
  const ts = new Date(s);
  const date = ts.toLocaleDateString();
  const time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} on ${date}`;
};

const InfrastructureList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [infraList, setInfraList] = useState<Infrastructure[]>([]);
  const [selectedInfra, setSelectedInfra] = useState<Infrastructure>(null);
  const { currentProject, currentCluster, setCurrentModal } = useContext(
    Context
  );

  const { url: currentUrl } = useRouteMatch();

  const location = useLocation();
  const history = useHistory();

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

          if (isSubscribed) {
            setHasError(true);
          }

          setIsLoading(false);
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [currentProject]);

  const getResourceLink = (infra: Infrastructure) => {
    return (
      <ResourceLink to={`/cluster-dashboard`} target="_blank">
        Cluster
        <i className="material-icons">open_in_new</i>
      </ResourceLink>
    );
  };

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
              <Icon src={integrationList[original.kind].icon} />
              <Kind>{integrationList[original.kind].label}</Kind>
            </KindContainer>
          );
        },
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
              to={kindMap[original.kind].resource_link}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              {kindMap[original.kind].resource_name}
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
        Header: "Source",
        accessor: "source_link",
      },
      {
        Header: "Version",
        accessor: "source_version",
      },
    ];
  }, [infraList]);

  const data = useMemo<Array<Infrastructure>>(() => {
    return infraList;
  }, [infraList]);

  if (selectedInfra) {
    console.log(selectedInfra);
    return <div>Selected Infra</div>;
  }

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (infraList.length == 0) {
    return <Placeholder>No infra available</Placeholder>;
  }

  if (hasError) {
    return <Placeholder>Error</Placeholder>;
  }

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
        <Button to={`/provision-infrastructure`}>
          <i className="material-icons">add</i>
          Create Infrastructure
        </Button>
      </ControlRow>
      <StyledTableWrapper>
        <Table
          columns={columns}
          data={infraList}
          isLoading={isLoading}
          onRowClick={({ original: Infrastructure }) => {
            pushFiltered({ history, location }, "/infrastructure/1", [
              "project_id",
            ]);
          }}
        />
      </StyledTableWrapper>
    </DatabasesListWrapper>
  );
};

export default InfrastructureList;

const KindContainer = styled.div`
  display: flex;
  align-items: center;
  min-width: 200px;
`;

const Kind = styled.div`
  margin-left: 8px;
`;

const Placeholder = styled.div`
  padding: 30px;
  margin-top: 35px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 400px;
  height: 50vh;
  background: #ffffff11;
  border-radius: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;

const DatabasesListWrapper = styled.div`
  margin-top: 35px;
`;

const StyledTableWrapper = styled.div`
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

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #aaaabb;
  margin-top: 13px;
  margin-left: 2px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #7a838f;
  font-size: 13px;
  > i {
    color: #8b949f;
    font-size: 18px;
    margin-right: 5px;
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
  height: 2px;
  background: #ffffff20;
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
