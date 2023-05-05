import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import styled from "styled-components";
import RadioFilter from "components/RadioFilter";

import spinner from "assets/loading.gif";
import filterOutline from "assets/filter-outline.svg";
import time from "assets/time.svg";
import { Context } from "shared/Context";
import api from "shared/api";
import { Direction, useLogs } from "./useAgentLogs";
import Anser from "anser";
import DateTimePicker from "components/date-time-picker/DateTimePicker";
import dayjs from "dayjs";
import Loading from "components/Loading";
import _ from "lodash";
import { ChartType } from "shared/types";
import Banner from "components/porter/Banner";
import LogSearchBar from "components/LogSearchBar";
import LogQueryModeSelectionToggle from "components/LogQueryModeSelectionToggle";
import Fieldset from "components/porter/Fieldset";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Container from "components/porter/Container";
import Button from "components/porter/Button";

type Props = {
  currentChart?: ChartType;
};

type PodFilter = {
  podName: string;
  podNamespace: string;
};

const LogSection: React.FC<Props> = ({ currentChart }) => {
  const scrollToBottomRef = useRef<HTMLDivElement | undefined>(undefined);
  const { currentProject, currentCluster } = useContext(Context);
  const [podFilter, setPodFilter] = useState<PodFilter>({
    podName: "",
    podNamespace: "",
  });
  const [podFilterOpts, setPodFilterOpts] = useState<PodFilter[]>([]);
  const [scrollToBottomEnabled, setScrollToBottomEnabled] = useState(true);
  const [enteredSearchText, setEnteredSearchText] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [notification, setNotification] = useState<string>();

  const [hasPorterAgent, setHasPorterAgent] = useState(true);
  const [isPorterAgentInstalling, setIsPorterAgentInstalling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | undefined>(undefined);

  const notify = (message: string) => {
    setNotification(message);

    setTimeout(() => {
      setNotification(undefined);
    }, 5000);
  };

  console.log(podFilter);

  const { loading, logs, refresh, moveCursor, paginationInfo } = useLogs(
    podFilter.podName,
    podFilter.podNamespace,
    enteredSearchText,
    notify,
    currentChart,
    selectedDate
  );

  const refreshPodLogsValues = async () => {
    const filters = {
      namespace: currentChart.namespace,
      revision: currentChart.version.toString(),
      match_prefix: currentChart.name,
    };

    const logPodValuesResp = await api.getLogPodValues("<TOKEN>", filters, {
      project_id: currentProject.id,
      cluster_id: currentCluster.id,
    });

    if (logPodValuesResp.data?.length != 0) {
      setPodFilterOpts(
        _.uniq(logPodValuesResp.data ?? []).map((podName: any) => {
          return { podName: podName, podNamespace: currentChart.namespace };
        })
      );

      // only set pod filter if the current pod is not found in the resulting data
      if (!podFilter || !logPodValuesResp.data?.includes(podFilter)) {
        setPodFilter({
          podName: logPodValuesResp.data[0],
          podNamespace: currentChart.namespace,
        });
      }
      console.log("pod values set chart namespace", podFilter, podFilterOpts);
      return;
    }

    // check if pods are in default namespace
    const filters_default = {
      namespace: "default",
      revision: currentChart.version.toString(),
      match_prefix: currentChart.name,
    };

    const logPodValuesResp_default = await api.getLogPodValues(
      "<TOKEN>",
      filters_default,
      {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
      }
    );

    if (logPodValuesResp_default.data?.length != 0) {
      setPodFilterOpts(
        _.uniq(logPodValuesResp_default.data ?? []).map((podName: any) => {
          return { podName: podName, podNamespace: "default" };
        })
      );

      // only set pod filter if the current pod is not found in the resulting data
      if (!podFilter || !logPodValuesResp_default.data?.includes(podFilter)) {
        setPodFilter({
          podName: logPodValuesResp_default.data[0],
          podNamespace: "default",
        });
      }
      console.log("pod values set default", podFilter, podFilterOpts);
      return;
    }

    console.log("pod values empty");

    // if we're on the latest revision and no pod values were returned, query for all release pods
    if (currentChart.info.status == "deployed") {
      console.log("search all releast pods");
      const allReleasePodsResp = await api.getAllReleasePods(
        "<TOKEN>",
        {},
        {
          id: currentProject.id,
          name: currentChart.name,
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
        }
      );

      let podList = allReleasePodsResp.data.map((pod: any) => {
        return {
          podName: pod.metadata.name,
          podNamespace: pod.metadata.namespace,
        };
      });

      setPodFilterOpts(podList);

      if (!podFilter || !podList.includes(podFilter)) {
        setPodFilter(podList[0]);
      }
    }
  };

  useEffect(() => {
    if (!loading && scrollToBottomRef.current && scrollToBottomEnabled) {
      scrollToBottomRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [loading, logs, scrollToBottomRef, scrollToBottomEnabled]);

  const renderLogs = () => {
    return logs?.map((log, i) => {
      return (
        <Log key={[log.lineNumber, i].join(".")}>
          <span className="line-number">{log.lineNumber}.</span>
          <span className="line-timestamp">
            {log.timestamp
              ? dayjs(log.timestamp).format("MMM D, YYYY HH:mm:ss")
              : "-"}
          </span>
          <LogOuter key={[log.lineNumber, i].join(".")}>
            {log.line?.map((ansi, j) => {
              if (ansi.clearLine) {
                return null;
              }

              return (
                <LogInnerSpan
                  key={[log.lineNumber, i, j].join(".")}
                  ansi={ansi}
                >
                  {ansi.content.replace(/ /g, "\u00a0")}
                </LogInnerSpan>
              );
            })}
          </LogOuter>
        </Log>
      );
    });
  };

  const setPodFilterWithPodName = (podName: string) => {
    const filtered = podFilterOpts.filter((pod) => pod.podName == podName);
    if (filtered.length > 0) {
      console.log("setting filter");
      setPodFilter(filtered[0]);
    } else {
      console.log("erroring filter");
      setPodFilter({ podName: "", podNamespace: "" });
    }
  };

  const onLoadPrevious = useCallback(() => {
    if (!selectedDate) {
      setSelectedDate(dayjs(logs[0].timestamp).toDate());
      return;
    }

    moveCursor(Direction.backward);
  }, [logs, selectedDate]);

  const renderContents = () => {
    const searchBarProps = {
      // make sure all required component's inputs/Props keys&types match
      setEnteredSearchText: setEnteredSearchText,
    };
    return (
      <>
        <FlexRow>
          <Flex>
            {/* <LogSearchBar setEnteredSearchText={setEnteredSearchText} /> */}
            <LogQueryModeSelectionToggle
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
            />
            <RadioFilter
              icon={filterOutline}
              selected={podFilter.podName}
              setSelected={setPodFilterWithPodName}
              options={podFilterOpts?.map((pod) => {
                return {
                  value: pod.podName,
                  label: pod.podName,
                };
              })}
              name="Filter logs"
            />
          </Flex>
          <Flex>
            <ScrollButton onClick={() => setScrollToBottomEnabled((s) => !s)}>
              <Checkbox checked={scrollToBottomEnabled}>
                <i className="material-icons">done</i>
              </Checkbox>
              Scroll to bottom
            </ScrollButton>
            <Spacer inline width="10px" />
            <ScrollButton
              onClick={() => {
                refreshPodLogsValues();
                refresh();
              }}
            >
              <i className="material-icons">autorenew</i>
              Refresh
            </ScrollButton>
          </Flex>
        </FlexRow>
        <LogsSectionWrapper>
          <StyledLogsSection>
            {loading || !logs.length ? (
              <Loading message="Waiting for logs..." />
            ) : (
              <>
                <LoadMoreButton
                  active={
                    logs.length !== 0 && paginationInfo.previousCursor !== null
                  }
                  role="button"
                  onClick={onLoadPrevious}
                >
                  Load Previous
                </LoadMoreButton>
                {renderLogs()}
                {/* <Message>
            
            No matching logs found.
            <Highlight onClick={() => {}}>
              <i className="material-icons">autorenew</i>
              Refresh
            </Highlight>
          </Message> */}
                <LoadMoreButton
                  active={selectedDate && logs.length !== 0}
                  role="button"
                  onClick={() => moveCursor(Direction.forward)}
                >
                  Load more
                </LoadMoreButton>
              </>
            )}
            <div ref={scrollToBottomRef} />
          </StyledLogsSection>
          <NotificationWrapper
            key={JSON.stringify(logs)}
            active={!!notification}
          >
            <Banner>{notification}</Banner>
          </NotificationWrapper>
        </LogsSectionWrapper>
      </>
    );
  };

  useEffect(() => {
    // determine if the agent is installed properly - if not, start by render upgrade screen
    checkForAgent();
  }, []);

  useEffect(() => {
    if (!isPorterAgentInstalling) {
      return;
    }

    const checkForAgentInterval = setInterval(checkForAgent, 3000);

    return () => clearInterval(checkForAgentInterval);
  }, [isPorterAgentInstalling]);

  const checkForAgent = () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    api
      .detectPorterAgent("<token>", {}, { project_id, cluster_id })
      .then((res) => {
        if (res.data?.version != "v3") {
          setHasPorterAgent(false);
        } else {
          // next, check whether logs can be queried - if they can, we're good to go
          const filters = {
            revision: currentChart.version.toString(),
            match_prefix: currentChart.name,
          };

          api
            .getLogPodValues("<TOKEN>", filters, {
              project_id: currentProject.id,
              cluster_id: currentCluster.id,
            })
            .then((res) => {
              setHasPorterAgent(true);
              refreshPodLogsValues();
              setIsPorterAgentInstalling(false);
              setIsLoading(false);
            })
            .catch((err) => {
              // do nothing - this is expected while installing
              setLogsError(err);
              setIsLoading(false);
            });
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setHasPorterAgent(false);
          setIsLoading(false);
        }
      });
  };

  const installAgent = async () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    setIsPorterAgentInstalling(true);

    api
      .installPorterAgent("<token>", {}, { project_id, cluster_id })
      .then()
      .catch((err) => {
        setIsPorterAgentInstalling(false);
        console.log(err);
      });
  };

  const triggerInstall = () => {
    installAgent();
  };

  const getFilters = () => {
    return {
      release_name: currentChart.name,
      release_namespace: currentChart.namespace,
    };
  };

  return (
    isPorterAgentInstalling ? (
      <Fieldset>
        <Container row>
          <Spinner src={spinner} />
          <Spacer inline x={1} />
          <Text color="helper">The Porter agent is being installed . . .</Text>
        </Container>
      </Fieldset>
    ) : isLoading ? (
      <Fieldset>
        <Loading />
      </Fieldset>
    ) : !hasPorterAgent ? (
      <Fieldset>
        <Text size={16}>We couldn't detect the Porter agent on your cluster</Text>
        <Spacer y={0.5} />
        <Text color="helper">In order to use the events tab, you need to install the Porter agent.</Text>
        <Spacer y={1} />
        <Button onClick={() => triggerInstall()}>
          <I className="material-icons">add</I> Install Porter agent
        </Button>
      </Fieldset>
    ) : logsError ? (
      <Fieldset>
        <Container row>
          <WarnI className="material-icons">warning</WarnI> 
          <Text color="helper">Porter encountered an error retrieving logs for this application.</Text>
        </Container>
      </Fieldset>
    ) : (
      renderContents()
    )
  );
};

export default LogSection;

const I = styled.i`
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const WarnI = styled.i`
  font-size: 18px;
  display: flex;
  align-items: center;
  margin-right: 10px;
  justify-content: center;
  opacity: 0.6;
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
`;

const BackButton = styled.div`
  display: flex;
  width: 30px;
  z-index: 2;
  cursor: pointer;
  height: 30px;
  align-items: center;
  margin-right: 15px;
  justify-content: center;
  cursor: pointer;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  > i {
    font-size: 18px;
  }

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const AbsoluteTitle = styled.div`
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  padding-left: 20px;
  font-size: 18px;
  font-weight: 500;
  user-select: text;
`;

const Fullscreen = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding-top: 60px;
`;

const Icon = styled.div`
  background: #26292e;
  border-radius: 5px;
  height: 30px;
  width: 30px;
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  > i {
    font-size: 14px;
  }
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const Checkbox = styled.div<{ checked: boolean }>`
  width: 16px;
  height: 16px;
  border: 1px solid #ffffff55;
  margin: 1px 10px 0px 1px;
  border-radius: 3px;
  background: ${(props) => (props.checked ? "#ffffff22" : "#ffffff11")};
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 12px;
    padding-left: 0px;
    display: ${(props) => (props.checked ? "" : "none")};
  }
`;

const ScrollButton = styled.div`
  background: #26292e;
  border-radius: 5px;
  height: 30px;
  font-size: 13px;
  display: flex;
  cursor: pointer;
  align-items: center;
  padding: 10px;
  padding-left: 8px;
  > i {
    font-size: 16px;
    margin-right: 5px;
  }
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 25px solid transparent;
`;

const Message = styled.div`
  display: flex;
  height: 100%;
  width: calc(100% - 150px);
  align-items: center;
  justify-content: center;
  margin-left: 75px;
  text-align: center;
  color: #ffffff44;
  font-size: 13px;
`;

const Highlight = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  color: #8590ff;
  cursor: pointer;

  > i {
    font-size: 16px;
    margin-right: 3px;
  }
`;

const FlexRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const SearchBarWrapper = styled.div`
  display: flex;
  flex: 1;

  > i {
    color: #aaaabb;
    padding-top: 1px;
    margin-left: 8px;
    font-size: 16px;
    margin-right: 8px;
  }
`;

const SearchInput = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  width: 100%;
  color: white;
  height: 100%;
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  height: 30px;
  margin-right: 10px;
  background: #26292e;
  border-radius: 5px;
  border: 1px solid #aaaabb33;
`;

const SearchRowWrapper = styled(SearchRow)`
  border-radius: 5px;
  width: 250px;
`;

const StyledLogsSection = styled.div`
  width: 100%;
  min-height: 400px;
  height: calc(100vh - 460px);
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid #ffffff33;
  background: #000000;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  overflow-y: auto;
  overflow-wrap: break-word;
  position: relative;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const Log = styled.div`
  font-family: monospace;
  user-select: text;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  width: 100%;
  & > * {
    padding-block: 5px;
  }
  & > .line-timestamp {
    height: 100%;
    color: #949effff;
    opacity: 0.5;
    font-family: monospace;
    min-width: fit-content;
    padding-inline-end: 5px;
  }
  & > .line-number {
    height: 100%;
    background: #202538;
    display: inline-block;
    text-align: right;
    min-width: 45px;
    padding-inline-end: 5px;
    opacity: 0.3;
    font-family: monospace;
  }
`;

const LogOuter = styled.div`
  display: inline-block;
  word-wrap: anywhere;
  flex-grow: 1;
  font-family: monospace, sans-serif;
  font-size: 12px;
`;

const LogInnerSpan = styled.span`
  font-family: monospace, sans-serif;
  font-size: 12px;
  font-weight: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.decoration && props.ansi?.decoration == "bold" ? "700" : "400"};
  color: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.fg ? `rgb(${props.ansi?.fg})` : "white"};
  background-color: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.bg ? `rgb(${props.ansi?.bg})` : "transparent"};
