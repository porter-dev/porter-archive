import React from "react";

import { fireEvent, render, screen } from "../test-utils";

import "@testing-library/jest-dom";

import { NewProjectFC } from "../main/home/new-project/NewProject";

/**
 * @jest-environment jsdom
 */
test("create new project with no name", async () => {
  render(<NewProjectFC />);
  fireEvent.click(screen.getByText("Create project"));
  await screen.findByText(/^the name cannot be empty/i);
});

/**
 * @jest-environment jsdom
 */
test("create new project", async () => {
  render(<NewProjectFC />);
  const input = screen.getByPlaceholderText("ex: perspective-vortex");
  fireEvent.change(input, { target: { value: "hello-world-project" } });
  fireEvent.click(screen.getByText("Create project"));
  await screen.findByText(/^creating project/i);
});
