import React from "react";
import styled from "styled-components";

import Link from "components/porter/Link";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Step from "components/porter/Step";
import Text from "components/porter/Text";

import cloudformationStatus from "assets/cloud-formation-stack-complete.png";

type Props = {
  onClose: () => void;
};

const GrantAWSPermissionsHelpModal: React.FC<Props> = ({ onClose }) => {
  return (
    <Modal closeModal={onClose} width={"800px"}>
      <Text size={16}>Granting Porter access to AWS</Text>
      <Spacer y={1} />
      <Text color="helper">
        Porter needs access to your AWS account in order to create
        infrastructure. You can grant Porter access to AWS by following these
        steps:
      </Text>
      <Spacer y={1} />
      <Step number={1}>
        <Link
          to="https://aws.amazon.com/resources/create-account/"
          target="_blank"
        >
          Create an AWS account
        </Link>
        <Spacer inline width="5px" />
        if you do not already have one.
      </Step>
      <Spacer y={1} />
      <Step number={2}>
        Once you are logged in to your AWS account,
        <Spacer inline width="5px" />
        <Link
          to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
          target="_blank"
        >
          copy your account ID
        </Link>
        .
      </Step>
      <Spacer y={1} />
      <Step number={3}>
        Fill in your account ID on Porter and select &quot;Grant
        permissions&quot;.
      </Step>
      <Spacer y={1} />
      <Step number={4}>
        After being redirected to AWS CloudFormation, select &quot;Create
        stack&quot; on the bottom right.
      </Step>
      <Spacer y={1} />
      <Step number={5}>
        The stack will start to create. Refresh until the stack status has
        changed from &quot;CREATE_IN_PROGRESS&quot; to
        &quot;CREATE_COMPLETE&quot;:
      </Step>
      <Spacer y={1} />
      <ImageDiv>
        <img src={cloudformationStatus} height="250px" />
      </ImageDiv>
      <Spacer y={1} />
      <Step number={6}>Return to Porter and select &quot;Continue&quot;.</Step>
      <Spacer y={1} />
      <Step number={7}>
        If you continue to see issues,{" "}
        <a href="mailto:support@porter.run">email support.</a>
      </Step>
    </Modal>
  );
};

export default GrantAWSPermissionsHelpModal;

const ImageDiv = styled.div`
  text-align: center;
`;
