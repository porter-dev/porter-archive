import React, { useContext } from "react";
import { RolesAdminContext, useRoleList } from "../Store";
import type { Navigate } from "../RolesAdmin";
import { isEmpty } from "lodash";
import { VIEWER_POLICY_MOCK } from "shared/auth/authorization-helpers";
import { Role } from "../types";

const ListRoles = ({ navigate }: { navigate: Navigate }) => {
  const { setCurrentRole } = useContext(RolesAdminContext);

  const { isLoading, roles, error, refetch } = useRoleList();

  const handleEdit = (role: Role) => {
    setCurrentRole(role);
    navigate("edit-role");
  };

  return (
    <div>
      <button onClick={() => navigate("create-role")}>Create Role</button>
      <h1>ListRoles</h1>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {roles.map((role) => (
            <li key={role.id}>
              {role.name}
              <button onClick={() => handleEdit(role as Role)}>Edit</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ListRoles;
