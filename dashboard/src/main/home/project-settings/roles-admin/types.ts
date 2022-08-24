import { PolicyDocType } from "shared/auth/types";

export type Role = {
  id: string; // role ID
  name: string; // role name
  users: number[]; // list of user IDs
  policy: PolicyDocType;
};

export type RoleList = Role[];

export type CreateRoleBody = Omit<Role, "id">;

export type UpdateRoleBody = Role;
