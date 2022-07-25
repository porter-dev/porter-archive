import React from "react";
import styled from "styled-components";
import { UrlLinkField } from "../types";
import { hasSetValue } from "../utils";

const UrlLink = (props: UrlLinkField) => {
  const { value, label } = props;

  if (!hasSetValue(props)) {
    return null;
  }

  return (
    <>
      <Label>{label}</Label>
      <StyledServiceRow>
        <a href={value[0]} target="_blank">
          <i className="material-icons-outlined">link</i>
          {value[0]}
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
