import React from "react";

import DashboardPlaceholder from "./DashboardPlaceholder";
import ShowIntercomButton from "./ShowIntercomButton";
import Spacer from "./Spacer";
import Text from "./Text";

type Props = {
  title: string;
  subtitle: string;
  intercomText: string;
};

const RequestToEnable: React.FC<Props> = ({
  title,
  subtitle,
  intercomText,
}) => {
  return (
    <DashboardPlaceholder>
      <Text size={16}>{title}</Text>
      <Spacer y={0.5} />
      <Text color={"helper"}>{subtitle}</Text>
      <Spacer y={1} />
      <ShowIntercomButton alt message={intercomText} height="35px">
        Request to enable
      </ShowIntercomButton>
    </DashboardPlaceholder>
  );
};

export default RequestToEnable;
