import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";
import { type RouteComponentProps, withRouter } from "react-router";
import Spacer from "./porter/Spacer";
import Step from "./porter/Step";
import Link from "./porter/Link";
import Text from "./porter/Text";
import Error from "./porter/Error";
import healthy from "assets/status-healthy.png";
import failure from "assets/failure.svg";
import Loading from "./Loading";
import ToggleRow from "./porter/ToggleRow";
import Container from "components/porter/Container";
import external_link from "assets/external-link.svg";
import pending from "assets/pending.svg";
import Fieldset from "./porter/Fieldset";
//import DonutChart from "./DonutChart";
// import DonutChart from "components/porter/DonutChart";

type Props = RouteComponentProps & {
  soc2Data: any
  error?: string;
  enableAll: boolean;
  setSoc2Data: (x: any) => void;
  readOnly: boolean;

};
type ItemProps = RouteComponentProps & {
  checkKey: string
  checkLabel?: string
};


const SOC2Checks: React.FC<Props> = ({ soc2Data, enableAll, setSoc2Data, readOnly }) => {

  const preflightChecks = soc2Data?.preflight_checks || {};

  const combinedKeys = new Set([
    ...Object.keys(preflightChecks)
  ]);

  useEffect(() => {

    if (enableAll) {
      const newPreflightChecks = Object.keys(preflightChecks).reduce((acc, key) => {
        acc[key] = {
          ...preflightChecks[key],
          status: preflightChecks[key].enabled ? (preflightChecks[key].status === "PENDING" ? "PENDING" : "ENABLED") : "PENDING",
        }
        return acc;
      }, {});
      setSoc2Data(prev => ({
        ...prev,
        preflight_checks: newPreflightChecks
      }));
    }
    else {
      const newPreflightChecks = Object.keys(preflightChecks).reduce((acc, key) => {
        acc[key] = {
          ...preflightChecks[key],
          status: !preflightChecks[key].enabled ? "" : (preflightChecks[key].status === "PENDING" ? "PENDING" : "ENABLED"),
        }
        return acc;
      }, {});
      setSoc2Data(prev => ({
        ...prev,
        preflight_checks: newPreflightChecks
      }));
    }
    console.log("SOC2Checks: ", soc2Data)
  }, [enableAll]);

  const PreflightCheckItem: React.FC<ItemProps> = ({ checkKey, checkLabel }) => {
    const checkData = soc2Data?.preflight_checks?.[checkKey];
    const hasMessage = checkData?.message;
    const enabled = checkData?.enabled;
    const status = checkData?.status;

    const [isExpanded, setIsExpanded] = useState(true);

    const handleToggle = (): void => {
      if (hasMessage && enabled) {
        setIsExpanded(!isExpanded);
      }
    };

    const handleEnable = (): void => {
      setSoc2Data(prev => ({
        ...prev,
        preflight_checks: {
          ...prev.preflight_checks,
          [checkKey]: {
            ...prev.preflight_checks[checkKey],
            enabled: !prev.preflight_checks[checkKey].enabled,
            status: !prev.preflight_checks[checkKey].enabled ? "PENDING" : !prev.preflight_checks[checkKey].enabled ? "ENABLED" : "",
          }
        }
      }));
    };

    return (
      <CheckItemContainer hasMessage={hasMessage} > {/* Pass isExpanded as a prop */}
        < CheckItemTop onClick={handleToggle} >
          {status === "LOADING" &&
            <Loading
              offset="0px"
              width="20px"
              height="20px" />
          }
          {status === "PENDING" &&
            <StatusIcon src={pending} />
          }
          {status === "ENABLED" &&
            <StatusIcon src={healthy} />
          }
          {status === "" &&
            <StatusIcon height="10px" src={failure} />
          }
          <Spacer inline x={1} />
          <Text style={{ marginLeft: '10px', flex: 1 }}>{checkLabel}</Text>
          {
            enabled && <ExpandIcon className="material-icons" isExpanded={isExpanded}>
              arrow_drop_down
            </ExpandIcon>
          }
        </CheckItemTop >
        {
          isExpanded && hasMessage && (
            <div style={{ marginLeft: '15px' }}>
              <Spacer y={.5} />
              <Text>
                {checkData?.message}
              </Text>
              <Spacer y={.5} />
              {checkData?.metadata &&
                Object.entries(checkData.metadata).map(([key, value]) => (
                  <>
                    <div key={key}>
                      <ErrorMessageLabel>{key}:</ErrorMessageLabel>
                      <ErrorMessageContent>{value}</ErrorMessageContent>
                    </div>
                  </>
                ))}
              <Spacer y={.5} />

              {!checkData?.hideToggle &&
                <>
                  <Container row spaced style={{ marginRight: '10px' }}>
                    <ToggleRow
                      isToggled={enabled || enableAll}
                      onToggle={() => {
                        handleEnable();
                      }}
                      disabled={readOnly || enableAll || (enabled && checkData?.locked && status !== "PENDING")}
                      disabledTooltip={enableAll ? "Global SOC 2 setting must be disabled to toggle this" : checkData?.disabledTooltip}
                    >
                      <Container row>
                        <Text>{checkData.enabledField}</Text>
                        <Spacer inline x={1} />
                        <Text color="helper">{checkData.info}</Text>
                      </Container>
                    </ToggleRow>


                    {
                      checkData.link &&
                      <Link
                        onClick={() => {
                          window.open(checkData.link, "_blank");
                        }}
                      >
                        <TagIcon src={external_link} />
                        More Info
                      </Link>
                    }
                  </Container>
                  <Spacer y={.5} />
                </>
              }
            </div>
          )
        }
      </CheckItemContainer >
    );
  };
  return (

    <><Spacer y={1} />
      <>
        {/* <Fieldset>
        <DonutChart soc2Data={soc2Data} />
      </Fieldset> */}
        <Spacer y={1} />
        <AppearingDiv>
          {Array.from(combinedKeys).map((checkKey) => (
            <PreflightCheckItem
              key={checkKey}
              checkKey={checkKey}
              checkLabel={checkKey} />
          ))}
        </AppearingDiv></></>

  )
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
height: ${props => props.height ? props.height : '14px'};
`;

const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: ${props => props.isExpanded ? '2px solid #3a48ca' : '1px solid ' + props.theme.border}; // Thicker and blue border if expanded
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  cursor: ${props => (props.hasMessage ? 'pointer' : 'default')};
  background: ${props => props.theme.clickable.bg};
`;



const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${props => props.theme.clickable.bg};
`;

const ExpandIcon = styled.i<{ isExpanded: boolean }>`
  margin-left: 8px;
  color: #ffffff66;
  font-size: 20px;
  cursor: pointer;
  border-radius: 20px;
  transform: ${props => props.isExpanded ? "" : "rotate(-90deg)"};
`;
const ErrorMessageLabel = styled.span`
  font-weight: bold;
  margin-left: 10px;
`;
const ErrorMessageContent = styled.div`
  font-family: 'Courier New', Courier, monospace;
  padding: 5px 10px;
  border-radius: 4px;
  margin-left: 10px;
  user-select: text;
  cursor: text
`;
const TagIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;
