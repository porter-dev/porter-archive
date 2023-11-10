import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import dayjs, { type Dayjs } from "dayjs";
import _ from "lodash";
import { useLocation } from "react-router";
import { useTimer } from "react-timer-hook";
import styled from "styled-components";

import Loading from "components/Loading";
import LogQueryModeSelectionToggle from "components/LogQueryModeSelectionToggle";
import LogSearchBar from "components/LogSearchBar";
import Banner from "components/porter/Banner";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
import Filter from "components/porter/Filter";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useIntercom } from "lib/hooks/useIntercom";
import { useRevisionList } from "lib/hooks/useRevisionList";

import api from "shared/api";
import spinner from "assets/loading.gif";

import { useLatestRevision } from "../../app-view/LatestRevisionContext";
import StyledLogs from "../../expanded-app/logs/StyledLogs";
import {
  Direction,
  GenericFilter,
  GenericFilterOption,
  type FilterName,
} from "../../expanded-app/logs/types";
import { useLogs } from "./utils";

type Props = {
  projectId: number;
  clusterId: number;
  appName: string;
  serviceNames: string[];
  deploymentTargetId: string;
  appRevisionId?: string;
  logFilterNames?: FilterName[];
  timeRange?: {
    startTime?: Dayjs;
    endTime?: Dayjs;
  };
  filterPredeploy?: boolean;
  appId: number;
  selectedService?: string;
  selectedRevisionId?: string;
  defaultScrollToBottomEnabled?: boolean;
  defaultLatestRevision?: boolean;
  jobRunID?: string;
};

const DEFAULT_LOG_TIMEOUT_SECONDS = 60;

