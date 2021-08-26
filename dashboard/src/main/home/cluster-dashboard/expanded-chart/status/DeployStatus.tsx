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
  const [eventData, setEventData] = useState([]);
  const { currentCluster, currentProject } = useContext(Context);

  // sort by index, ensure sequence is monotonically increasing by time, collapse by id
  const filterData = (data: Event[]) => {
    data = data.sort((a, b) => a.index - b.index);

    let pref = 1;
    while (pref < data.length) {
      if (data[pref].time < data[pref - 1].time) {
        break;
      }
      pref += 1;
    }
    if (data.length == 0) pref = 0;

    data = data.slice(0, pref);

    data.push({
      event_id: "",
      index: 0,
      info: "",
      name: "",
      status: 0,
      time: 0,
    });

    const fin: Event[] = [];
    for (let i = 0; i < data.length - 1; ++i) {
      if (data[i].event_id != data[i + 1].event_id) {
        fin.push(data[i]);
      }
    }

    setEventData(fin);
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
    <table>
      <thead>
        <td>Name</td>
        <td>Time</td>
        <td>Status</td>
      </thead>
      <tbody>
        {eventData.map((ev) => (
          <React.Fragment key={ev.index}>{renderEvent(ev)}</React.Fragment>
        ))}
      </tbody>
    </table>
  ) : (
    <React.Fragment />
  );
};

export default DeployStatus;
