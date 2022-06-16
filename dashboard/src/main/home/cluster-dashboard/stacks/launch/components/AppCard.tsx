import React, { useContext } from "react";
import { StacksLaunchContext, StacksLaunchContextType } from "../Store";
import { ButtonWithIcon, Card } from "./styles";
import { hardcodedIcons } from "shared/hardcodedNameDict";

import styled from "styled-components";

export const AppCard = ({
  app,
}: {
  app: StacksLaunchContextType["newStack"]["app_resources"][0];
}) => {
  const { removeAppResource } = useContext(StacksLaunchContext);

  const handleDelete = () => {
    removeAppResource(app);
  };

  return (
    <UnclickableCard>
      <Flex>
        <Icon src={hardcodedIcons[app.template_name]} />
        {app.name}
      </Flex>
      <DeleteButton onClick={handleDelete}>
        <i className="material-icons-outlined">close</i>
      </DeleteButton>
    </UnclickableCard>
  );
};

const UnclickableCard = styled(Card)`
  cursor: default;
  :hover {
    border: 1px solid #ffffff0f;
  }
`;

const DeleteButton = styled(ButtonWithIcon)`
  margin-right: 5px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
`;

const Icon = styled.img`
  height: 30px;
  margin-right: 15px;
  margin-left: 5px;
`;
