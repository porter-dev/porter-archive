import React from "react";

import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Input from "components/porter/Input";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import role from "assets/role.svg";

import RoleModal from "./RoleModal";

type PermissionGroupProps = {
  foo?: boolean;
};

const PermissionGroup: React.FC<PermissionGroupProps> = ({ foo }) => {
  return (
    <>
      foo
      <RoleModal />
    </>
  );
};

export default PermissionGroup;
