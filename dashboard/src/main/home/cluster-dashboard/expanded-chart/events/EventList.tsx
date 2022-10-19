import React, { useState, useEffect } from "react";
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

const iconDict: any = {
};

type Props = {
  filters: any;
  setExpandedMonitor: any;
};

const EventList: React.FC<Props> = (props) => {
  const [events, setEvents] = useState([]);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    // Dummy event list query
    setTimeout(() => {
      const events = [
        {
          "id": "e0311c9231eea5c47e8bb83cc10faf2b",
          "release_name": "deployment-invalid-image",
          "release_namespace": "default",
          "chart_name": "worker",
          "created_at": "2022-10-06T17:56:06.834088422Z",
          "updated_at": "2022-10-07T19:32:33.842552438Z",
          "last_seen": "2022-10-06T17:55:50Z",
          "status": "active",
          "summary": "The application has an invalid image",
          "severity": "normal",
          "involved_object_kind": "pod",
          "involved_object_name": "deployment-invalid-image-worker-cf976b476-h782c",
          "involved_object_namespace": "default"
        },
        {
          "id": "6818ee8df06db55c310c24a6b0c17cfd",
          "release_name": "oom-killed",
          "release_namespace": "default",
          "chart_name": "web",
          "created_at": "2022-10-05T17:13:45.563510898Z",
          "updated_at": "2022-10-07T19:32:02.580935074Z",
          "last_seen": "2022-10-05T17:59:10Z",
          "status": "active",
          "summary": "The application ran out of memory",
          "severity": "critical",
          "involved_object_kind": "Deployment",
          "involved_object_name": "oom-killed-web",
          "involved_object_namespace": "default"
        },
        {
          "id": "00f3b38dd0b2adc2ce0bab9586d487b5",
          "release_name": "non-zero-exit-code",
          "release_namespace": "default",
          "chart_name": "web",
          "created_at": "2022-10-05T18:31:07.80325966Z",
          "updated_at": "2022-10-07T19:31:34.591091925Z",
          "last_seen": "2022-10-05T18:31:07Z",
          "status": "active",
          "summary": "The application exited with a non-zero exit code",
          "severity": "normal",
          "involved_object_kind": "pod",
          "involved_object_name": "non-zero-exit-code-web-797d5ddb64-g5d7x",
          "involved_object_namespace": "default"
        },
        {
          "id": "c435fe96260e472af9808013687a876c",
          "release_name": "multi-replica-failure-less",
          "release_namespace": "default",
          "chart_name": "worker",
          "created_at": "2022-10-07T15:05:16.823354171Z",
          "updated_at": "2022-10-07T19:31:29.840878022Z",
          "last_seen": "2022-10-07T15:09:17Z",
          "status": "active",
          "summary": "The application exited with a non-zero exit code",
          "severity": "critical",
          "involved_object_kind": "Deployment",
          "involved_object_name": "multi-replica-failure-less-worker",
          "involved_object_namespace": "default"
        },
        {
          "id": "d9aec89e437617f28de47ab700c92cb4",
          "release_name": "multi-replica-failure-more",
          "release_namespace": "default",
          "chart_name": "worker",
          "created_at": "2022-10-07T15:08:21.405351792Z",
          "updated_at": "2022-10-07T19:31:14.773187536Z",
          "last_seen": "2022-10-07T19:25:06Z",
          "status": "active",
          "summary": "The application exited with a non-zero exit code",
          "severity": "critical",
          "involved_object_kind": "Deployment",
          "involved_object_name": "multi-replica-failure-more-worker",
          "involved_object_namespace": "default"
        },
        {
          "id": "f7f2021acb0e5fd104fb30b8c914a563",
          "release_name": "oom-killed-2",
          "release_namespace": "default",
          "chart_name": "web",
          "created_at": "2022-10-05T18:00:45.655719615Z",
          "updated_at": "2022-10-07T19:28:38.571531252Z",
          "last_seen": "2022-10-05T18:00:44Z",
          "status": "active",
          "summary": "The application ran out of memory",
          "severity": "critical",
          "involved_object_kind": "deployment",
          "involved_object_name": "oom-killed-2-web",
          "involved_object_namespace": "default"
        },
        {
          "id": "fa76cfb2daa58649e6aa7dc47262f632",
          "release_name": "deployment-bad-image-tag",
          "release_namespace": "default",
          "chart_name": "worker",
          "created_at": "2022-10-06T17:51:04.846528578Z",
          "updated_at": "2022-10-07T19:28:11.835881268Z",
          "last_seen": "2022-10-06T17:50:46Z",
          "status": "active",
          "summary": "The application has an invalid image",
          "severity": "normal",
          "involved_object_kind": "pod",
          "involved_object_name": "deployment-bad-image-tag-worker-5f676bdb9-q4d7w",
          "involved_object_namespace": "default"
        },
        {
          "id": "b58f6e28bc3884f50cb60c93b8427cb2",
          "release_name": "deployment-stuck-longtime",
          "release_namespace": "default",
          "chart_name": "worker",
          "created_at": "2022-10-07T15:04:23.807783654Z",
          "updated_at": "2022-10-07T17:41:27.155369452Z",
          "last_seen": "2022-10-07T15:04:23.695228777Z",
          "status": "active",
          "summary": "The application cannot be scheduled",
          "severity": "critical",
          "involved_object_kind": "deployment",
          "involved_object_name": "deployment-stuck-longtime-worker",
          "involved_object_namespace": "default"
        },
        {
          "id": "6c6cc62a398d831bfddb6ef5faceafa9",
          "release_name": "failing-job-run",
          "release_namespace": "default",
          "chart_name": "job",
          "created_at": "2022-10-07T16:43:06.025081995Z",
          "updated_at": "2022-10-07T17:29:02.722048271Z",
          "last_seen": "2022-10-07T16:43:48Z",
          "status": "active",
          "summary": "The application has an invalid start command",
          "severity": "normal",
          "involved_object_kind": "Job",
          "involved_object_name": "failing-job-run-dr1vbs563d",
          "involved_object_namespace": "default"
        }
      ];
      setEvents(events);
      setIsLoading(false);
    }, 1000);
  }, []);

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
                  {row?.original &&
                  row.original.severity === "normal" ? (
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
            accessor: "summary",
            width: 270,
          },
          {
            Header: "Last updated",
            accessor: "updated_at",
            width: 140,
            Cell: ({ row }: CellProps<any>) => {
              return (
                <Flex>
                  {readableDate(row.original.updated_at)}
                </Flex>
              );
            },
          },
          {
            id: "details",
            accessor: "",
            width: 20,
            Cell: ({ row }: CellProps<any>) => {
              return (
                <TableButton onClick={() => {
                  setExpandedEvent(row.original);
                }}>
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
      {
        expandedEvent && (
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
                <img src={status} /> <Bold>Priority:</Bold> <Capitalize>{expandedEvent.severity}</Capitalize>
              </InfoTab>
            </InfoRow>
            <Message>
              <img src={document} /> This is a placeholder message where event details should be.
            </Message>
          </Modal>
        )
      }
      {isLoading ? (
        <LoadWrapper>
          <Loading />
        </LoadWrapper>
      ) : (
        <>
        {events.length > 0 ? (
          <TableWrapper>
            <EventTable 
              columns={columns} 
              data={events} 
            />
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
  background: #26292E;
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
  width: ${props => props.width || "85px"};
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
