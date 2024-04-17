import React from "react";
import { match } from "ts-pattern";

import { type ClientAddon } from "lib/addons";

import DatadogForm from "../forms/DatadogForm";
import MetabaseForm from "../forms/MetabaseForm";
import MezmoForm from "../forms/MezmoForm";
import NewRelicForm from "../forms/NewRelicForm";

type Props = {
  type: ClientAddon["config"]["type"];
};
const Configuration: React.FC<Props> = ({ type }) => {
  return match(type)
    .returnType<JSX.Element | null>()
    .with("datadog", () => <DatadogForm />)
    .with("mezmo", () => <MezmoForm />)
    .with("metabase", () => <MetabaseForm />)
    .with("newrelic", () => <NewRelicForm />)
    .otherwise(() => null);
};

export default Configuration;
