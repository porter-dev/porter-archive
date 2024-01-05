import React, { useContext } from "react";
import { match } from "ts-pattern";

import { Context } from "shared/Context";

import {
  DATABASE_TYPE_AURORA,
  DATABASE_TYPE_ELASTICACHE,
  DATABASE_TYPE_RDS,
  type DatabaseTemplate,
} from "../types";
import AuroraPostgresForm from "./AuroraPostgresForm";
import ElasticacheRedisForm from "./ElasticacheRedisForm";
import RDSForm from "./RDSForm";

type Props = {
  template: DatabaseTemplate;
  onFormExit: () => void;
};
const DatabaseForm: React.FC<Props> = ({ template, onFormExit }) => {
  const { capabilities } = useContext(Context);

  return match(template)
    .with({ type: DATABASE_TYPE_RDS }, () => (
      <RDSForm
        currentTemplate={template}
        goBack={onFormExit}
        repoURL={capabilities?.default_addon_helm_repo_url}
      />
    ))
    .with({ type: DATABASE_TYPE_AURORA }, () => (
      <AuroraPostgresForm
        currentTemplate={template}
        goBack={onFormExit}
        repoURL={capabilities?.default_addon_helm_repo_url}
      />
    ))
    .with({ type: DATABASE_TYPE_ELASTICACHE }, () => (
      <ElasticacheRedisForm
        currentTemplate={template}
        goBack={onFormExit}
        repoURL={capabilities?.default_addon_helm_repo_url}
      />
    ))
    .exhaustive();
};

export default DatabaseForm;
