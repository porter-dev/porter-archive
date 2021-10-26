import React, { useState } from "react";

import styled from "styled-components";

type Props = {};

export const Boilerplate: React.FC<Props> = (props) => {
  const [someState, setSomeState] = useState("");

  return <StyledBoilerplate></StyledBoilerplate>;
};

const StyledBoilerplate = styled.div``;
