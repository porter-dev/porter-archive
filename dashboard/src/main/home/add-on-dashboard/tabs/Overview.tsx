import React from "react";
import { match } from "ts-pattern";

import { type ClientAddon } from "lib/addons";

import DatadogForm from "../DatadogForm";
import MetabaseForm from "../MetabaseForm";
import MezmoForm from "../MezmoForm";

type Props = {
  type: ClientAddon["config"]["type"];
};
const Configuration: React.FC<Props> = ({ type }) => {
  return match(type)
    .returnType<JSX.Element | null>()
    .with("datadog", () => <DatadogForm />)
    .with("mezmo", () => <MezmoForm />)
    .with("metabase", () => <MetabaseForm />)
    .otherwise(() => null);
};

export default Configuration;
