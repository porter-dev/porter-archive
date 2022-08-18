import SearchSelector from "components/SearchSelector";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { populatePolicy } from "shared/auth/authorization-helpers";
import { PolicyDocType } from "shared/auth/types";
import { Context } from "shared/Context";
import styled from "styled-components";
import PolicyDocumentRenderer from "../components/PolicyDocumentRenderer";
import { Navigate } from "../RolesAdmin";
import { RolesAdminContext, useUpdateRole } from "../Store";

type PartialUser = {
  id: number;
  email: string;
};

const EditRole = ({ navigate }: { navigate: Navigate }) => {
  const { currentProject } = useContext(Context);
  const { currentRole } = useContext(RolesAdminContext);
  const [policy, setPolicy] = useState<PolicyDocType>(() => {
    return currentRole.policy;
  });

  const [availableUsers, setAvailableUsers] = useState<PartialUser[]>([]);
  const [users, setUsers] = useState<PartialUser[]>([]);
  const { mutate, loading: saving, error: saveError } = useUpdateRole();

  useEffect(() => {
    api
      .getCollaborators<PartialUser[]>(
        "<token>",
        {},
        { project_id: currentProject.id }
      )
      .then((res) => {
        setAvailableUsers(
          res.data.filter((user) => !currentRole.users.includes(user.id))
        );
        setUsers(
          res.data.filter((user) => currentRole.users.includes(user.id))
        );
      });
  }, [currentProject]);

  const filteredUsers = availableUsers.filter(
    (user) => !users.find((u) => u.id === user.id)
  );

  const handleSave = () => {
    mutate({
      id: currentRole.id,
      name: currentRole.name,
      policy,
      users: currentRole.users,
    });

    navigate("index");
  };

  return (
    <div>
      EditRole <button onClick={() => navigate("index")}>Back</button>
      <h1>{currentRole.name}</h1>
      <PolicyDocumentRenderer
        value={policy}
        onChange={(policy) => {
          setPolicy(policy);
        }}
        readOnly={currentRole.id.includes(`${currentProject.id}-`)}
      />
      <SearchSelector
        options={filteredUsers}
        onSelect={(user) => {
          setUsers([...users, user]);
        }}
        label="Users"
        filterBy={(user) => user.email}
        getOptionLabel={(user) => user.email}
        placeholder="Search for users"
        noOptionsText="Seems like you selected all users available!"
      />
      <UserList>
        {users.map((user) => (
          <User key={user.id}>
            {user.email}
            {/* add Delete button */}
            <button
              onClick={() => {
                setUsers(users.filter((u) => u.id !== user.id));
              }}
            >
              X
            </button>
          </User>
        ))}
      </UserList>
      <button onClick={() => handleSave()}>Save</button>
    </div>
  );
};

export default EditRole;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
`;

const User = styled.div`
  margin-bottom: 10px;
`;
