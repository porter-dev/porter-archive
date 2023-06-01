import React, { useState } from "react";

import DatePicker from "react-datepicker";
import time from "assets/time.svg";

import styled from "styled-components";
import "./react-datepicker.css";

type Props = {
  startDate: any;
  setStartDate: any;
};

const DateTimePicker: React.FC<Props> = ({ startDate, setStartDate }) => {
  const maxDate = new Date();
  const minDate = new Date(maxDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const minTimeMaxDay = new Date(maxDate);
  minTimeMaxDay.setHours(0, 0, 0, 0);
  const maxTimeMinDay = new Date(minDate);
  maxTimeMinDay.setHours(23, 59, 0, 0);

  const availableDates = [];
  let currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    availableDates.push(new Date(currentDate));
    currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }

  console.log(availableDates);

  console.log(startDate);

  console.log("startDateString", startDate.toDateString());
  console.log("minDateString", minDate.toDateString());

  const isMinDay = startDate.toDateString() === minDate.toDateString();
  const isMaxDay = startDate.toDateString() === maxDate.toDateString();

  console.log("isMinDay", isMinDay);
  console.log("isMaxDay", isMaxDay);

  const minTime = isMinDay ? minDate : isMaxDay ? minTimeMaxDay : null;
  const maxTime = isMaxDay ? maxDate : isMinDay ? maxTimeMinDay : null;

  console.log("minTime", minTime);
  console.log("maxTime", maxTime);

  return (
    <DateTimePickerWrapper
      onClick={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      <Bar />
      <StyledDatePicker
        selected={startDate}
        onChange={(date: any) => setStartDate(date)}
        showTimeSelect
        dateFormat="MMMM d, yyyy h:mm aa"
        includeDates={availableDates}
        maxTime={maxTime}
        minTime={minTime}
      />
    </DateTimePickerWrapper>
  );
};

export default DateTimePicker;

const Bar = styled.div`
  width: 1px;
  height: calc(18px);
  background: #494b4f;
  margin-left: 8px;
`;

const TimeIcon = styled.img`
  width: 16px;
  height: 16px;
  z-index: 999;
`;

const Div = styled.div`
  display: block;
`;

const DateTimePickerWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 42px;
  margin-left: 2px;
`;

const StyledDatePicker = styled(DatePicker)`
  border: 0;
  width: calc(100% + 42px);
  position: relative;
  border: none;
  outline-width: 0;
  background: transparent;
  text-align: center;
  padding: 0 15px;
  font-size: 13px;
`;
