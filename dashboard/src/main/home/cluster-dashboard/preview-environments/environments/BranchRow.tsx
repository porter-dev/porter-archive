import React from "react";
import styled from "styled-components";
import { EllipsisTextWrapper } from "../components/styled";
import pr_icon from "assets/pull_request_icon.svg";

interface Props {
  branch: string;
  onClick: () => void;
  isLast?: boolean;
  isSelected?: boolean;
}

const BranchRow = ({ branch, onClick, isLast, isSelected }: Props) => {
  return (
    <Row onClick={onClick} isLast={isLast} isSelected={isSelected}>
      <BranchName>
        <BranchIcon src={pr_icon} alt="branch icon" />
        <EllipsisTextWrapper tooltipText={branch}>{branch}</EllipsisTextWrapper>
      </BranchName>
    </Row>
  );
};

export default BranchRow;

const Row = styled.div<{ isLast?: boolean; isSelected?: boolean }>`
  width: 100%;
  padding: 15px;
  cursor: pointer;
  background: ${(props) => (props.isSelected ? "#ffffff11" : "#26292e")};
  border-bottom: ${(props) => (props.isLast ? "" : "1px solid #494b4f")};
  :hover {
    background: #ffffff11;
  }
`;

const BranchName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  font-size: 14px;
  align-items: center;
  margin-bottom: 10px;
`;

const BranchIcon = styled.img`
  font-size: 20px;
  height: 16px;
  margin-right: 10px;
  color: #aaaabb;
  opacity: 50%;
`;
