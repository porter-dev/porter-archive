import React, { useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Modal from "components/porter/Modal";
import TitleSection from "components/TitleSection";
import Loading from "components/Loading";
import Text from "components/porter/Text";
import danger from "assets/danger.svg";
import Anser, { AnserJsonEntry } from "anser";
import web from "assets/web-bold.png";
import settings from "assets/settings-bold.png";
import sliders from "assets/sliders.svg";
import yaml from "js-yaml";
import DiffViewer, { DiffMethod } from "react-diff-viewer";

import dayjs from "dayjs";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Checkbox from "components/porter/Checkbox";
import { NavLink } from "react-router-dom";
import SidebarLink from "main/home/sidebar/SidebarLink";
import { EnvVariablesTab } from "./EnvVariablesTab";
import { ChartType } from "shared/types";
import * as YAML from "js-yaml";
import * as Diff from "deep-diff";
import api from "shared/api";
import { Context } from "shared/Context";

type Props = {
  modalVisible: boolean;
  setModalVisible: (x: boolean) => void;
  revision: number;
  currentChart: ChartType;

  //envChild: any;
};

const ChangeLogModal: React.FC<Props> = ({
  revision,
  currentChart,
  modalVisible,
  //envChild,
  setModalVisible,
}) => {
  const [scrollToBottomEnabled, setScrollToBottomEnabled] = useState(true);
  const [currentView, setCurrentView] = useState("overview");
  const [values, setValues] = useState("");
  const [chartEvent, setChartEvent] = useState(null);
  const [eventValues, setEventValues] = useState("");
  const [showRawDiff, setShowRawDiff] = useState(false);

  const [loading, setLoading] = useState(false);
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );
  useEffect(() => {
    let values = "# Nothing here yet";
    if (currentChart.config) {
      values = yaml.dump(currentChart.config);
    }
    setValues(values);
  }, [currentChart.config]); // It will run this effect whenever currentChart.config changes

  const getChartData = async (chart: ChartType) => {
    setLoading(true);
    const res = await api.getChart(
      "<token>",
      {},
      {
        name: chart.name,
        namespace: chart.namespace,
        cluster_id: currentCluster.id,
        revision: revision,
        id: currentProject.id,
      }
    );
    const updatedChart = res.data;
    //console.log(updatedChart);
    setLoading(false);
    return updatedChart; // <- return updatedChart here
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch the chart data
      const updatedChart = await getChartData(currentChart);

      // Now that we've waited for getChartData to finish, process the result
      let eventValues = "# Nothing here yet";
      if (updatedChart?.config) {
        eventValues = yaml.dump(updatedChart?.config);
      }
      setEventValues(eventValues);
      setChartEvent(updatedChart);
    };

    fetchData();
  }, [currentChart.config]);
  const parseYamlAndDisplayDifferences = (oldYaml: any, newYaml: any) => {
    const diff = Diff.diff(oldYaml, newYaml);
    const changes: JSX.Element[] = [];

    // Define the regex pattern to match service creation
    const servicePattern = /^[a-zA-Z0-9\-]*-[a-zA-Z0-9]*[^\.]$/;

    diff?.forEach((difference: any) => {
      let path = difference.path?.join(" ");
      switch (difference.kind) {
        case "N":
          // Check if the added item is a service by testing the path against the regex pattern
          if (servicePattern.test(path)) {
            changes.push(<ChangeBox type="N">{`${path} created`}</ChangeBox>);
          } else {
            // If not, display the full message
            changes.push(
              <ChangeBox type="N">{`${path} added: ${JSON.stringify(
                difference.rhs
              )}`}</ChangeBox>
            );
          }
          break;
        case "D":
          if (servicePattern.test(path)) {
            // If so, display a simplified message

            changes.push(<Text>{`${path} deleted`}</Text>);
          } else {
            changes.push(<Text>{`${path} removed`}</Text>);
          }
          break;
        case "E":
          changes.push(
            <ChangeBox type="E">
              {`${path} updated to ${JSON.stringify(
                difference.lhs
              )} -> ${JSON.stringify(difference.rhs)}`}
            </ChangeBox>
          );
          break;
        case "A":
          path = path + `[${difference.index}]`;
          if (difference.item.kind === "N")
            changes.push(
              <Text>{`${path} added: ${JSON.stringify(
                difference.item.rhs
              )}`}</Text>
            );
          if (difference.item.kind === "D")
            changes.push(<Text>{`${path} removed`}</Text>);
          if (difference.item.kind === "E")
            changes.push(
              <Text>
                {`${path} updated: ${JSON.stringify(
                  difference.item.lhs
                )} -> ${JSON.stringify(difference.item.rhs)}`}
              </Text>
            );
          break;
      }
    });

    return <ChangeLog>{changes}</ChangeLog>;
  };

  return (
    <>
      <Modal closeModal={() => setModalVisible(false)} width={"1100px"}>
        <Text size={18}>Change Log</Text>
        {loading ? (
          <Loading /> // <-- Render loading state
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Checkbox
                checked={showRawDiff}
                toggleChecked={() => setShowRawDiff(!showRawDiff)}
              >
                <Text>Show Raw Diff</Text>
              </Checkbox>
            </div>
            {showRawDiff ? (
              <>
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <DiffViewer
                    leftTitle={`Revision No. ${revision}`}
                    rightTitle={`Current Version`}
                    oldValue={eventValues}
                    newValue={values}
                    splitView={true}
                    hideLineNumbers={false}
                    useDarkTheme={true}
                    compareMethod={DiffMethod.TRIMMED_LINES}
                  />
                </div>
              </>
            ) : (
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {parseYamlAndDisplayDifferences(
                  chartEvent?.config,
                  currentChart.config
                )}
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default ChangeLogModal;

const ChangeLog = styled.div`
  display: flex;
  flex-direction: column;
`;
const ChangeBox = styled.div<{ type: string }>`
  padding: 10px;

  background-color: ${({ type }) =>
    type === "N"
      ? "#13271e"
      : type === "D"
      ? "#26191c"
      : type === "E"
      ? "#131d2e"
      : "#fff"};
  color: "#fff";
`;
