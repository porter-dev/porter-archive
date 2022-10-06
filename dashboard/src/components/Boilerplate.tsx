import React, { useState } from "react";

import styled from "styled-components";

type Props = {};

const Boilerplate: React.FC<Props> = (props) => {
  const [someState, setSomeState] = useState("");

  return <StyledBoilerplate></StyledBoilerplate>;
};

export default Boilerplate;

const StyledBoilerplate = styled.div``;
