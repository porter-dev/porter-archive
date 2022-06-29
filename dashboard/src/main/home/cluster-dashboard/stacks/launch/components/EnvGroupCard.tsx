import React from "react";
import { hardcodedIcons } from "shared/hardcodedNameDict";
import { ButtonWithIcon, Card, Flex, Icon } from "./styles";

const EnvGroupCard = ({
  envGroup: { name },
}: {
  envGroup: { name: string };
}) => {
  const handleDelete = () => {
    console.error("NOT IMPLEMENTED");
  };

  return (
    <Card variant="unclickable">
      <Flex>
        <Icon src={""} />
        {name}
      </Flex>
      <ButtonWithIcon variant="delete" onClick={handleDelete}>
        <i className="material-icons-outlined">close</i>
      </ButtonWithIcon>
    </Card>
  );
};

export default EnvGroupCard;
