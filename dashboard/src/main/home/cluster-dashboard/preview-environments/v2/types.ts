import { type PorterApp } from "@porter-dev/api-contracts";

export type ExistingTemplateWithEnv = {
  template: PorterApp;
  env: {
    variables: Record<string, string>;
    secret_variables: Record<string, string>;
  };
};
