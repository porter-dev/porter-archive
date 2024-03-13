import React, { useState } from "react";
import styled from "styled-components";

import role from "assets/role.svg";

import RoleModal from "./RoleModal";

type PermissionGroupProps = {
  name: string;
};

const PermissionGroup: React.FC<PermissionGroupProps> = ({ name }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <StyledPermissionGroup
        onClick={() => {
          setShowModal(true);
        }}
      >
        {name}
      </StyledPermissionGroup>
      {showModal && (
        <RoleModal
          name={name}
          closeModal={() => {
            setShowModal(false);
          }}
        />
      )}
    </>
  );
};

export default PermissionGroup;

const StyledPermissionGroup = styled.div`
  display: inline-block;
  border-radius: 5px;
  margin-right: 10px;
  cursor: pointer;
  font-size: 13px;
  padding: 7px 10px;
  background: ${({ theme }) => theme.clickable.bg};
  border: 1px solid ${({ theme }) => theme.border};
  width: fit-content;
  margin-bottom: 15px;
`;
