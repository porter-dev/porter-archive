import React, { useEffect, useState } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";

import Container from "components/porter/Container";

import external_link from "assets/external-link.svg";
import failure from "assets/failure.svg";
import pending from "assets/pending.svg";
import healthy from "assets/status-healthy.png";

import Loading from "./Loading";
import Link from "./porter/Link";
import Spacer from "./porter/Spacer";
import Text from "./porter/Text";
import ToggleRow from "./porter/ToggleRow";

type Props = RouteComponentProps & {
  soc2Data: unknown;
  error?: string;
  enableAll: boolean;
  setSoc2Data: (x: unknown) => void;
  readOnly: boolean;
};
type ItemProps = RouteComponentProps & {
  checkKey: string;
  checkLabel?: string;
};

const SOC2Checks: React.FC<Props> = ({
  soc2Data,
  enableAll,
  setSoc2Data,
  readOnly,
}) => {
  // const { soc2Data, setSoc2Data } = useContext(Context);
  const soc2Checks = soc2Data?.soc2_checks || {};

  const combinedKeys = new Set([...Object.keys(soc2Checks)]);

  useEffect(() => {
    if (enableAll) {
      const newSOC2Checks = Object.keys(soc2Checks).reduce((acc, key) => {
        acc[key] = {
          ...soc2Checks[key],
          status: soc2Checks[key].enabled
            ? soc2Checks[key].status === "PENDING_ENABLED"
              ? "PENDING_ENABLED"
              : "ENABLED"
            : "PENDING_ENABLED",
        };
        return acc;
      }, {});
      setSoc2Data((prev) => ({
        ...prev,
        soc2_checks: newSOC2Checks,
      }));
    } else {
      const newSOC2Checks = Object.keys(soc2Checks).reduce((acc, key) => {
        acc[key] = {
          ...soc2Checks[key],
          status: !soc2Checks[key].enabled
            ? ""
            : soc2Checks[key].status === "PENDING_ENABLED"
            ? "PENDING_ENABLED"
            : "ENABLED",
        };
        return acc;
      }, {});
      setSoc2Data((prev) => ({
        ...prev,
        soc2_checks: newSOC2Checks,
      }));
    }
  }, [enableAll]);

  const Soc2Item: React.FC<ItemProps> = ({ checkKey, checkLabel }) => {
    const checkData = soc2Data?.soc2_checks?.[checkKey];
    const hasMessage = checkData?.message;
    const enabled = checkData?.enabled;
    const status = checkData?.status;

    const [isExpanded, setIsExpanded] = useState(true);

    const handleToggle = (): void => {
      if (hasMessage && enabled) {
        setIsExpanded(!isExpanded);
      }
    };

    const determineStatus = (currentStatus: string): string => {
      if (currentStatus === "ENABLED") {
        return "PENDING_DISABLED";
      }
      if (currentStatus === "PENDING_DISABLED") {
        return "ENABLED";
      }
      if (currentStatus === "PENDING_ENABLED") {
        return "";
      }
      if (currentStatus === "") {
        return "PENDING_ENABLED";
      }
    };

    const handleEnable = (): void => {
      setSoc2Data((prev) => ({
        ...prev,
        soc2_checks: {
          ...prev.soc2_checks,
          [checkKey]: {
            ...prev.soc2_checks[checkKey],
            enabled: !prev.soc2_checks[checkKey].enabled,
            status: determineStatus(prev.soc2_checks[checkKey].status),
          },
        },
      }));
    };

    return (
      <CheckItemContainer hasMessage={hasMessage}>
        {" "}
        {/* Pass isExpanded as a prop */}
        <CheckItemTop onClick={handleToggle}>
          {status === "LOADING" && (
            <Loading offset="0px" width="20px" height="20px" />
          )}
          {status === "PENDING_ENABLED" && <StatusIcon src={pending} />}
          {status === "ENABLED" && <StatusIcon src={healthy} />}
          {(status === "" || status === "PENDING_DISABLED") && (
            <StatusIcon height="10px" src={failure} />
          )}
          <Spacer inline x={1} />
          <Text style={{ marginLeft: "10px", flex: 1 }}>{checkLabel}</Text>
          {enabled && (
            <ExpandIcon className="material-icons" isExpanded={isExpanded}>
              arrow_drop_down
            </ExpandIcon>
          )}
        </CheckItemTop>
        {isExpanded && hasMessage && (
          <div style={{ marginLeft: "10px" }}>
            <Spacer y={0.5} />
            <Text>{checkData?.message}</Text>
            <Spacer y={0.5} />
            {checkData?.metadata &&
              Object.entries(checkData.metadata).map(([key, value]) => (
                <>
                  <div key={key}>
                    <ErrorMessageLabel>{key}:</ErrorMessageLabel>
                    <ErrorMessageContent>{value}</ErrorMessageContent>
                  </div>
                </>
              ))}
            <Spacer y={0.5} />

            {!checkData?.hideToggle && (
              <>
                <Container row spaced style={{ marginRight: "10px" }}>
                  <ToggleRow
                    isToggled={enabled || enableAll}
                    onToggle={() => {
                      handleEnable();
                    }}
                    disabled={
                      readOnly ||
                      enableAll ||
                      (enabled &&
                        checkData?.locked &&
                        status !== "PENDING_ENABLED")
                    }
                    disabledTooltip={
                      readOnly
                        ? "Wait for provisioning to complete before editing this field."
                        : enableAll
                        ? "Global SOC 2 setting must be disabled to toggle this"
                        : checkData?.disabledTooltip
                    }
                  >
                    <Container row>
                      <Text>{checkData.enabledField}</Text>
                      <Spacer inline x={1} />
                      <Text color="helper">{checkData.info}</Text>
                    </Container>
                  </ToggleRow>

                  {checkData.link && (
                    <Link
                      onClick={() => {
                        window.open(checkData.link, "_blank");
                      }}
                    >
                      <TagIcon src={external_link} />
                      More Info
                    </Link>
                  )}
                </Container>
                <Spacer y={0.5} />
              </>
            )}
          </div>
        )}
      </CheckItemContainer>
    );
  };
  return (
    <>
      <>
        {/* <Fieldset>
        <DonutChart soc2Data={soc2Data} />
      </Fieldset> */}
        <Spacer y={1} />
        <AppearingDiv>
          {Array.from(combinedKeys).map((checkKey) => (
            <Soc2Item
              key={checkKey}
              checkKey={checkKey}
              checkLabel={checkKey}
            />
          ))}
        </AppearingDiv>
      </>
    </>
  );
};

