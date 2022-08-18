import React, { createContext, useContext, useEffect, useState } from "react";
import api from "shared/api";
import { CreateRoleBody, Role, RoleList, UpdateRoleBody } from "./types";

import { Context as GlobalContext } from "shared/Context";

export const RolesAdminContext = createContext({
  loading: false,
  error: null,

  setLoading: (loading: boolean) => {},
  setError: (error: string) => {},
  clearError: () => {},

  currentRole: {} as Role,
  setCurrentRole: (role: Role) => {},
  clearCurrentRole: () => {},
});

export const RolesAdminProvider: React.FC = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>(null);
  const [currentRole, setCurrentRole] = useState<Role>(null);
  const [defaultHierarchyTree, setDefaultHierarchyTree] = useState(null);

  const clearError = () => {
    setError(null);
  };

  const clearCurrentRole = () => {
    setCurrentRole(null);
  };

  const { currentProject } = useContext(GlobalContext);

  useEffect(() => {
    let isSubscribed = true;

    api
      .getScopeHierarchy(
        "<token>",
        {},
        {
          project_id: currentProject.id,
        }
      )
      .then((res) => {
        if (!isSubscribed) {
          return;
        }

        setDefaultHierarchyTree(res.data);
      });
  }, [currentProject?.id]);

  return (
    <RolesAdminContext.Provider
      value={{
        loading,
        error,
        setLoading,
        setError,
        clearError,
        currentRole,
        setCurrentRole,
        clearCurrentRole,
      }}
    >
      {children}
    </RolesAdminContext.Provider>
  );
};

export const useRoleList = () => {
  const { currentProject } = useContext(GlobalContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>(null);
  const [roles, setRoles] = useState<RoleList>([]);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.listRoles<RoleList>(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
        }
      );
      setRoles(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return {
    refetch,
    isLoading,
    error,
    roles,
  };
};

export const useCreateRole = () => {
  const { currentProject } = useContext(GlobalContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = async (body: CreateRoleBody) => {
    setIsLoading(true);
    try {
      const { data } = await api.createRole<Role>(
        "<token>",
        {
          ...body,
        },
        {
          project_id: currentProject.id,
        }
      );
      return data;
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate,
    loading: isLoading,
    error,
  };
};

export const useUpdateRole = () => {
  const { currentProject } = useContext(GlobalContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = async (body: UpdateRoleBody) => {
    setIsLoading(true);
    try {
      const { data } = await api.updateRole<Role>(
        "<token>",
        {
          ...body,
        },
        {
          project_id: currentProject.id,
          role_id: body.id,
        }
      );
      return data;
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate,
    loading: isLoading,
    error,
  };
};

export const useDeleteRole = () => {
  const { currentProject } = useContext(GlobalContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = async (role_id: Role["id"]) => {
    setIsLoading(true);
    try {
      await api.deleteRole(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          role_id,
        }
      );
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate,
    loading: isLoading,
    error,
  };
};
