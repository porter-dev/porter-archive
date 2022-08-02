import { get } from "lodash";
import React from "react";
import styled from "styled-components";
import { UrlLinkField } from "../types";
import { hasSetValue } from "../utils";

const populate = (str: string, obj: unknown) => {
  return str.replace(/{[^{}]*}+/g, (match) => {
    const key = match.replace("{", "").replace("}", "");
    let value;
    if (key[0] === ".") {
      value = get(obj, key.substring(1));
    } else {
      value = get(obj, key);
    }

    if (typeof value !== "string") {
      return "Couldn't find value " + key;
    }

    return value;
  });
};

const UrlLink = (props: UrlLinkField) => {
  const { value, label, injectedProps } = props;

  if (!hasSetValue(props)) {
    return null;
  }

  let val = value;

  if (Array.isArray(value)) {
    val = value[0];
  }

  if (typeof val !== "string") {
    return null;
  }

  if (!injectedProps?.chart) {
    return null;
  }

  const populatedUrl = populate(val, injectedProps.chart);

  return (
    <>
      <Label>{label}</Label>
      <StyledServiceRow>
        <a href={populatedUrl} target="_blank">
          <i className="material-icons-outlined">link</i>
          {populatedUrl}
        </a>
      </StyledServiceRow>
    </>
  );
};

export default UrlLink;

const StyledServiceRow = styled.div`
  width: 100%;
  height: 40px;
  background: #ffffff11;
  margin-bottom: 15px;
  border-radius: 5px;
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  > a {
    margin-left: 2px;
    font-size: 13px;
    user-select: text;
    display: flex;
    -webkit-box-align: center;
    align-items: center;
    > i {
      font-size: 15px;
      margin-right: 10px;
    }
  }
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;
