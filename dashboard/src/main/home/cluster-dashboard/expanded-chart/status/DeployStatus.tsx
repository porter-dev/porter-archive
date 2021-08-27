import React, { useEffect, useState, useContext } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType } from "../../../../../shared/types";
import { filter } from "d3-array";
import { render } from "react-dom";

const REFRESH_TIME = 1000; // SHOULD BE MADE HIGHER!

interface Event {
  event_id: string;
  index: number;
  info: string;
  name: string;
  status: number;
  time: number;
}

interface Props {
  chart: ChartType;
}

const DeployStatus: React.FC<Props> = (props) => {
  const [shouldRequest, setShouldRequest] = useState(true);
  const [eventData, setEventData] = useState<Event[][]>([]); // most recent event is first
  const { currentCluster, currentProject } = useContext(Context);

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
            namespace: props.chart.namespace,
          },
          {
            id: currentProject.id,
            name: props.chart.name,
          }
        )
        .then((data) => {
          filterData(data.data);
        })
        .catch((err) => {})
        .finally(() => {
          setShouldRequest(true);
        });
    }, REFRESH_TIME);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const renderEvent = (ev: Event) => {
    return (
      <tr>
        <td>{ev.name}</td>
        <td>{ev.time}</td>
        <td>
          {ev.status == 1
            ? "Success"
            : ev.status == 2
            ? "In Progress"
            : "Failed"}
        </td>
      </tr>
    );
  };

  return eventData.length ? (
    <React.Fragment>
      {eventData.map((group, j) => (
        <table key={j}>
          <thead>
            <td>Name</td>
            <td>Time</td>
            <td>Status</td>
          </thead>
          <tbody>
            {group.map((ev) => (
              <React.Fragment key={ev.index}>{renderEvent(ev)}</React.Fragment>
            ))}
          </tbody>
        </table>
      ))}
    </React.Fragment>
  ) : (
    <React.Fragment />
  );
};

export default DeployStatus;
