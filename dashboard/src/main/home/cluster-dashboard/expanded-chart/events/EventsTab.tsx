import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import loadingSrc from "assets/loading.gif";
import { Context } from "shared/Context";
import { ChartType } from "../../../../../shared/types";
import api from "../../../../../shared/api";

export type Event = {
  event_id: string;
  index: number;
  info: string;
  name: string;
  status: number;
  time: number;
};

type Props = {
  currentChart: ChartType;
};

const REFRESH_TIME = 1000; // SHOULD BE MADE HIGHER!

const EventsTab: React.FunctionComponent<Props> = (props) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRequest, setShouldRequest] = useState(true);
  const [eventData, setEventData] = useState<Event[][]>([]); // most recent event is first

  // sort by time, ensure sequences are monotonically increasing by time, collapse by id
  const filterData = (data: Event[]) => {
    data = data.sort((a, b) => a.time - b.time);

    if (data.length == 0) return;

    let seq: Event[][] = [];
    let cur: Event[] = [data[0]];

    for (let i = 1; i < data.length; ++i) {
      if (data[i].index < data[i - 1].index) {
        seq.push(cur);
        cur = [];
      }
      cur.push(data[i]);
    }
    if (cur) seq.push(cur);

    let ret: Event[][] = [];
    seq.forEach((j) => {
      j.push({
        event_id: "",
        index: 0,
        info: "",
        name: "",
        status: 0,
        time: 0,
      });

      let fin: Event[] = [];
      for (let i = 0; i < j.length - 1; ++i) {
        if (j[i].event_id != j[i + 1].event_id) {
          fin.push(j[i]);
        }
      }
      ret.push(fin);
    });

    setEventData(ret.reverse());
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!shouldRequest) return;
      setShouldRequest(false);
      api
        .getReleaseSteps(
          "<token>",
          {
            cluster_id: currentCluster.id,
            namespace: props.currentChart.namespace,
          },
          {
            id: currentProject.id,
            name: props.currentChart.name,
          }
        )
        .then((data) => {
          setIsLoading(false);
          filterData(data.data);
        })
        .catch((err) => {})
        .finally(() => {
          setShouldRequest(true);
        });
    }, REFRESH_TIME);
    return () => {
      setIsLoading(true);
      window.clearInterval(id);
    };
  }, [currentProject, currentCluster, props.currentChart]);

  if (isLoading) {
    return (
      <Placeholder>
        <div>
          <Header>
            <Spinner src={loadingSrc} />
          </Header>
        </div>
      </Placeholder>
    );
  }

  if (eventData.length == 0) {
    return (
      <Placeholder>
        <div>
          <Header>
            This prompt appears when there are no events to display. Should
            probably tell the user to use the --stream flag or something.
          </Header>
        </div>
      </Placeholder>
    );
  }

  return <h1>Events Tab is ready to display events!</h1>;

  // if (selectedEvent) {
  //   return <EventLogs clearSelectedEvent={() => setSelectedEvent(undefined)} />;
  // }
  //
  // return (
  //   <EventsPageWrapper>
  //     <EventsList selectEvent={(e) => setSelectedEvent(e)} />
  //   </EventsPageWrapper>
  // );
};

export default EventsTab;

const EventsPageWrapper = styled.div`
  margin-top: 35px;
  padding-bottom: 80px;
`;

const InstallPorterAgentButton = styled.button`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border: none;
  border-radius: 20px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-top: 10px;
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

const Placeholder = styled.div`
  min-height: 200px;
  height: 20vh;
  padding: 30px;
  padding-bottom: 90px;
  font-size: 13px;
  color: #ffffff44;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;
