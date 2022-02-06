import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import SaveButton from "components/SaveButton";
import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "shared/api";
import useAuth from "shared/auth/useAuth";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import DashboardHeader from "../DashboardHeader";
import {
  DATABASE_INSTANCE_TYPES,
  DEFAULT_DATABASE_INSTANCE_TYPE,
  FORM_DEFAULT_VALUES,
  LAST_POSTGRES_ENGINE_VERSION,
  POSTGRES_DB_FAMILIES,
  POSTGRES_ENGINE_VERSIONS,
  DEFAULT_DB_FAMILY,
} from "./static_data";

type ValidationError = {
  hasError: boolean;
  description?: string;
};

const CreateDatabaseForm = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const [databaseName, setDatabaseName] = useState(
    () => `${currentProject.name}-database`
  );
  const [masterUser, setMasterUser] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [dbFamily, setDbFamily] = useState(DEFAULT_DB_FAMILY);
  const [engineVersion, setEngineVersion] = useState(
    LAST_POSTGRES_ENGINE_VERSION
  );
  const [instanceType, setInstanceType] = useState(
    DEFAULT_DATABASE_INSTANCE_TYPE
  );
  const [submitStatus, setSubmitStatus] = useState("");
  const [availableNamespaces, setAvailableNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState("default");
  const [isAuthorized] = useAuth();

  const { pushFiltered } = useRouting();

  const validateForm = (): ValidationError => {
    if (!databaseName.length) {
      return {
        hasError: true,
        description: "Database name cannot be empty",
      };
    }

    if (!masterUser.length) {
      return {
        hasError: true,
        description: "Master user cannot be empty",
      };
    }

    if (!masterPassword.length) {
      return {
        hasError: true,
        description: "Master password cannot be empty",
      };
    }

    return {
      hasError: false,
    };
  };

  const handleSubmit = async () => {
    const validation = validateForm();
    if (validation.hasError) {
      setSubmitStatus(validation.description);
      return;
    }

    try {
      await api.provisionDatabase(
        "<token>",
        {
          ...FORM_DEFAULT_VALUES,
          db_family: dbFamily,
          db_name: databaseName,
          username: masterUser,
          password: masterPassword,
          db_engine_version: engineVersion,
          machine_type: instanceType,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: selectedNamespace,
        }
      );
      setSubmitStatus("successful");
      pushFiltered("/databases", []);
    } catch (error) {
      console.error(error);
      setSubmitStatus("We couldn't process your request, please try again.");
    }
  };

  const updateNamespaces = async () => {
    try {
      const res = await api.getNamespaces(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
      if (res.data) {
        const availableNamespaces = res.data.items.filter((namespace: any) => {
          return namespace.status.phase !== "Terminating";
        });
        const namespaceOptions: {
          label: string;
          value: string;
        }[] = availableNamespaces.map((x: { metadata: { name: string } }) => {
          return { label: x.metadata.name, value: x.metadata.name };
        });

        if (availableNamespaces.length > 0) {
          setAvailableNamespaces(namespaceOptions);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    updateNamespaces();
  }, []);

  useEffect(() => {
    setEngineVersion(
      POSTGRES_ENGINE_VERSIONS[dbFamily][
        POSTGRES_ENGINE_VERSIONS[dbFamily].length - 1
      ].value
    );
  }, [dbFamily]);

  return (
    <>
      <DashboardHeader
        image="storage"
        title="New database"
        materialIconClass="material-icons-outlined"
      />
      <ControlRow>
        <BackButton to="/databases">
          <i className="material-icons">close</i>
        </BackButton>
      </ControlRow>

      <FormWrapper>
        <SelectRow
          label="Namespace"
          selectorProps={{
            refreshOptions: () => {
              updateNamespaces();
            },
            addButton: isAuthorized("namespace", "", ["get", "create"]),
            dropdownWidth: "335px",
            closeOverlay: true,
          }}
          value={selectedNamespace}
          setActiveValue={setSelectedNamespace}
          options={availableNamespaces}
          width="100%"
        />
        <InputRow
          type="string"
          label="Database name"
          isRequired
          value={databaseName}
          setValue={(value: string) => {
            setDatabaseName(value);
          }}
          width="100%"
        />
        <InputRow
          type="string"
          label="Master user"
          isRequired
          value={masterUser}
          setValue={(value: string) => {
            setMasterUser(value);
          }}
          width="100%"
        />
        <InputRow
          type="password"
          label="Master password"
          isRequired
          value={masterPassword}
          setValue={(value: string) => {
            setMasterPassword(value);
          }}
          width="100%"
        />
        <SelectRow
          label="DB Family"
          options={POSTGRES_DB_FAMILIES}
          setActiveValue={(value) => {
            setDbFamily(value);
          }}
          value={dbFamily}
          width="100%"
        />
        <SelectRow
          label="Engine version"
          options={POSTGRES_ENGINE_VERSIONS[dbFamily]}
          setActiveValue={(value) => {
            setEngineVersion(value);
          }}
          value={engineVersion}
          width="100%"
        />
        <SelectRow
          label="Instance type"
          options={DATABASE_INSTANCE_TYPES}
          setActiveValue={(value) => {
            setInstanceType(value);
          }}
          value={instanceType}
          width="100%"
        />
        <Helper>
          Please remember that this feature is still on development, this means
          that if you update the values provided here from your AWS Console
          porter <b>WILL NOT</b> be able to track those changes. In case is
          mandatory to change anything please contact the Porter team.
        </Helper>

        <SubmitButton
          clearPosition
          text="Create database"
          onClick={() => {
            handleSubmit();
          }}
          statusPosition="right"
          status={submitStatus}
        />
      </FormWrapper>
    </>
  );
};

export default CreateDatabaseForm;

const BackButton = styled(Link)`
  display: flex;
  width: 37px;
  z-index: 1;
  cursor: pointer;
  height: 37px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;
  text-decoration: none;
  color: white;

  > i {
    font-size: 20px;
  }

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const FormWrapper = styled.div`
  max-width: 600px;
  margin: auto;
`;

const SubmitButton = styled(SaveButton)`
  margin-top: 20px;
`;
