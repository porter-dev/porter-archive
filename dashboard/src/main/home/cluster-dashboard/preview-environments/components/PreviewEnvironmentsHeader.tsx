import React from "react";
import styled from "styled-components";
import DashboardHeader from "../../DashboardHeader";
import PullRequestIcon from "assets/pull_request_icon.svg";

export const PreviewEnvironmentsHeader = () => (
  <>
    <DashboardHeader
      image={PullRequestIcon}
      title="Preview Environments"
      description="Create full-stack preview environments for your pull requests."
    />
  </>
);
