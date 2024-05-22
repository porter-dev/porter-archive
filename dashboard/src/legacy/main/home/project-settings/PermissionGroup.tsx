import React, { useState } from "react";
import role from "legacy/assets/role.svg";
import styled from "styled-components";

import RoleModal from "./RoleModal";

type PermissionGroupProps = {
  name: string;
  permissions?: any;
};

const PermissionGroup: React.FC<PermissionGroupProps> = ({
  name,
  permissions,
}) => {
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
          permissions={permissions}
          readOnly={true}
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
