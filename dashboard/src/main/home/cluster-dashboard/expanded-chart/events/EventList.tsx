import React, { useState, useEffect, useContext } from "react";
import { CellProps } from "react-table";

import styled from "styled-components";
import EventTable from "./EventTable";
import Loading from "components/Loading";
import danger from "assets/danger.svg";
import document from "assets/document.svg";
import info from "assets/info-outlined.svg";
import status from "assets/info-circle.svg";
import { readableDate } from "shared/string_utils";
import TitleSection from "components/TitleSection";
import api from "shared/api";
import Modal from "main/home/modals/Modal";
import time from "assets/time.svg";
import { Context } from "shared/Context";

const iconDict: any = {};

type Props = {
  filters: any;
};

const EventList: React.FC<Props> = ({ filters }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [events, setEvents] = useState([]);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [expandedEventDetails, setExpandedEventDetails] = useState(null);
  const [expandedIncidentEvents, setExpandedIncidentEvents] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .listIncidents("<token>", filters, {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
      })
      .then((res) => {
        setEvents(res.data.incidents);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!expandedEvent) {
      return;
    }

    api
      .getIncidentEvents(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          incident_id: expandedEvent.id,
        }
      )
      .then((res) => {
        setExpandedIncidentEvents(res.data.events);
      });
  }, [expandedEvent]);

  const renderExpandedEventMessage = () => {
    if (!expandedIncidentEvents) {
      return <Loading />;
    }

    return (
      <Message>
        <img src={document} />
        {expandedIncidentEvents[0].detail}
      </Message>
    );
  };

  const columns = React.useMemo(
    () => [
      {
        Header: "Monitors",
        columns: [
          {
            Header: "Name",
            accessor: "release_name",
            width: 180,
            Cell: ({ row }: CellProps<any>) => {
              return (
                <NameWrapper>
                  <AlertIcon src={danger} />
                  {row.original.release_name}
                  {row?.original && row.original.severity === "normal" ? (
                    <></>
                  ) : (
                    <Status color="#cc3d42">Critical</Status>
                  )}
                </NameWrapper>
              );
            },
          },
          {
            Header: "Summary",
            accessor: "short_summary",
            width: 270,
          },
          {
            Header: "Last updated",
            accessor: "updated_at",
            width: 140,
            Cell: ({ row }: CellProps<any>) => {
              return <Flex>{readableDate(row.original.updated_at)}</Flex>;
            },
          },
          {
            id: "details",
            accessor: "",
            width: 20,
            Cell: ({ row }: CellProps<any>) => {
              return (
                <TableButton
                  onClick={() => {
                    setExpandedEvent(row.original);
                  }}
                >
                  <Icon src={info} />
                  Details
                </TableButton>
              );
            },
          },
          {
            id: "logs",
            accessor: "",
            width: 30,
            Cell: ({ row }: CellProps<any>) => {
              return (
                <TableButton width="102px">
                  <Icon src={document} />
                  View logs
                </TableButton>
              );
            },
          },
        ],
      },
    ],
    []
  );

  return (
    <>
      {expandedEvent && (
        <Modal onRequestClose={() => setExpandedEvent(null)} height="auto">
          <TitleSection icon={danger}>
            <Text>{expandedEvent.release_name}</Text>
          </TitleSection>
          <InfoRow>
            <InfoTab>
              <img src={time} /> <Bold>Last updated:</Bold>
              {readableDate(expandedEvent.updated_at)}
            </InfoTab>
            <InfoTab>
              <img src={info} /> <Bold>Status:</Bold>
              <Capitalize>{expandedEvent.status}</Capitalize>
            </InfoTab>
            <InfoTab>
              <img src={status} /> <Bold>Priority:</Bold>{" "}
              <Capitalize>{expandedEvent.severity}</Capitalize>
            </InfoTab>
          </InfoRow>
          {renderExpandedEventMessage()}
        </Modal>
      )}
      {isLoading ? (
        <LoadWrapper>
          <Loading />
        </LoadWrapper>
      ) : (
        <>
          {events?.length > 0 ? (
            <TableWrapper>
              <EventTable columns={columns} data={events} />
            </TableWrapper>
          ) : (
            <Placeholder>
              <div>
                <Title>No results found</Title>
                There were no results found for this filter.
              </div>
            </Placeholder>
          )}
        </>
      )}
    </>
  );
};

export default EventList;

const Message = styled.div`
  padding: 20px;
  background: #26292e;
  border-radius: 5px;
  line-height: 1.5em;
  border: 1px solid #aaaabb33;
  font-size: 13px;
  display: flex;
  align-items: center;
  > img {
    width: 13px;
    margin-right: 20px;
  }
`;

const Capitalize = styled.div`
  text-transform: capitalize;
`;

const Bold = styled.div`
  font-weight: 500;
  margin-right: 5px;
`;

const InfoTab = styled.div`
  display: flex;
  align-items: center;
  opacity: 50%;
  font-size: 13px;
  margin-right: 15px;
  justify-content: center;

  > img {
    width: 13px;
    margin-right: 7px;
  }
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 25px;
`;

const Text = styled.div`
  font-weight: 500;
  font-size: 18px;
  z-index: 999;
`;

const Icon = styled.img`
  width: 16px;
  margin-right: 6px;
`;

const TableButton = styled.div<{ width?: string }>`
  border-radius: 5px;
  height: 30px;
  color: white;
  width: ${(props) => props.width || "85px"};
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff11;
  border: 1px solid #aaaabb33;
  cursor: pointer;
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const ClusterName = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  background: blue;
  width: 100px;
`;

const Title = styled.div`
  font-size: 18px;
  margin-bottom: 10px;
  color: #ffffff;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 300px;
  color: #aaaabb55;
  display: flex;
  font-size: 14px;
  padding-right: 50px;
  align-items: center;
  justify-content: center;
`;

const ClusterIcon = styled.img`
  width: 14px;
  margin-right: 9px;
  opacity: 70%;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const AlertIcon = styled.img`
  width: 20px;
  margin-right: 15px;
  margin-left: 0px;
`;

const NameWrapper = styled.div`
  display: flex;
  align-items: center;
  color: white;
`;

const LoadWrapper = styled.div`
  width: 100%;
  height: 300px;
`;

const Status = styled.div<{ color: string }>`
  padding: 5px 7px;
  background: ${(props) => props.color};
  font-size: 12px;
  border-radius: 3px;
  word-break: keep-all;
  display: flex;
  color: white;
  margin-right: 50px;
  align-items: center;
  margin-left: 15px;
  justify-content: center;
  height: 20px;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  animation: fadeIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
`;

const StyledMonitorList = styled.div`
  height: 200px;
  width: 100%;
  font-size: 13px;
  background: #ffffff11;
  border-radius: 5px;
  border: 1px solid #aaaabb33;
`;
