import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import SearchSelector from "components/SearchSelector";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import {
  populatePolicy,
  VIEWER_POLICY_MOCK,
} from "shared/auth/authorization-helpers";
import { PolicyDocType } from "shared/auth/types";
import { Context } from "shared/Context";
import styled from "styled-components";
import PolicyDocumentRenderer from "../components/PolicyDocumentRenderer";
import { Navigate } from "../RolesAdmin";
import { RolesAdminContext, useCreateRole } from "../Store";

type PartialUser = {
  user_id: number;
  email: string;
};

const CreateRole = ({ navigate }: { navigate: Navigate }) => {
  const { currentProject } = useContext(Context);
  const { mutate, loading, error } = useCreateRole();
  const [name, setName] = useState("");
  const [policyDocument, setPolicyDocument] = useState<PolicyDocType>(
    VIEWER_POLICY_MOCK
  );
  const [availableUsers, setAvailableUsers] = useState<PartialUser[]>([]);
  const [users, setUsers] = useState<PartialUser[]>([]);

  useEffect(() => {
    api
      .getCollaborators<PartialUser[]>(
        "<token>",
        {},
        { project_id: currentProject.id }
      )
      .then((res) => {
        setAvailableUsers(res.data);
      });
  }, [currentProject]);

  const filteredUsers = availableUsers.filter(
    (user) => !users.find((u) => u.user_id === user.user_id)
  );

  const handleSave = async () => {
    await mutate({
      name,
      policy: policyDocument,
      users: users.map((user) => user.user_id),
    });
    navigate("index");
  };

  return (
    <div style={{ paddingBottom: "300px" }}>
      <h1>CreateRole</h1>

      <button onClick={() => navigate("index")}>Back</button>

      <InputWrapper>
        <InputRow
          type="string"
          setValue={(val) => setName(val as string)}
          value={name}
          label="Name"
          width="100%"
        />
      </InputWrapper>

      <PolicyDocumentRenderer
        value={policyDocument}
        onChange={setPolicyDocument}
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
          <User key={user.user_id}>
            {user.email}
            {/* add Delete button */}
            <button
              onClick={() => {
                setUsers(users.filter((u) => u.user_id !== user.user_id));
              }}
            >
              X
            </button>
          </User>
        ))}
      </UserList>
      <SaveButton
        text="Save"
        onClick={handleSave}
        makeFlush
        clearPosition
        status={loading ? "loading" : ""}
      />
    </div>
  );
};

export default CreateRole;

const InputWrapper = styled.div`
  max-width: 300px;
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
`;

const User = styled.div`
  margin-bottom: 10px;
`;
