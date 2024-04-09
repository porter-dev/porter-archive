import React, { useMemo, useState } from "react";
import styled from "styled-components";

import Button from "components/porter/Button";
import { Error as ErrorComponent } from "components/porter/Error";
import Icon from "components/porter/Icon";
import Input from "components/porter/Input";
import Link from "components/porter/Link";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type UpdateClusterButtonProps } from "main/home/infrastructure-dashboard/ClusterFormContextProvider";
import { getErrorMessageFromNetworkCall } from "lib/hooks/useCluster";
import { useDatastore } from "lib/hooks/useDatastore";

import trash from "assets/trash.png";

import { useDatastoreContext } from "../DatabaseContextProvider";

const SettingsTab: React.FC = () => {
  const [showDeleteDatastoreModal, setShowDeleteDatastoreModal] =
    useState(false);

  const { datastore } = useDatastoreContext();
  const { deleteDatastore } = useDatastore();

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
          datastoreName={datastore.name}
          onClose={() => {
            setShowDeleteDatastoreModal(false);
          }}
          onSubmit={async () => {
            await deleteDatastore(datastore.name);
          }}
        />
      )}
    </div>
  );
};

export default SettingsTab;

type DeleteDatastoreModalProps = {
  datastoreName: string;
  onSubmit: () => Promise<void>;
  onClose: () => void;
};

const DeleteDatastoreModal: React.FC<DeleteDatastoreModalProps> = ({
  datastoreName,
  onSubmit,
  onClose,
}) => {
  const [inputtedDatastoreName, setInputtedDatastoreName] =
    useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deleteDatastoreError, setDeleteDatastoreError] = useState<string>("");

  const confirmDeletion = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await onSubmit();
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
      <Text size={16}>Delete {datastoreName}?</Text>
      <Spacer y={1} />

      <Text size={14} color="red">
        Attention:
      </Text>
      <Spacer y={0.1} />
      <Text>
        Destruction of resources sometimes results in dangling resources. To
        ensure that everything has been properly destroyed, please visit your
        cloud provider&apos;s console.
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
      <Text color="helper">
        To confirm, enter the datastore name below. This action is irreversible.
      </Text>
      <Spacer y={0.5} />
      <Input
        placeholder={datastoreName}
        value={inputtedDatastoreName}
        setValue={setInputtedDatastoreName}
        width="100%"
        height="40px"
      />
      <Spacer y={1} />
      <Button
        color="#b91133"
        onClick={async () => {
          await confirmDeletion();
        }}
        status={deleteButtonProps.status}
        disabled={
          deleteButtonProps.isDisabled ||
          inputtedDatastoreName !== datastoreName
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
