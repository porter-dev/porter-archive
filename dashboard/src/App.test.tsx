import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

describe("Our application", () => {
  test("Renders without crashing", () => {
    expect(() => render(<App />)).not.toThrow();
  })
})
