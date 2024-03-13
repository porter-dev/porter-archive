import React from "react";

import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Input from "components/porter/Input";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import role from "assets/role.svg";

type RoleModalProps = {
  name: string;
  closeModal: () => void;
};

const RoleModal: React.FC<RoleModalProps> = ({ name, closeModal }) => {
  return (
    <Modal closeModal={closeModal} width={"800px"}>
      <Container row>
        <Image src={role} />
        <Spacer inline x={1} />
        <Text size={16}>Configure role</Text>
      </Container>
      <Spacer y={1} />
      <Input
        placeholder="ex: admin"
        width="300px"
        value={name}
        setValue={() => {}}
      />
      <Spacer y={1} />
    </Modal>
  );
};

export default RoleModal;
