import React, { useContext, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";

import Launch from "./Launch";

type Props = {};

const LaunchWrapper: React.FC<Props> = (props) => {
  const { capabilities } = useContext(Context);
  return <>{capabilities && <Launch />}</>;
};

export default LaunchWrapper;

const StyledLaunchWrapper = styled.div``;
