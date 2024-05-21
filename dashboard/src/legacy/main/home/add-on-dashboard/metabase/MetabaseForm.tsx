import React, { useMemo, useState } from "react";
import copy from "legacy/assets/copy-left.svg";
import upload from "legacy/assets/upload.svg";
import CopyToClipboard from "legacy/components/CopyToClipboard";
import Loading from "legacy/components/Loading";
import Button from "legacy/components/porter/Button";
import Checkbox from "legacy/components/porter/Checkbox";
import CollapsibleContainer from "legacy/components/porter/CollapsibleContainer";
import Container from "legacy/components/porter/Container";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import Image from "legacy/components/porter/Image";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type ClientAddon } from "legacy/lib/addons";
import {
  datastoreValidator,
  type ClientDatastore,
} from "legacy/lib/databases/types";
import { useDatastoreList } from "legacy/lib/hooks/useDatabaseList";
import api from "legacy/shared/api";
import { Controller, useFormContext } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import { stringifiedDNSRecordType } from "utils/ip";

import { DATASTORE_ENGINE_POSTGRES } from "../../database-dashboard/constants";
import { DatastoreList } from "../../database-dashboard/DatabaseDashboard";
import { useClusterContext } from "../../infrastructure-dashboard/ClusterContextProvider";
import { useAddonFormContext } from "../AddonFormContextProvider";
import AddonSaveButton from "../AddonSaveButton";

const MetabaseForm: React.FC = () => {
  const { cluster } = useClusterContext();
  const {
    register,
    formState: { errors },
    control,
    watch,
  } = useFormContext<ClientAddon>();
  const watchExposedToExternalTraffic = watch(
    "config.exposedToExternalTraffic",
    false
  );
  return (
    <div>
      <Text size={16}>Metabase configuration</Text>
      <Spacer y={0.5} />
      <Controller
        name={"config.exposedToExternalTraffic"}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value}
            toggleChecked={() => {
              onChange(!value);
            }}
          >
            <Text>Expose to external traffic</Text>
          </Checkbox>
        )}
      />
      <CollapsibleContainer isOpened={watchExposedToExternalTraffic}>
        <Spacer y={0.5} />
        <Text>Custom domain</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Add an optional custom domain to access Metabase. If you do not
          provide a custom domain, Porter will provision a domain for you.
        </Text>
        {cluster.ingress_ip !== "" && (
          <>
            <Spacer y={0.5} />
            <div style={{ width: "100%" }}>
              <Text color="helper">
                To configure a custom domain, you must add{" "}
                {stringifiedDNSRecordType(cluster.ingress_ip)} pointing to the
                following Ingress IP for your cluster:{" "}
              </Text>
            </div>
            <Spacer y={0.5} />
            <IdContainer>
              <Code>{cluster.ingress_ip}</Code>
              <CopyContainer>
                <CopyToClipboard text={cluster.ingress_ip}>
                  <CopyIcon src={copy} alt="copy" />
                </CopyToClipboard>
              </CopyContainer>
            </IdContainer>
            <Spacer y={0.5} />
          </>
        )}
        <ControlledInput
          type="text"
          width="300px"
          {...register("config.customDomain")}
          placeholder="metabase.my-domain.com"
          error={errors.config?.customDomain?.message}
        />
      </CollapsibleContainer>

      <Spacer y={1} />
      <Text>Datastore connection info</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Specify the connection credentials for your datastore.
      </Text>
      <Spacer y={0.5} />
      <MetabaseDatastoreConnection />
      <Spacer y={1} />
      <AddonSaveButton />
    </div>
  );
};

