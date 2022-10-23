import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import styled from "styled-components";
import RadioFilter from "components/RadioFilter";

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
import Banner from "components/Banner";

export type InitLogData = Partial<{
  podName: string;
  timestamp: string;
  revision: string;
}>;

type Props = {
  currentChart?: ChartType;
  isFullscreen: boolean;
  setIsFullscreen: (x: boolean) => void;
  initData?: InitLogData;
  setInitData?: (initData: InitLogData) => void;
  overridingPodName?: string;
};

const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

interface QueryModeSelectionToggleProps {
  selectedDate?: Date;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
}

const QueryModeSelectionToggle = (props: QueryModeSelectionToggleProps) => {
  return (
    <div
      style={{
        marginRight: "10px",
        display: "flex",
        gap: "10px",
      }}
    >
      <ToggleButton>
        <ToggleOption
          onClick={() => props.setSelectedDate(undefined)}
          selected={!props.selectedDate}
        >
          <Dot selected={!props.selectedDate} />
          Live
        </ToggleOption>
        <ToggleOption
          nudgeLeft
          onClick={() => props.setSelectedDate(dayjs().toDate())}
          selected={!!props.selectedDate}
        >
          <TimeIcon src={time} selected={!!props.selectedDate} />
          {props.selectedDate && (
            <DateTimePicker
              startDate={props.selectedDate}
              setStartDate={props.setSelectedDate}
            />
          )}
        </ToggleOption>
      </ToggleButton>
    </div>
  );
};

const Dot = styled.div<{ selected?: boolean }>`
  display: inline-black;
  width: 8px;
  height: 8px;
  margin-right: 9px;
  border-radius: 20px;
  background: ${(props) => (props.selected ? "#ed5f85" : "#ffffff22")};
  border: 0px;
  outline: none;
  box-shadow: ${(props) => (props.selected ? "0px 0px 5px 1px #ed5f85" : "")};
`;

