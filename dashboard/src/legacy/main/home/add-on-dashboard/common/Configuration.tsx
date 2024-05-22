import React from "react";
import { type ClientAddon } from "legacy/lib/addons";
import { match } from "ts-pattern";

import DatadogForm from "../datadog/DatadogForm";
import MetabaseForm from "../metabase/MetabaseForm";
import MezmoForm from "../mezmo/MezmoForm";
import NewRelicForm from "../newrelic/NewRelicForm";
import QuivrForm from "../quivr/QuivrForm";
import TailscaleForm from "../tailscale/TailscaleForm";

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
    .with("tailscale", () => <TailscaleForm />)
    .with("quivr", () => <QuivrForm />)
    .otherwise(() => null);
};

export default Configuration;
