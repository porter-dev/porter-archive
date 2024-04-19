import React from "react";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

const TailscaleOverview: React.FC = () => {
  return (
    <div>
      <Text size={16}>Available services</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The services below can be reached through your Tailscale VPN by IP.
      </Text>
    </div>
  );
};

export default TailscaleOverview;