const MetabaseDatastoreConnection: React.FC = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<ClientAddon>();
  const [showInjectCredentialsModal, setShowInjectCredentialsModal] =
    useState(false);
  const history = useHistory();
  return (
    <div>
      <table>
        <tr>
          <td>
            <Text>Host</Text>
          </td>
          <td>
            <ControlledInput
              type="text"
              width="600px"
              {...register("config.datastore.host")}
              placeholder="my-host.com"
              error={errors.config?.datastore?.host?.message}
            />
          </td>
        </tr>
        <tr>
          <td>
            <Text>Port</Text>
          </td>
          <td>
            <ControlledInput
              type="number"
              width="600px"
              {...register("config.datastore.port")}
              placeholder="5432"
              error={errors.config?.datastore?.port?.message}
            />
          </td>
        </tr>
        <tr>
          <td>
            <Text>Database name</Text>
          </td>
          <td>
            <ControlledInput
              type="text"
              width="600px"
              {...register("config.datastore.databaseName")}
              placeholder="postgres"
              error={errors.config?.datastore?.databaseName?.message}
            />
          </td>
        </tr>
        <tr>
          <td>
            <Text>Username</Text>
          </td>
          <td>
            <ControlledInput
              type="text"
              width="600px"
              {...register("config.datastore.username")}
              placeholder="my-username"
              error={errors.config?.datastore?.username?.message}
            />
          </td>
        </tr>
        <tr>
          <td>
            <Text>Password</Text>
          </td>
          <td>
            <ControlledInput
              type="password"
              width="600px"
              {...register("config.datastore.password")}
              placeholder="*****"
              error={errors.config?.datastore?.password?.message}
            />
          </td>
        </tr>
      </table>
      <Spacer y={0.5} />
      <Container row>
        <Button
          alt
          onClick={() => {
            setShowInjectCredentialsModal(true);
          }}
        >
          <Image src={upload} size={16} />
          <Spacer inline x={0.5} />
          Inject credentials from a Porter datastore
        </Button>
        <Spacer inline x={0.5} />
        <Button
          alt
          onClick={() => {
            history.push("/datastores/new");
          }}
        >
          <I className="material-icons">add</I>
          Create a new datastore
        </Button>
      </Container>
      {showInjectCredentialsModal && (
        <InjectDatastoreCredentialsModal
          onClose={() => {
            setShowInjectCredentialsModal(false);
          }}
        />
      )}
    </div>
  );
};

type ModalProps = {
  onClose: () => void;
};
const InjectDatastoreCredentialsModal: React.FC<ModalProps> = ({ onClose }) => {
  const [isInjectingCredentials, setIsInjectingCredentials] = useState(false);
  const { datastores } = useDatastoreList();
  const { projectId } = useAddonFormContext();
  const postgresDatastores = useMemo(() => {
    return datastores.filter(
      (d) => d.template.highLevelType === DATASTORE_ENGINE_POSTGRES
    );
  }, [datastores]);
  const { setValue } = useFormContext<ClientAddon>();

  const injectCredentials = async (
    datastore: ClientDatastore
  ): Promise<void> => {
    try {
      setIsInjectingCredentials(true);
      const response = await api.getDatastore(
        "<token>",
        {},
        {
          project_id: projectId,
          datastore_name: datastore.name,
        }
      );

      const results = await z
        .object({ datastore: datastoreValidator })
        .parseAsync(response.data);

      const credential = results.datastore.credential;
      setValue("config.datastore.host", credential.host);
      setValue("config.datastore.port", credential.port);
      setValue("config.datastore.databaseName", credential.database_name);
      setValue("config.datastore.username", credential.username);
      setValue("config.datastore.password", credential.password);
      onClose();
    } catch (err) {
      console.log(err);
    } finally {
      setIsInjectingCredentials(false);
    }
  };

  return (
    <Modal closeModal={onClose}>
      <InnerModalContents>
        <Container row>
          <Text>Inject credentials from a Porter Postgres datastore</Text>
          {isInjectingCredentials && (
            <>
              <Spacer inline x={0.5} />
              <Loading offset="0px" width="20px" height="20px" />
            </>
          )}
        </Container>
        <Spacer y={0.5} />
        {postgresDatastores.length === 0 ? (
          <Text color="helper">
            No postgres datastores were found. Please create a postgres
            datastore in the Datastores tab first.
          </Text>
        ) : (
          <>
            <Text color="helper">
              Select a datastore to inject its connection credentials into
              Metabase.
            </Text>
            <Spacer y={1} />
            <DatastoreList
              datastores={postgresDatastores}
              onClick={injectCredentials}
            />
          </>
        )}
      </InnerModalContents>
    </Modal>
  );
};

const InnerModalContents = styled.div`
  overflow-y: auto;
  max-height: 80vh;
`;

export default MetabaseForm;

const I = styled.i`
  font-size: 16px;
  margin-right: 7px;
`;

const Code = styled.span`
  font-family: monospace;
`;

const IdContainer = styled.div`
  background: #26292e;
  border-radius: 5px;
  padding: 10px;
  display: flex;
  width: 100%;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.border};
  align-items: center;
  user-select: text;
`;

const CopyContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;

const CopyIcon = styled.img`
  cursor: pointer;
  margin-left: 5px;
  margin-right: 5px;
  width: 15px;
  height: 15px;
  :hover {
    opacity: 0.8;
  }
`;
