import React, { useContext } from "react";
import { StacksLaunchContext, StacksLaunchContextType } from "../Store";
import { ButtonWithIcon, Card } from "./styles";

const DeleteButton = ButtonWithIcon;

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
    <Card>
      {app.name}
      <DeleteButton onClick={handleDelete}>
        <i className="material-icons-outlined">delete</i>
      </DeleteButton>
    </Card>
  );
};