`;

const LoadMoreButton = styled.div<{ active: boolean }>`
  width: 100%;
  display: ${(props) => (props.active ? "flex" : "none")};
  justify-content: center;
  align-items: center;
  padding-block: 10px;
  background: #1f2023;
  cursor: pointer;
  font-family: monospace;
`;

const ToggleOption = styled.div<{ selected: boolean; nudgeLeft?: boolean }>`
  padding: 0 10px;
  color: ${(props) => (props.selected ? "" : "#494b4f")};
  border: 1px solid #494b4f;
  height: 100%;
  display: flex;
  margin-left: ${(props) => (props.nudgeLeft ? "-1px" : "")};
  align-items: center;
  border-radius: ${(props) =>
    props.nudgeLeft ? "0 5px 5px 0" : "5px 0 0 5px"};
  :hover {
    border: 1px solid #7a7b80;
    z-index: 2;
  }
`;

const ToggleButton = styled.div`
  background: #26292e;
  border-radius: 5px;
  font-size: 13px;
  height: 30px;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const TimeIcon = styled.img<{ selected?: boolean }>`
  width: 16px;
  height: 16px;
  z-index: 2;
  opacity: ${(props) => (props.selected ? "" : "50%")};
`;

const NotificationWrapper = styled.div<{ active?: boolean }>`
  position: absolute;
  bottom: 10px;
  display: ${(props) => (props.active ? "flex" : "none")};
  justify-content: center;
  align-items: center;
  left: 50%;
  transform: translateX(-50%);
  width: fit-content;
  background: #101420;
  z-index: 9999;

  @keyframes bounceIn {
    0% {
      transform: translateZ(-1400px);
      opacity: 0;
    }
    100% {
      transform: translateZ(0);
      opacity: 1;
    }
  }
`;

const LogsSectionWrapper = styled.div`
  position: relative;
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
  border-radius: 5px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-top: 20px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#5561C0"};
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
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
  padding: 30px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 400px;
  height: 50vh;
  background: #ffffff08;
  border-radius: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;
