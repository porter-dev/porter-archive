import React, { useContext, useState } from "react";
import styled from "styled-components";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import { Context } from "shared/Context";
import api from "shared/api";

const ClusterSettings: React.FC = () => {
  const context = useContext(Context);
  const [newClusterName, setNewClusterName] = useState<string>(
    context.currentCluster.name
  );
  const [successfulRename, setSuccessfulRename] = useState<boolean>(false);

  const [accessKeyId, setAccessKeyId] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [startRotateCreds, setStartRotateCreds] = useState<boolean>(false);
  const [successfulRotate, setSuccessfulRotate] = useState<boolean>(false);

  let rotateCredentials = () => {
    api
      .overwriteAWSIntegration(
        "<token>",
        {
          aws_integration_id: context.currentCluster.aws_integration_id,
          aws_access_key_id: accessKeyId,
          aws_secret_access_key: secretKey,
          cluster_id: context.currentCluster.id,
        },
        {
          project_id: context.currentProject.id,
        }
      )
      .then(({ data }) => {
        setSuccessfulRotate(true);
      })
      .catch(() => {
        setSuccessfulRotate(false);
      });
  };

  let updateClusterName = () => {
    api
      .updateClusterName(
        "<token>",
        {
          name: newClusterName,
        },
        {
          project_id: context.currentProject.id,
          cluster_id: context.currentCluster.id,
        }
      )
      .then(({ data }) => {
        setSuccessfulRename(true);
      })
      .catch(() => {
        setSuccessfulRename(false);
      });
  };

  let helperText = (
    <Helper>
      Delete this cluster and underlying infrastructure. To ensure that
      everything has been properly destroyed, please visit your cloud provider's
      console. Instructions to properly delete all resources can be found
      <a
        target="none"
        href="https://docs.getporter.dev/docs/deleting-dangling-resources"
      >
        {" "}
        here
      </a>
      .
    </Helper>
  );

  if (!context.currentCluster?.infra_id || !context.currentCluster?.service) {
    helperText = (
      <Helper>
        Remove this cluster from Porter. Since this cluster was not provisioned
        by Porter, deleting the cluster will only detach this cluster from your
        project. To delete the cluster itself, you must do so manually. This
        operation cannot be undone.
      </Helper>
    );
  }

  let keyRotationSection = null;

  if (
    context.currentCluster?.aws_integration_id &&
    context.currentCluster?.aws_integration_id != 0
  ) {
    if (successfulRotate) {
      keyRotationSection = (
        <div>
          <Heading>Credential Rotation</Heading>
          <Helper>Successfully rotated credentials!</Helper>
        </div>
      );
    } else if (startRotateCreds) {
      keyRotationSection = (
        <div>
          <Heading>Credential Rotation</Heading>
          <Helper>Input the new credentials for the EKS cluster.</Helper>
          <InputRow
            type="text"
            value={accessKeyId}
            setValue={(x: string) => setAccessKeyId(x)}
            label="👤 AWS Access ID"
            placeholder="ex: AKIAIOSFODNN7EXAMPLE"
            width="100%"
            isRequired={true}
          />
          <InputRow
            type="password"
            value={secretKey}
            setValue={(x: string) => setSecretKey(x)}
            label="🔒 AWS Secret Key"
            placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
            width="100%"
            isRequired={true}
          />
          <Button color="#616FEEcc" onClick={rotateCredentials}>
            Submit
          </Button>
        </div>
      );
    } else {
      keyRotationSection = (
        <div>
          <Heading>Credential Rotation</Heading>
          <Helper>
            Rotate the credentials that Porter uses to connect to the cluster.
          </Helper>
          <Button color="#616FEEcc" onClick={() => setStartRotateCreds(true)}>
            Rotate Credentials
          </Button>
        </div>
      );
    }
  }

  let renameClusterSection = (
    <div>
      <Heading>Rename Cluster</Heading>
      <InputRow
        type="text"
        value={newClusterName}
        setValue={(x: string) => setNewClusterName(x)}
        label="Cluster Name"
        placeholder="ex: my-awesome-cluster"
        width="100%"
        isRequired={true}
      />
      <Button color="#616FEEcc" onClick={updateClusterName}>
        Submit
      </Button>
    </div>
  );

  if (successfulRename) {
    renameClusterSection = (
      <div>
        <Heading>Credential Rotation</Heading>
        <Helper>Successfully renamed the cluster! Reload the page.</Helper>
      </div>
    );
  }

  return (
    <div>
      <StyledSettingsSection>
        {keyRotationSection}
        <DarkMatter />
        {renameClusterSection}
        <DarkMatter />
        <Heading>Delete Cluster</Heading>
        {helperText}
        <Button
          color="#b91133"
          onClick={() => context.setCurrentModal("UpdateClusterModal")}
        >
          Delete Cluster
        </Button>
      </StyledSettingsSection>
    </div>
  );
};

export default ClusterSettings;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -15px;
`;

const StyledSettingsSection = styled.div`
  margin-top: 35px;
  width: 100%;
  background: #ffffff11;
  padding: 0 35px;
  padding-bottom: 15px;
  position: relative;
  border-radius: 8px;
  overflow: auto;
  height: 100%;
`;

const Button = styled.button`
  height: 35px;
  font-size: 13px;
  margin-top: 6px;
  margin-bottom: 30px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  box-shadow: ${(props) =>
    !props.disabled ? "0 2px 5px 0 #00000030" : "none"};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
`;

const Warning = styled.div`
  font-size: 13px;
  color: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
  margin-bottom: 20px;
`;
