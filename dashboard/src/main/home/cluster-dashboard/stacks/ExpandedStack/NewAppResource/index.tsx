import React from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import Settings from "./_Settings";
import TemplateSelector from "./_TemplateSelector";

const NewAppResourceRoutes = () => {
  const { url } = useRouteMatch();

  return (
    <Switch>
      <Route path={`${url}/template-selector`}>
        <TemplateSelector />
      </Route>
      <Route path={`${url}/settings/:template_name/:template_version`}>
        <Settings />
      </Route>
      <Route path="/">
        <Redirect to={`${url}/template-selector`} />
      </Route>
      <Route path="*">
        <Redirect to={url} />
      </Route>
    </Switch>
  );
};

export default NewAppResourceRoutes;
