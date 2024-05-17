import React from "react";
import styled from "styled-components";

type Props = {
  handleDelete: () => void;
};

const TrashDelete: React.FC<Props> = ({ handleDelete }) => {
  return (
    <ActionButton
      onClick={(e) => {
        e.stopPropagation();
        handleDelete();
      }}
      type={"button"}
    >
      <span className="material-icons">delete</span>
    </ActionButton>
  );
};

export default TrashDelete;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  :hover {
    color: white;
  }

  > span {
    font-size: 20px;
  }
  margin-right: 5px;
`;