export default withRouter(SOC2Checks);

const AppearingDiv = styled.div<{ color?: string }>`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  flex-direction: column;
  color: ${(props) => props.color || "#ffffff44"};

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
const StatusIcon = styled.img`
  height: ${(props) => (props.height ? props.height : "14px")};
`;

const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: ${(props) =>
    props.isExpanded
      ? "2px solid #3a48ca"
      : "1px solid " +
        props.theme.border}; // Thicker and blue border if expanded
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  cursor: ${(props) => (props.hasMessage ? "pointer" : "default")};
  background: ${(props) => props.theme.clickable.bg};
`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${(props) => props.theme.clickable.bg};
`;

const ExpandIcon = styled.i<{ isExpanded: boolean }>`
  margin-left: 8px;
  color: #ffffff66;
  font-size: 20px;
  cursor: pointer;
  border-radius: 20px;
  transform: ${(props) => (props.isExpanded ? "" : "rotate(-90deg)")};
`;
const ErrorMessageLabel = styled.span`
  font-weight: bold;
  margin-left: 10px;
`;
const ErrorMessageContent = styled.div`
  font-family: "Courier New", Courier, monospace;
  padding: 5px 10px;
  border-radius: 4px;
  margin-left: 10px;
  user-select: text;
  cursor: text;
`;
const TagIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;
