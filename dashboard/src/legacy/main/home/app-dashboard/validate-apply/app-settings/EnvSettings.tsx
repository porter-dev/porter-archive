import React from "react";

import Spacer from "components/porter/Spacer";
import { type AppRevision } from "lib/revisions/types";

import EnvGroups from "./EnvGroups";
import EnvVariables from "./EnvVariables";
import { type PopulatedEnvGroup } from "./types";

type Props = {
  appName?: string;
  revision?: AppRevision;
  baseEnvGroups?: PopulatedEnvGroup[];
  attachedEnvGroups?: PopulatedEnvGroup[];
};

const EnvSettings: React.FC<Props> = (props) => {
  return (
    <>
      <Spacer y={1} />
      <EnvVariables syncedEnvGroups={props.attachedEnvGroups} />
      <Spacer y={1} />
      <EnvGroups {...props} attachedEnvGroups={props.attachedEnvGroups} />
    </>
  );
};

export default EnvSettings;
