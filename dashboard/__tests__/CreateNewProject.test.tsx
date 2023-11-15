import React from 'react';
import { render, fireEvent, screen } from '../test-utils';
import '@testing-library/jest-dom';
import { NewProjectFC } from '../src/main/home/new-project/NewProject';

test('create new project with no name', async () => {
  render(<NewProjectFC />);
  fireEvent.click(screen.getByText('Create project'));
  await screen.findByText(/^the name cannot be empty/i);
});

// TODO: use MSW for the API call
test('create new project', async () => {
  render(<NewProjectFC />);
  const input = screen.getByPlaceholderText('ex: perspective-vortex');
  fireEvent.change(input, { target: { value: 'hello-world-project' } });
  fireEvent.click(screen.getByText('Create project'));
  await screen.findByText(/^creating project/i);
});