import React from "react";
import { render } from "@testing-library/react";
import InfoTooltip from "../InfoTooltip";

test("renders", () => {
  render(<InfoTooltip text="some text" />);
});
