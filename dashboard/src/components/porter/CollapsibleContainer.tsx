import React, { ReactNode } from "react";

import { Collapse } from "react-collapse";
import './collapsible-container.css';

type Props = {
    isOpened: boolean;
    children: ReactNode;
};

const CollapsibleContainer: React.FC<Props> = ({
    isOpened,
    children,
}) => {

  return (
    <Collapse isOpened={isOpened}>
        {children}
    </Collapse>
  );
};

export default CollapsibleContainer;