const Logs: React.FC<Props> = ({
  projectId,
  clusterId,
  appName,
  serviceNames,
  deploymentTargetId,
  appRevisionId,
  timeRange,
  logFilterNames = ["service_name", "revision", "output_stream"], // these are the names of filters that will be displayed in the UI
  filterPredeploy = false,
  appId,
  selectedService,
  selectedRevisionId,
  defaultScrollToBottomEnabled = true,
  defaultLatestRevision = true,
  jobRunID = "",
}) => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const logQueryParamOpts = {
    revision: queryParams.get("version"),
    output_stream: queryParams.get("output_stream"),
    service: queryParams.get("service"),
    revision_id: queryParams.get("revision_id"),
  };

  const scrollToBottomRef = useRef<HTMLDivElement | null>(null);
  const [scrollToBottomEnabled, setScrollToBottomEnabled] = useState(
    defaultScrollToBottomEnabled
  );
  const [enteredSearchText, setEnteredSearchText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [notification, setNotification] = useState<string>();

  const [hasPorterAgent, setHasPorterAgent] = useState(true);
  const [isPorterAgentInstalling, setIsPorterAgentInstalling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedFilterValues, setSelectedFilterValues] = useState<
    Record<FilterName, string>
  >({
    service_name:
      logQueryParamOpts.service ??
      selectedService ??
      GenericFilter.getDefaultOption("service_name").value,
    pod_name: "", // not supported in v2
    revision:
      logQueryParamOpts.revision ??
      GenericFilter.getDefaultOption("revision").value, // refers to revision number
    output_stream:
      logQueryParamOpts.output_stream ??
      GenericFilter.getDefaultOption("output_stream").value,
    revision_id:
      logQueryParamOpts.revision_id ??
      selectedRevisionId ??
      GenericFilter.getDefaultOption("revision_id").value,
  });
  // for some reason the filters were not being updated when the service name or revision number changed in the notification feed, so this ensures it
  useEffect(() => {
    setSelectedFilterValues({
      ...selectedFilterValues,
      service_name:
        logQueryParamOpts.service ??
        selectedService ??
        GenericFilter.getDefaultOption("service_name").value,
      revision_id:
        logQueryParamOpts.revision_id ??
        selectedRevisionId ??
        GenericFilter.getDefaultOption("revision_id").value,
    });
  }, [selectedService, selectedRevisionId]);

  const { revisionIdToNumber } = useRevisionList({
    appName,
    deploymentTargetId,
    projectId,
    clusterId,
  });
  const {
    latestRevision: { revision_number: latestRevisionNumber },
  } = useLatestRevision();

  const { showIntercomWithMessage } = useIntercom();

  const isAgentVersionUpdated = (agentImage: string | undefined): boolean => {
    if (agentImage == null) {
      return false;
    }
    const version = agentImage.split(":").pop();
    if (version === "dev") {
      return true;
    }
    // make sure version is above v3.1.3
    if (version == null) {
      return false;
    }
    const versionParts = version.split(".");
    if (versionParts.length < 3) {
      return false;
    }
    const major = parseInt(versionParts[0]);
    const minor = parseInt(versionParts[1]);
    const patch = parseInt(versionParts[2]);
    if (major < 3) {
      return false;
    } else if (major > 3) {
      return true;
    }
    if (minor < 1) {
      return false;
    } else if (minor > 1) {
      return true;
    }
    return patch >= 7;
  };

  const createVersionOptions = (number: number): GenericFilterOption[] => {
    return Array.from({ length: number }, (_, index) => {
      const version = index + 1;
      const label =
        version === number
          ? `Version ${version} (latest)`
          : `Version ${version}`;
      const value = version.toString();
      return GenericFilterOption.of(label, value);
    })
      .reverse()
      .slice(0, 3);
  };

  const [filters, setFilters] = useState<GenericFilter[]>(
    [
      {
        name: "service_name",
        displayName: "Service",
        default: GenericFilter.getDefaultOption("service_name"),
        options:
          serviceNames.map((s) => {
            return GenericFilterOption.of(s, s);
          }) ?? [],
        setValue: (value: string) => {
          setSelectedFilterValues((s) => ({
            ...s,
            service_name: value,
          }));
        },
      } satisfies GenericFilter,
      {
        name: "revision",
        displayName: "Version",
        default: GenericFilter.getDefaultOption("revision"),
        options: createVersionOptions(latestRevisionNumber),
        setValue: (value: string) => {
          setSelectedFilterValues((s) => ({
            ...s,
            revision: value,
          }));
        },
      } satisfies GenericFilter,
      {
        name: "output_stream",
        displayName: "Output Stream",
        default: GenericFilter.getDefaultOption("output_stream"),
        options: [
          GenericFilterOption.of("stdout", "stdout"),
          GenericFilterOption.of("stderr", "stderr"),
        ],
        setValue: (value: string) => {
          setSelectedFilterValues((s) => ({
            ...s,
            output_stream: value,
          }));
        },
      } satisfies GenericFilter,
    ].filter((f: GenericFilter) => logFilterNames.includes(f.name))
  );

  const notify = (message: string): void => {
    setNotification(message);

    setTimeout(() => {
      setNotification(undefined);
    }, 5000);
  };

  const { logs, refresh, moveCursor, paginationInfo, stopLogStream } = useLogs({
    projectID: projectId,
    clusterID: clusterId,
    selectedFilterValues,
    appName,
    deploymentTargetId,
    searchParam: enteredSearchText,
    notify,
    setLoading: setIsLoading,
    revisionIdToNumber,
    setDate: selectedDate,
    appRevisionId,
    filterPredeploy,
    timeRange,
    appID: appId,
    jobRunID,
  });

  const {
    totalSeconds,
    isRunning,
    pause: pauseLogTimeout,
    restart: restartLogTimeout,
  } = useTimer({
    expiryTimestamp: dayjs()
      .add(DEFAULT_LOG_TIMEOUT_SECONDS, "seconds")
      .toDate(),
    onExpire: () => {
      stopLogStream();
      showIntercomWithMessage({
        message: "I am having trouble receiving logs from my application.",
      });
    },
  });

  useEffect(() => {
    if (logs.length) {
      pauseLogTimeout();
    }
  }, [logs.length]);

  useEffect(() => {
    setFilters(
      [
        {
          name: "service_name",
          displayName: "Service",
          default: GenericFilter.getDefaultOption("service_name"),
          options:
            serviceNames.map((s) => {
              return GenericFilterOption.of(s, s);
            }) ?? [],
          setValue: (value: string) => {
            setSelectedFilterValues((s) => ({
              ...s,
              service_name: value,
            }));
          },
        } satisfies GenericFilter,
        {
          name: "revision",
          displayName: "Version",
          default: GenericFilter.getDefaultOption("revision"),
          options: createVersionOptions(latestRevisionNumber),
          setValue: (value: string) => {
            setSelectedFilterValues((s) => ({
              ...s,
              revision: value,
            }));
          },
        } satisfies GenericFilter,
        {
          name: "output_stream",
          displayName: "Output Stream",
          default: GenericFilter.getDefaultOption("output_stream"),
          options: [
            GenericFilterOption.of("stdout", "stdout"),
            GenericFilterOption.of("stderr", "stderr"),
          ],
          setValue: (value: string) => {
            setSelectedFilterValues((s) => ({
              ...s,
              output_stream: value,
            }));
          },
        } satisfies GenericFilter,
      ].filter((f: GenericFilter) => logFilterNames.includes(f.name))
    );

    // default to filter by latest revision number if no revision-related filter options are selected
    if (
      latestRevisionNumber &&
      selectedFilterValues.revision ===
        GenericFilter.getDefaultOption("revision").value &&
      selectedFilterValues.revision_id ===
        GenericFilter.getDefaultOption("revision_id").value &&
      defaultLatestRevision
    ) {
      setSelectedFilterValues({
        ...selectedFilterValues,
        revision: latestRevisionNumber.toString(),
      });
    }
  }, [latestRevisionNumber]);

  useEffect(() => {
    if (!isLoading && scrollToBottomRef.current && scrollToBottomEnabled) {
      const scrollPosition =
        scrollToBottomRef.current.offsetTop +
        scrollToBottomRef.current.offsetHeight -
        window.innerHeight;
      scrollToBottomRef.current.scrollIntoView({
        behavior: "smooth",
        top: scrollPosition,
      });
    }
  }, [isLoading, logs, scrollToBottomRef, scrollToBottomEnabled]);

  const onLoadPrevious = useCallback(() => {
    if (!selectedDate) {
      setSelectedDate(dayjs(logs[0].timestamp).toDate());
      return;
    }

    void moveCursor(Direction.backward);
  }, [logs, selectedDate]);

  const setSelectedDateIfUndefined = (): void => {
    if (selectedDate == null) {
      setSelectedDate(dayjs().toDate());
    }
  };

  const renderContents = (): JSX.Element => {
    return (
      <>
        <FlexRow>
          <Flex>
            <LogSearchBar
              searchText={searchText}
              setSearchText={setSearchText}
              setEnteredSearchText={setEnteredSearchText}
              setSelectedDate={setSelectedDateIfUndefined}
            />
            <Spacer inline x={1} />
            <LogQueryModeSelectionToggle
              selectedDate={selectedDate ?? timeRange?.endTime?.toDate()}
              setSelectedDate={setSelectedDate}
            />
          </Flex>
          <Flex>
            <Filter
              filters={filters}
              selectedFilterValues={selectedFilterValues}
            />
            <Spacer inline x={1} />
            <ScrollButton
              onClick={() => {
                setScrollToBottomEnabled((s) => !s);
              }}
            >
              <Checkbox checked={scrollToBottomEnabled}>
                <i className="material-icons">done</i>
              </Checkbox>
              Scroll to bottom
            </ScrollButton>
            <Spacer inline x={1} />
            <ScrollButton
              onClick={async () => {
                restartLogTimeout(
                  dayjs().add(DEFAULT_LOG_TIMEOUT_SECONDS, "seconds").toDate()
                );
                await refresh({
                  isLive: selectedDate == null && timeRange?.endTime == null,
                });
              }}
            >
              <i className="material-icons">autorenew</i>
              Refresh
            </ScrollButton>
          </Flex>
        </FlexRow>
        <Spacer y={0.5} />
        <LogsSectionWrapper>
          <StyledLogsSection>
            {isLoading && <Loading message={"Initializing..."} />}
            {!isLoading && logs.length !== 0 && (
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
                <StyledLogs logs={logs} filters={filters} appName={appName} />
                <LoadMoreButton
                  active={selectedDate != null && logs.length !== 0}
                  role="button"
                  onClick={async () => {
                    await moveCursor(Direction.forward);
                  }}
                >
                  Load more
                </LoadMoreButton>
              </>
            )}
            {!isLoading && logs.length === 0 && selectedDate != null && (
              <Message>
                No logs found for this time range.
                <Highlight
                  onClick={() => {
                    setSelectedDate(undefined);
                  }}
                >
                  <i className="material-icons">autorenew</i>
                  Reset
                </Highlight>
              </Message>
            )}
            {!isLoading &&
              logs.length === 0 &&
              selectedDate == null &&
              isRunning && (
                <Loading
                  message={`Waiting ${totalSeconds} seconds for logs...`}
                />
              )}
            {!isLoading &&
              logs.length === 0 &&
              selectedDate == null &&
              !isRunning && (
                <Message>
                  Timed out waiting for logs.
                  <Highlight
                    onClick={async () => {
                      restartLogTimeout(
                        dayjs()
                          .add(DEFAULT_LOG_TIMEOUT_SECONDS, "seconds")
                          .toDate()
                      );
                      await refresh({
                        isLive:
                          selectedDate == null && timeRange?.endTime == null,
                      });
                    }}
                  >
                    <i className="material-icons">autorenew</i>
                    Refresh
                  </Highlight>
                </Message>
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
    void checkForAgent();
  }, []);

  useEffect(() => {
    if (!isPorterAgentInstalling) {
      return;
    }

    const checkForAgentInterval = setInterval(checkForAgent, 3000);

    return () => {
      clearInterval(checkForAgentInterval);
    };
  }, [isPorterAgentInstalling]);

  const checkForAgent = async (): Promise<void> => {
    try {
      const res = await api.detectPorterAgent(
        "<token>",
        {},
        { project_id: projectId, cluster_id: clusterId }
      );

      setHasPorterAgent(true);

      const agentImage = res.data?.image;
      if (!isAgentVersionUpdated(agentImage)) {
        notify("Porter agent is outdated. Please upgrade to see logs.");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setHasPorterAgent(false);
      }
    }
  };

  const installAgent = async (): Promise<void> => {
    setIsPorterAgentInstalling(true);

    api
      .installPorterAgent(
        "<token>",
        {},
        { project_id: projectId, cluster_id: clusterId }
      )
      .then()
      .catch(() => {
        setIsPorterAgentInstalling(false);
      });
  };

  const triggerInstall = (): void => {
    void installAgent();
  };

  return isPorterAgentInstalling ? (
    <Fieldset>
      <Container row>
        <Spinner src={spinner} />
        <Spacer inline x={1} />
        <Text color="helper">The Porter agent is being installed . . .</Text>
      </Container>
    </Fieldset>
  ) : !hasPorterAgent ? (
    <Fieldset>
      <Text size={16}>
        {"We couldn't detect the Porter agent on your cluster"}
      </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        In order to use the Logs tab, you need to install the Porter agent.
      </Text>
      <Spacer y={1} />
      <Button
        onClick={() => {
          triggerInstall();
        }}
      >
        <I className="material-icons">add</I> Install Porter agent
      </Button>
    </Fieldset>
  ) : (
    renderContents()
  );
};

export default Logs;

const I = styled.i`
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
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
  background: ${(props) => props.theme.fg};
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
`;

const Message = styled.div`
  display: flex;
  height: 100%;
  width: calc(100% - 150px);
  align-items: center;
  justify-content: center;
  margin-left: 75px;
  text-align: center;
  font-size: 13px;
  color: #aaaabb;
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

const StyledLogsSection = styled.div`
  width: 100%;
  height: 600px;
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
