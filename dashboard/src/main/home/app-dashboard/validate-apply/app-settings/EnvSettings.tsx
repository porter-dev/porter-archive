import React from "react";
import { SourceOptions } from "lib/porter-apps";

import { PopulatedEnvGroup } from "./types";
import EnvVariables from "./EnvVariables";
import EnvGroups from "./EnvGroups";
import { AppRevision } from "lib/revisions/types";

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
      <EnvVariables syncedEnvGroups={[]}/>
      <EnvGroups {...props} attachedEnvGroups={props.attachedEnvGroups} />
    </>
  );
};

export default EnvSettings;
