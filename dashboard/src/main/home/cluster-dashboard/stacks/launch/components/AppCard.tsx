import React, { useContext } from "react";
import { StacksLaunchContext, StacksLaunchContextType } from "../Store";
import { ButtonWithIcon, Card, Flex, Icon } from "./styles";
import { hardcodedIcons } from "shared/hardcodedNameDict";

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
    <Card variant="unclickable">
      <Flex>
        <Icon src={hardcodedIcons[app.template_name]} />
        {app.name}
      </Flex>
      <ButtonWithIcon variant="delete" onClick={handleDelete}>
        <i className="material-icons-outlined">close</i>
      </ButtonWithIcon>
    </Card>
  );
};