const LogsSection: React.FC<Props> = ({
  currentChart,
  isFullscreen,
  setIsFullscreen,
  initData = {},
  setInitData,
  overridingPodName,
}) => {
  const scrollToBottomRef = useRef<HTMLDivElement | undefined>(undefined);
  const { currentProject, currentCluster } = useContext(Context);
  const [podFilter, setPodFilter] = useState(
    initData.podName || overridingPodName
  );
  const [podFilterOpts, setPodFilterOpts] = useState<string[]>(
    initData?.podName
      ? _.compact([initData.podName])
      : overridingPodName
      ? _.compact([overridingPodName])
      : []
  );
  const [scrollToBottomEnabled, setScrollToBottomEnabled] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [enteredSearchText, setEnteredSearchText] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initData.timestamp ? dayjs(initData.timestamp).toDate() : undefined
  );
  const [notification, setNotification] = useState<string>();

  const notify = (message: string) => {
    setNotification(message);

    setTimeout(() => {
      setNotification(undefined);
    }, 3000);
  };

  const { loading, logs, refresh, moveCursor, paginationInfo } = useLogs(
    podFilter,
    currentChart.namespace,
    enteredSearchText,
    notify,
    currentChart,
    selectedDate
  );

  useEffect(() => {
    if (overridingPodName) {
      return;
    }

    api
      .getLogPodValues(
        "<TOKEN>",
        {
          namespace: currentChart?.namespace,
          revision: initData.revision ?? currentChart.version.toString(),
          match_prefix: currentChart.name,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res: any) => {
        setPodFilterOpts(_.uniq(res.data ?? []));

        // only set pod filter if the current pod is not found in the resulting data
        if (!res.data?.includes(podFilter)) {
          setPodFilter(res.data[0]);
        }
      });
  }, [initData]);

  useEffect(() => {
    if (!loading && scrollToBottomRef.current && scrollToBottomEnabled) {
      scrollToBottomRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [loading, logs, scrollToBottomRef, scrollToBottomEnabled]);

  useEffect(() => {
    if (initData.podName) {
      setPodFilter(initData.podName);
    }

    if (initData.timestamp) {
      setSelectedDate(dayjs(initData.timestamp).toDate());
    }
  }, [initData]);

  const renderLogs = () => {
    return logs?.map((log, i) => {
      return (
        <Log key={[log.lineNumber, i].join(".")}>
          <span className="line-number">{log.lineNumber}.</span>
          <span className="line-timestamp">
            {dayjs(log.timestamp).format("MMM D, YYYY HH:mm:ss")}
          </span>
          {log.line?.map((ansi, j) => {
            if (ansi.clearLine) {
              return null;
            }

            return (
              <LogSpan key={[log.lineNumber, i, j].join(".")} ansi={ansi}>
                {ansi.content.replace(/ /g, "\u00a0")}
              </LogSpan>
            );
          })}
        </Log>
      );
    });
  };

  const onLoadPrevious = useCallback(() => {
    if (!selectedDate) {
      setSelectedDate(dayjs(logs[0].timestamp).toDate());
      return;
    }

    moveCursor(Direction.backward);
  }, [logs, selectedDate]);

  const renderContents = () => {
    return (
      <>
        <FlexRow isFullscreen={isFullscreen}>
          <Flex>
            <SearchRowWrapper>
              <SearchBarWrapper>
                <i className="material-icons">search</i>
                <SearchInput
                  value={searchText}
                  onChange={(e: any) => {
                    setSearchText(e.target.value);
                  }}
                  onKeyPress={(event) => {
                    if (event.key === "Enter") {
                      setEnteredSearchText(escapeRegExp(searchText));
                    }
                  }}
                  placeholder="Search logs..."
                />
              </SearchBarWrapper>
            </SearchRowWrapper>
            <QueryModeSelectionToggle
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
            />
            <RadioFilter
              icon={filterOutline}
              selected={podFilter}
              setSelected={setPodFilter}
              options={podFilterOpts?.map((name) => {
                return {
                  value: name,
                  label: name,
                };
              })}
              name="Filter logs"
            />
          </Flex>
          <Flex>
            <Button onClick={() => setScrollToBottomEnabled((s) => !s)}>
              <Checkbox checked={scrollToBottomEnabled}>
                <i className="material-icons">done</i>
              </Checkbox>
              Scroll to bottom
            </Button>
            <Spacer />
            <Button onClick={() => refresh()}>
              <i className="material-icons">autorenew</i>
              Refresh
            </Button>
            {!isFullscreen && (
              <>
                <Spacer />
                <Icon onClick={() => setIsFullscreen(true)}>
                  <i className="material-icons">open_in_full</i>
                </Icon>
              </>
            )}
          </Flex>
        </FlexRow>
        <StyledLogsSection isFullscreen={isFullscreen}>
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
          <NotificationWrapper active={!!notification}>
            <Banner>{notification}</Banner>
          </NotificationWrapper>
        </StyledLogsSection>
      </>
    );
  };

  return (
    <>
      {isFullscreen ? (
        <Fullscreen>
          <AbsoluteTitle>
            <BackButton onClick={() => setIsFullscreen(false)}>
              <i className="material-icons">navigate_before</i>
            </BackButton>
            Logs ({currentChart.name})
          </AbsoluteTitle>
          {renderContents()}
        </Fullscreen>
      ) : (
        <>{renderContents()}</>
      )}
    </>
  );
};

export default LogsSection;

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

const Spacer = styled.div<{ width?: string }>`
  height: 100%;
  width: ${(props) => props.width || "10px"};
`;

const Button = styled.div`
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

const FlexRow = styled.div<{ isFullscreen?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-top: ${(props) => (props.isFullscreen ? "10px" : "")};
  padding: ${(props) => (props.isFullscreen ? "0 20px" : "")};
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

const StyledLogsSection = styled.div<{ isFullscreen: boolean }>`
  width: 100%;
  min-height: 400px;
  height: ${(props) =>
    props.isFullscreen ? "calc(100vh - 125px)" : "calc(100vh - 460px)"};
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 13px;
  border-radius: ${(props) => (props.isFullscreen ? "" : "8px")};
  border: ${(props) => (props.isFullscreen ? "" : "1px solid #ffffff33")};
  border-top: ${(props) => (props.isFullscreen ? "1px solid #ffffff33" : "")};
  background: #101420;
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

const LogSpan = styled.span`
  display: inline-block;
  word-wrap: anywhere;
  flex-grow: 1;
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
  padding-inline: 10px;
  background: #101420;
  animation: bounceIn 0.3s ease-out;

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
