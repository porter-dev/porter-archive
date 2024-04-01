import React from "react";
import { SourceOptions } from "lib/porter-apps";

import { PopulatedEnvGroup } from "./types";
import EnvVariables from "./EnvVariables";
import EnvGroups from "./EnvGroups";
import { AppRevision } from "lib/revisions/types";
import Spacer from "components/porter/Spacer";

type Props = {
  appName?: string;
  revision?: AppRevision;
  baseEnvGroups?: PopulatedEnvGroup[];
  latestSource?: SourceOptions;
  attachedEnvGroups?: PopulatedEnvGroup[];
};

const EnvSettings: React.FC<Props> = (props) => {
  return (
    <>
      <Spacer y={1} />
      <EnvVariables syncedEnvGroups={props.attachedEnvGroups}/>
      <Spacer y={1} />
      <EnvGroups {...props} attachedEnvGroups={props.attachedEnvGroups} />
    </>
  );
};

export default EnvSettings;
