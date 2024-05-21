import React, { useMemo, useState } from "react";
import trash from "legacy/assets/trash.png";
import Button from "legacy/components/porter/Button";
import { Error as ErrorComponent } from "legacy/components/porter/Error";
import Icon from "legacy/components/porter/Icon";
import Input from "legacy/components/porter/Input";
import Link from "legacy/components/porter/Link";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { getErrorMessageFromNetworkCall } from "legacy/lib/hooks/useCluster";
import { useDatastore } from "legacy/lib/hooks/useDatastore";
import styled from "styled-components";

import { type UpdateClusterButtonProps } from "main/home/infrastructure-dashboard/ClusterFormContextProvider";

import { useDatastoreContext } from "../DatabaseContextProvider";

const SettingsTab: React.FC = () => {
  const [showDeleteDatastoreModal, setShowDeleteDatastoreModal] =
    useState(false);

  const { datastore } = useDatastoreContext();

  return (
    <div>
      <StyledTemplateComponent>
        <Text size={16}>Delete &quot;{datastore.name}&quot;</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Delete this datastore and all of its resources.
        </Text>
        <Spacer y={0.5} />
        <Button
          color="#b91133"
          onClick={() => {
            setShowDeleteDatastoreModal(true);
          }}
        >
          <Icon src={trash} height={"15px"} />
          <Spacer inline x={0.5} />
          Delete {datastore.name}
        </Button>
      </StyledTemplateComponent>
      {showDeleteDatastoreModal && (
        <DeleteDatastoreModal
          onClose={() => {
            setShowDeleteDatastoreModal(false);
          }}
        />
      )}
    </div>
  );
};

export default SettingsTab;

type DeleteDatastoreModalProps = {
  onClose: () => void;
};

export const DeleteDatastoreModal: React.FC<DeleteDatastoreModalProps> = ({
  onClose,
}) => {
  const { datastore } = useDatastoreContext();
  const { deleteDatastore } = useDatastore();

  const [inputtedDatastoreName, setInputtedDatastoreName] =
    useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deleteDatastoreError, setDeleteDatastoreError] = useState<string>("");

  const confirmDeletion = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await deleteDatastore(datastore.name);
      onClose();
    } catch (err) {
      setDeleteDatastoreError(
        getErrorMessageFromNetworkCall(err, "Datastore deletion")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteButtonProps: UpdateClusterButtonProps = useMemo(() => {
    if (isSubmitting) {
      return {
        status: "loading",
        isDisabled: true,
      };
    }
    if (deleteDatastoreError) {
      return {
        status: (
          <ErrorComponent message={deleteDatastoreError} maxWidth="600px" />
        ),
        isDisabled: false,
      };
    }
    return {
      status: "",
      isDisabled: false,
    };
  }, [isSubmitting, deleteDatastoreError]);

  return (
    <Modal closeModal={onClose}>
      <Text size={16}>Delete {datastore.name}?</Text>
      <Spacer y={1} />
      {datastore.cloud_provider_credential_identifier !== "" && (
        <>
          <Text size={14} color="red">
            Attention:
          </Text>
          <Spacer y={0.1} />
          <Text>
            Destruction of resources sometimes results in dangling resources. To
            ensure that everything has been properly destroyed, please visit
            your cloud provider&apos;s console.
          </Text>
          <Spacer y={0.5} />
          <Link
            target="_blank"
            hasunderline
            to="https://docs.porter.run/other/deleting-dangling-resources"
          >
            Deletion instructions
          </Link>
          <Spacer y={1} />
        </>
      )}
      <Text color="helper">
        To confirm, enter the datastore name below. This action is irreversible.
      </Text>
      <Spacer y={0.5} />
      <Input
        placeholder={datastore.name}
        value={inputtedDatastoreName}
        setValue={setInputtedDatastoreName}
        width="100%"
        height="40px"
      />
      <Spacer y={1} />
      <Button
        color="#b91133"
        onClick={() => {
          void confirmDeletion();
        }}
        status={deleteButtonProps.status}
        disabled={
          deleteButtonProps.isDisabled ||
          inputtedDatastoreName !== datastore.name
        }
        loadingText={"Deleting..."}
      >
        Delete
      </Button>
    </Modal>
  );
};

const StyledTemplateComponent = styled.div`
  width: 100%;
  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
