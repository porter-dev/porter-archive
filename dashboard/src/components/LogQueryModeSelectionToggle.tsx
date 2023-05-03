import DateTimePicker from "components/date-time-picker/DateTimePicker";
import dayjs from "dayjs";
import time from "assets/time.svg";
import React from "react";
import styled from "styled-components";

interface LogQueryModeSelectionToggleProps {
  selectedDate?: Date;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
}

const LogQueryModeSelectionToggle = (
  props: LogQueryModeSelectionToggleProps
) => {
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

export default LogQueryModeSelectionToggle;

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
